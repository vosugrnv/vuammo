const crypto = require("crypto");
const config = require("./config");
const { query, withTransaction } = require("./db");
const stock = require("./stock");

const ORDER_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateOrderCode() {
  const bytes = crypto.randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i++) out += ORDER_CODE_ALPHABET[bytes[i] % 36];
  return out;
}

async function allocPublicCode(client) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateOrderCode();
    const exists = await client.query(
      `SELECT 1 FROM orders WHERE public_code = $1 LIMIT 1`,
      [code]
    );
    if (!exists.rowCount) return code;
  }
  throw Object.assign(new Error("Không tạo được mã đơn"), { status: 500 });
}

function normalizeItems(raw) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const items = [];
  let total = 0;
  for (const it of raw) {
    const name = String(it.name || it.title || "").trim();
    const qty = Math.max(1, Math.round(Number(it.qty || it.quantity || 1)));
    const price = Math.round(Number(it.price || it.priceCents || 0));
    const id = it.id != null ? String(it.id) : "";
    const image = it.image || "";
    if (!name || !Number.isFinite(price) || price <= 0) return null;
    if (!id) return null;
    total += price * qty;
    items.push({
      id,
      name,
      qty,
      price,
      image,
      seller: String(it.seller || "").trim(),
      sellerToken: String(it.sellerToken || it.seller_token || "").trim(),
      sellerSlug: String(it.sellerSlug || it.seller_slug || "").trim()
    });
  }
  return { items, total };
}

async function enrichItemsSeller(client, items) {
  const ids = [...new Set(items.map((i) => String(i.id)).filter(Boolean))];
  if (!ids.length) return items;
  const r = await client.query(
    `SELECT id, seller, seller_token, seller_slug, image FROM cms_products WHERE id = ANY($1::text[])`,
    [ids]
  );
  const map = new Map(r.rows.map((row) => [String(row.id), row]));
  return items.map((it) => {
    const p = map.get(String(it.id));
    if (!p) return it;
    return {
      ...it,
      seller: it.seller || p.seller || "",
      sellerToken: it.sellerToken || p.seller_token || "",
      sellerSlug: it.sellerSlug || p.seller_slug || "",
      image: it.image || p.image || ""
    };
  });
}

