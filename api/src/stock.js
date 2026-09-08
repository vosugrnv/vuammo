const config = require("./config");
const { query, withTransaction } = require("./db");

function parseLines(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function canManageStock(user) {
  const admins = String(process.env.STOCK_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.length) return true; // MVP: mọi user đăng nhập được nhập kho
  return admins.includes(String(user.email || "").toLowerCase());
}

async function countAvailable(productId) {
  const r = await query(
    `SELECT COUNT(*)::int AS n FROM stock_items
     WHERE product_id = $1 AND status = 'available'`,
    [String(productId)]
  );
  return r.rows[0]?.n || 0;
}

/** Public: tồn kho theo product / variant id */
async function getCounts(req, res) {
  try {
    const ids = String(req.query.ids || req.query.productId || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (!ids.length) return res.status(400).json({ error: "Thiếu product id" });
    const r = await query(
      `SELECT product_id, COUNT(*)::int AS available
       FROM stock_items
       WHERE product_id = ANY($1::text[]) AND status = 'available'
       GROUP BY product_id`,
      [ids]
    );
    const map = {};
    ids.forEach((id) => {
      map[id] = 0;
    });
    r.rows.forEach((row) => {
      map[row.product_id] = row.available;
    });
    return res.json({ counts: map });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không lấy tồn kho được" });
  }
}

/** Seller/admin: danh sách nhóm tồn kho */
async function listStock(req, res) {
  try {
    if (!canManageStock(req.user)) {
      return res.status(403).json({ error: "Không có quyền quản lý kho" });
    }
    const r = await query(
      `SELECT product_id,
              COUNT(*) FILTER (WHERE status = 'available')::int AS available,
              COUNT(*) FILTER (WHERE status = 'sold')::int AS sold,
              COUNT(*)::int AS total,
              MAX(created_at) AS last_added
       FROM stock_items
       GROUP BY product_id
       ORDER BY available DESC, product_id
       LIMIT 500`
    );
    return res.json({ products: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải kho được" });
  }
}

/** Seller/admin: nhập nhiều dòng hàng (mỗi dòng 1 đơn vị giao) */
async function importStock(req, res) {
  try {
    if (!canManageStock(req.user)) {
      return res.status(403).json({ error: "Không có quyền quản lý kho" });
    }
    const productId = String(req.body.productId || req.body.product_id || "").trim();
    const shopToken = String(req.body.shopToken || req.body.shop_token || "").trim();
    const lines = Array.isArray(req.body.lines)
      ? req.body.lines.map((l) => String(l).trim()).filter(Boolean)
      : parseLines(req.body.text || req.body.payload || "");
    if (!productId) return res.status(400).json({ error: "Thiếu mã sản phẩm / biến thể" });
    if (!lines.length) return res.status(400).json({ error: "Chưa có dòng hàng để nhập" });
    if (lines.length > 5000) {
      return res.status(400).json({ error: "Tối đa 5000 dòng mỗi lần nhập" });
    }

    const values = [];
    const params = [];
    let i = 1;
    for (const line of lines) {
      values.push(`($${i++},$${i++},$${i++},'available',$${i++})`);
      params.push(productId, shopToken, line, req.user.id);
    }
    await query(
      `INSERT INTO stock_items (product_id, shop_token, payload, status, created_by)
       VALUES ${values.join(",")}`,
      params
    );
    const available = await countAvailable(productId);
    return res.json({
      ok: true,
      added: lines.length,
      productId,
      available
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không nhập kho được" });
  }
}

/** Preview vài dòng còn (che bớt) — chỉ quản lý kho */
async function previewStock(req, res) {
  try {
    if (!canManageStock(req.user)) {
      return res.status(403).json({ error: "Không có quyền" });
    }
    const productId = String(req.params.productId || "").trim();
    const r = await query(
      `SELECT id, LEFT(payload, 24) AS preview, length(payload) AS len, created_at
       FROM stock_items
       WHERE product_id = $1 AND status = 'available'
       ORDER BY id ASC LIMIT 20`,
      [productId]
    );
    const available = await countAvailable(productId);
    return res.json({ productId, available, items: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không xem được" });
  }
}

/**
 * Allocate stock inside an open transaction client.
 * Returns delivery blocks [{ productId, name, qty, lines }]
 */
async function allocateForItems(client, orderId, items) {
  const delivered = [];
  for (const it of items) {
    const productId = String(it.id || "").trim();
    const qty = Math.max(1, Math.round(Number(it.qty || 1)));
    if (!productId) {
      const err = new Error("Thiếu mã sản phẩm trong giỏ");
      err.status = 400;
      throw err;
    }
    const pick = await client.query(
      `SELECT id, payload FROM stock_items
       WHERE product_id = $1 AND status = 'available'
       ORDER BY id ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      [productId, qty]
    );
    if (pick.rows.length < qty) {
      const err = new Error(
        `Hết hàng hoặc thiếu tồn kho cho mã #${productId} (cần ${qty}, còn ${pick.rows.length}). Vui lòng nhập kho trước.`
      );
      err.status = 409;
      throw err;
    }
    const ids = pick.rows.map((r) => r.id);
    await client.query(
      `UPDATE stock_items
       SET status = 'sold', order_id = $1, sold_at = NOW()
       WHERE id = ANY($2::bigint[])`,
      [orderId, ids]
    );
    delivered.push({
      productId,
      name: it.name || productId,
      qty,
      lines: pick.rows.map((r) => r.payload)
    });
  }
  return delivered;
}

module.exports = {
  getCounts,
  listStock,
  importStock,
  previewStock,
  allocateForItems,
  canManageStock,
  countAvailable
};