async function createOrder(req, res) {
  try {
    const cms = require("./cms");
    if (await cms.isUserBlacklisted(req.user.id)) {
      return res.status(403).json({
        error: "Tài khoản nằm trong blacklist. Liên hệ hỗ trợ Vua MMO để được mở lại."
      });
    }
    const parsed = normalizeItems(req.body.items);
    if (!parsed) {
      return res.status(400).json({ error: "Giỏ hàng không hợp lệ (thiếu id/tên/giá)" });
    }
    let { items } = parsed;
    let subtotal = parsed.total;
    let discount = 0;
    let promoCode = "";
    let promoId = null;
    const codeRaw = String(req.body.promoCode || req.body.promo || "").trim();
    if (codeRaw) {
      const applied = await cms.resolvePromo(codeRaw, subtotal, req.user.id);
      discount = applied.discountCents;
      promoCode = applied.promo.code;
      promoId = applied.promo.id;
    }
    const total = Math.max(0, subtotal - discount);
    const holdUntil = new Date(Date.now() + config.holdDays * 24 * 60 * 60 * 1000);

    const order = await withTransaction(async (client) => {
      items = await enrichItemsSeller(client, items);
      const u = await client.query(
        `SELECT id, balance_cents, email FROM users WHERE id = $1 FOR UPDATE`,
        [req.user.id]
      );
      const user = u.rows[0];
      if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      if (Number(user.balance_cents) < total) {
        const err = new Error("Số dư không đủ. Vui lòng nạp thêm tiền.");
        err.status = 402;
        err.balance = Number(user.balance_cents);
        err.need = total;
        throw err;
      }

      for (const it of items) {
        const c = await client.query(
          `SELECT COUNT(*)::int AS n FROM stock_items
           WHERE product_id = $1 AND status = 'available'`,
          [String(it.id)]
        );
        if ((c.rows[0]?.n || 0) < it.qty) {
          const err = new Error(
            `Tạm hết hàng: ${it.name} (mã #${it.id}). Còn ${c.rows[0]?.n || 0}/${it.qty}.`
          );
          err.status = 409;
          throw err;
        }
      }

      await client.query(
        `UPDATE users SET balance_cents = balance_cents - $1 WHERE id = $2`,
        [total, user.id]
      );

      const publicCode = await allocPublicCode(client);
      const o = await client.query(
        `INSERT INTO orders (buyer_id, items_json, total_cents, status, delivery_note, delivery_payload, hold_until, promo_code, discount_cents, subtotal_cents, public_code)
         VALUES ($1,$2,$3,'delivered',$4,'[]'::jsonb,$5,$6,$7,$8,$9)
         RETURNING id, public_code, total_cents, status, delivery_note, delivery_payload, hold_until, created_at, items_json, promo_code, discount_cents, subtotal_cents`,
        [
          user.id,
          JSON.stringify(items),
          total,
          "Đơn đã thanh toán. Đang lấy hàng từ kho…",
          holdUntil.toISOString(),
          promoCode || null,
          discount,
          subtotal,
          publicCode
        ]
      );

      const orderRow = o.rows[0];
      if (promoId) await cms.consumePromo(client, promoId, user.id, orderRow.id);
      const delivered = await stock.allocateForItems(client, orderRow.id, items);
      const noteLines = delivered
        .map((d) => d.name + " ×" + d.qty + ":\n" + d.lines.join("\n"))
        .join("\n\n");
      const fullNote =
        "Giao tự động từ kho Vua MMO.\n\n" +
        noteLines +
        (promoCode
          ? "\n\nĐã áp dụng mã " + promoCode + " (−" + discount.toLocaleString("vi-VN") + "₫)."
          : "") +
        "\n\nTiền được giữ bảo vệ đến " +
        holdUntil.toISOString().slice(0, 10) +
        ".";

      await client.query(
        `UPDATE orders
         SET delivery_payload = $1::jsonb,
             delivery_note = $2
         WHERE id = $3`,
        [JSON.stringify(delivered), fullNote, orderRow.id]
      );

      await client.query(
        `INSERT INTO wallet_ledger (user_id, type, amount_cents, ref_id, meta)
         VALUES ($1,'purchase',$2,$3,$4)`,
        [
          user.id,
          -total,
          orderRow.id,
          JSON.stringify({
            itemCount: items.length,
            autoDeliver: true,
            subtotal,
            discount,
            promoCode: promoCode || null
          })
        ]
      );

      orderRow.delivery_payload = delivered;
      orderRow.delivery_note = fullNote;
      return orderRow;
    });

    const bal = await query(`SELECT balance_cents FROM users WHERE id = $1`, [req.user.id]);
    return res.json({
      order: formatOrder(order),
      balance: Number(bal.rows[0].balance_cents)
    });
  } catch (err) {
    if (err.status === 402) {
      return res.status(402).json({
        error: err.message,
        balance: err.balance,
        need: err.need
      });
    }
    console.error("createOrder", err);
    return res.status(err.status || 500).json({ error: err.message || "Không tạo đơn được" });
  }
}

function formatOrder(row) {
  const items = row.items_json || [];
  const delivery = row.delivery_payload || [];
  const receivedLines = [];
  if (Array.isArray(delivery)) {
    delivery.forEach((b) => {
      (b.lines || []).forEach((line) => receivedLines.push(String(line)));
    });
  }
  const reviewRating = row.review_rating != null ? Number(row.review_rating) : null;
  const first = Array.isArray(items) && items[0] ? items[0] : {};
  const shopToken =
    String(first.sellerToken || first.seller_token || row.shop_token || "").trim();
  const shopName = String(first.seller || row.shop_name || "").trim();
  return {
    id: row.id,
    code: row.public_code || String(row.id).replace(/-/g, "").slice(0, 10).toUpperCase(),
    items,
    itemNames: (Array.isArray(items) ? items : [])
      .map((it) => (it.name || "") + (it.qty > 1 ? " ×" + it.qty : ""))
      .filter(Boolean)
      .join(", "),
    total: Number(row.total_cents),
    subtotal: row.subtotal_cents != null ? Number(row.subtotal_cents) : Number(row.total_cents),
    discount: Number(row.discount_cents || 0),
    promoCode: row.promo_code || "",
    status: row.status,
    deliveryNote: row.delivery_note,
    delivery,
    receivedPreview: receivedLines.slice(0, 3).join(" · ") || "",
    receivedLines,
    holdUntil: row.hold_until,
    createdAt: row.created_at,
    releasedAt: row.released_at || null,
    reviewed: reviewRating != null,
    reviewRating,
    reviewBody: row.review_body || "",
    reviewCreatedAt: row.review_created_at || null,
    disputeStatus: row.dispute_status || null,
    disputeReason: row.dispute_reason || "",
    shopToken,
    shopName: shopName || (shopToken ? "Shop" : "")
  };
}

async function listOrders(req, res) {
  const r = await query(
    `SELECT o.id, o.public_code, o.items_json, o.total_cents, o.status, o.delivery_note,
            o.delivery_payload, o.hold_until, o.created_at, o.released_at, o.promo_code,
            o.discount_cents, o.subtotal_cents,
            rv.rating AS review_rating,
            rv.body AS review_body,
            rv.created_at AS review_created_at,
            d.status AS dispute_status,
            d.reason AS dispute_reason,
            p.seller_token AS shop_token,
            p.seller AS shop_name
     FROM orders o
     LEFT JOIN order_reviews rv ON rv.order_id = o.id
     LEFT JOIN order_disputes d ON d.order_id = o.id
     LEFT JOIN cms_products p ON p.id = COALESCE(o.items_json->0->>'id', '')
     WHERE o.buyer_id = $1
     ORDER BY o.created_at DESC LIMIT 200`,
    [req.user.id]
  );
  return res.json({ orders: r.rows.map(formatOrder) });
}

async function getOrder(req, res) {
  const r = await query(
    `SELECT o.id, o.public_code, o.items_json, o.total_cents, o.status, o.delivery_note,
            o.delivery_payload, o.hold_until, o.created_at, o.released_at, o.promo_code,
            o.discount_cents, o.subtotal_cents,
            rv.rating AS review_rating,
            rv.body AS review_body,
            rv.created_at AS review_created_at,
            d.status AS dispute_status,
            d.reason AS dispute_reason,
            p.seller_token AS shop_token,
            p.seller AS shop_name
     FROM orders o
     LEFT JOIN order_reviews rv ON rv.order_id = o.id
     LEFT JOIN order_disputes d ON d.order_id = o.id
     LEFT JOIN cms_products p ON p.id = COALESCE(o.items_json->0->>'id', '')
     WHERE o.id = $1 AND o.buyer_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Không tìm thấy đơn" });
  const d = await query(
    `SELECT reason, status, created_at, withdrawn_at FROM order_disputes WHERE order_id = $1`,
    [req.params.id]
  );
  const rv = await query(
    `SELECT rating, body, created_at, product_id, product_name FROM order_reviews WHERE order_id = $1`,
    [req.params.id]
  );
  return res.json({
    order: formatOrder(r.rows[0]),
    dispute: d.rows[0]
      ? {
          reason: d.rows[0].reason,
          status: d.rows[0].status,
          createdAt: d.rows[0].created_at,
          withdrawnAt: d.rows[0].withdrawn_at
        }
      : null,
    review: rv.rows[0]
      ? {
          rating: Number(rv.rows[0].rating),
          body: rv.rows[0].body,
          createdAt: rv.rows[0].created_at,
          productId: rv.rows[0].product_id,
          productName: rv.rows[0].product_name
        }
      : null
  });
}

async function reviewOrder(req, res) {
  try {
    const rating = Math.round(Number(req.body.rating || 0));
    const body = String(req.body.body || req.body.comment || "").trim().slice(0, 2000);
    if (!(rating >= 1 && rating <= 5)) {
      return res.status(400).json({ error: "Chọn điểm từ 1 đến 5 sao" });
    }
    if (body.length < 10) {
      return res.status(400).json({ error: "Nội dung đánh giá cần ít nhất 10 ký tự (hữu ích cho người mua sau)" });
    }
    const r = await query(
      `SELECT id, status, items_json FROM orders WHERE id = $1 AND buyer_id = $2`,
      [req.params.id, req.user.id]
    );
    const order = r.rows[0];
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn" });
    if (["refunded"].includes(order.status)) {
      return res.status(400).json({ error: "Đơn đã hoàn tiền, không đánh giá được" });
    }
    if (!["paid", "delivered", "disputed", "released"].includes(order.status)) {
      return res.status(400).json({ error: "Đơn chưa đủ điều kiện đánh giá" });
    }
    const items = Array.isArray(order.items_json) ? order.items_json : [];
    const first = items[0] || {};
    const productId = String(req.body.productId || first.id || "").trim();
    const productName = String(req.body.productName || first.name || "Sản phẩm").trim().slice(0, 300);
    if (!productId) return res.status(400).json({ error: "Thiếu sản phẩm để đánh giá" });

    try {
      const ins = await query(
        `INSERT INTO order_reviews (order_id, user_id, product_id, product_name, rating, body)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, rating, body, created_at, product_id, product_name`,
        [order.id, req.user.id, productId, productName, rating, body]
      );
      return res.json({
        ok: true,
        review: {
          id: ins.rows[0].id,
          rating: Number(ins.rows[0].rating),
          body: ins.rows[0].body,
          createdAt: ins.rows[0].created_at,
          productId: ins.rows[0].product_id,
          productName: ins.rows[0].product_name
        }
      });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Bạn đã đánh giá đơn này rồi" });
      }
      throw err;
    }
  } catch (err) {
    console.error("reviewOrder", err);
    return res.status(500).json({ error: "Không gửi đánh giá được" });
  }
}

/** Public reviews for product page SEO (AggregateRating + Review). */
async function listProductReviews(req, res) {
  try {
    const productId = String(req.params.productId || "").trim();
    if (!productId) return res.status(400).json({ error: "Thiếu productId" });
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const agg = await query(
      `SELECT COUNT(*)::int AS n, COALESCE(AVG(rating),0)::float AS avg
       FROM order_reviews WHERE product_id = $1`,
      [productId]
    );
    const r = await query(
      `SELECT rv.rating, rv.body, rv.created_at, rv.product_name,
              COALESCE(NULLIF(u.name,''), split_part(u.email,'@',1)) AS author
       FROM order_reviews rv
       JOIN users u ON u.id = rv.user_id
       WHERE rv.product_id = $1
       ORDER BY rv.created_at DESC
       LIMIT $2`,
      [productId, limit]
    );
    return res.json({
      productId,
      count: agg.rows[0].n,
      average: Math.round(Number(agg.rows[0].avg) * 10) / 10,
      items: r.rows.map((row) => ({
        rating: Number(row.rating),
        body: row.body,
        author: row.author,
        productName: row.product_name,
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải đánh giá" });
  }
}

async function disputeOrder(req, res) {
  try {
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 5) {
      return res.status(400).json({ error: "Vui lòng mô tả lý do khiếu nại (≥ 5 ký tự)" });
    }
    const r = await query(
      `SELECT * FROM orders WHERE id = $1 AND buyer_id = $2`,
      [req.params.id, req.user.id]
    );
    const order = r.rows[0];
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn" });
    if (["released", "refunded"].includes(order.status)) {
      return res.status(400).json({ error: "Đơn đã kết thúc, không khiếu nại được" });
    }
    if (new Date(order.hold_until) < new Date() && order.status !== "disputed") {
      return res.status(400).json({ error: "Đã hết thời gian bảo vệ đơn" });
    }

    const existing = await query(
      `SELECT status FROM order_disputes WHERE order_id = $1`,
      [order.id]
    );
    const prev = existing.rows[0];
    if (prev && prev.status === "withdrawn") {
      return res.status(400).json({
        error: "Bạn đã gỡ khiếu nại trước đó — đơn này không thể khiếu nại lại."
      });
    }
    if (prev && ["resolved", "rejected"].includes(prev.status)) {
      return res.status(400).json({ error: "Khiếu nại đã được xử lý, không gửi lại được" });
    }
    if (prev && prev.status === "open") {
      return res.status(400).json({ error: "Đơn đang khiếu nại. Dùng Gỡ khiếu nại nếu muốn hủy." });
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO order_disputes (order_id, reason, status)
         VALUES ($1,$2,'open')
         ON CONFLICT (order_id) DO UPDATE
           SET reason = EXCLUDED.reason, status = 'open', withdrawn_at = NULL
           WHERE order_disputes.status NOT IN ('withdrawn','resolved','rejected')`,
        [order.id, reason]
      );
      await client.query(`UPDATE orders SET status = 'disputed' WHERE id = $1`, [order.id]);
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không gửi khiếu nại được" });
  }
}

async function withdrawDispute(req, res) {
  try {
    const r = await query(
      `SELECT o.*, d.status AS dispute_status, d.id AS dispute_id
       FROM orders o
       LEFT JOIN order_disputes d ON d.order_id = o.id
       WHERE o.id = $1 AND o.buyer_id = $2`,
      [req.params.id, req.user.id]
    );
    const order = r.rows[0];
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn" });
    if (order.dispute_status !== "open" || order.status !== "disputed") {
      return res.status(400).json({ error: "Không có khiếu nại đang mở để gỡ" });
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE order_disputes
         SET status = 'withdrawn', withdrawn_at = NOW()
         WHERE order_id = $1 AND status = 'open'`,
        [order.id]
      );
      // Quay về trạng thái bảo vệ (delivered) nếu còn hold; nếu hết hold → released
      const stillHold = order.hold_until && new Date(order.hold_until) > new Date();
      await client.query(
        `UPDATE orders SET status = $2, released_at = CASE WHEN $3 THEN released_at ELSE COALESCE(released_at, NOW()) END
         WHERE id = $1`,
        [order.id, stillHold ? "delivered" : "released", stillHold]
      );
    });

    return res.json({
      ok: true,
      message: "Đã gỡ khiếu nại. Đơn này không thể khiếu nại lại."
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không gỡ khiếu nại được" });
  }
}

async function listMyReviews(req, res) {
  try {
    const r = await query(
      `SELECT rv.id, rv.order_id, rv.product_id, rv.product_name, rv.rating, rv.body, rv.created_at,
              o.public_code
       FROM order_reviews rv
       JOIN orders o ON o.id = rv.order_id
       WHERE rv.user_id = $1
       ORDER BY rv.created_at DESC
       LIMIT 200`,
      [req.user.id]
    );
    return res.json({
      reviews: r.rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        orderCode: row.public_code || String(row.order_id).replace(/-/g, "").slice(0, 10).toUpperCase(),
        productId: row.product_id,
        productName: row.product_name,
        rating: Number(row.rating),
        body: row.body,
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải đánh giá" });
  }
}

async function releaseExpiredOrders() {
  const r = await query(
    `UPDATE orders
     SET status = 'released', released_at = NOW()
     WHERE status IN ('paid','delivered')
       AND hold_until <= NOW()
     RETURNING id`
  );
  if (r.rowCount) {
    console.log(`[escrow] released ${r.rowCount} orders`);
  }
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  disputeOrder,
  withdrawDispute,
  reviewOrder,
  listProductReviews,
  listMyReviews,
  releaseExpiredOrders
};
