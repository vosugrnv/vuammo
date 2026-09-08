const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { query } = require("./db");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/vuammo/uploads";

function ensureUploadDir() {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (_) {}
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function mapProduct(row) {
  const data = row.data && typeof row.data === "object" ? row.data : {};
  return {
    id: Number(row.id) || row.id,
    slug: row.slug,
    name: row.name,
    price: Number(row.price_cents || 0),
    regular: row.regular_cents != null ? Number(row.regular_cents) : Number(row.price_cents || 0),
    image: row.image || "",
    rating: Number(data.rating || 4.9),
    cats: Array.isArray(row.cats) ? row.cats : [],
    inStock: true,
    seller: row.seller || "",
    stock: Number(data.stock || 100),
    sellerToken: row.seller_token || "",
    sellerSlug: row.seller_slug || slugify(row.seller || row.name),
    description: row.description || "",
    metaTitle: row.meta_title || "",
    metaDescription: row.meta_description || "",
    active: row.active !== false,
    source: "cms",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapShop(row) {
  const data = row.data && typeof row.data === "object" ? row.data : {};
  return {
    token: row.token,
    name: row.name,
    slug: row.slug || slugify(row.name),
    avatar: row.avatar_url || data.avatar || "",
    rating: Number(row.rating || 5),
    bio: row.bio || "",
    active: row.active !== false,
    source: "cms",
    joinedYear: data.joinedYear || new Date().getFullYear(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function uploadFile(req, res) {
  try {
    ensureUploadDir();
    const raw = String(req.body.data || "");
    const nameHint = String(req.body.filename || "upload.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
    const m = raw.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: "Thiếu data URL base64" });
    const mime = m[1];
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 6 * 1024 * 1024) {
      return res.status(400).json({ error: "File tối đa 6MB" });
    }
    const ext =
      mime.includes("png")
        ? ".png"
        : mime.includes("webp")
          ? ".webp"
          : mime.includes("gif")
            ? ".gif"
            : mime.includes("jpeg") || mime.includes("jpg")
              ? ".jpg"
              : path.extname(nameHint) || ".bin";
    const file = Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex") + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
    const url = "/uploads/" + file;
    return res.json({ ok: true, url, mime, size: buf.length });
  } catch (err) {
    console.error("uploadFile", err);
    return res.status(500).json({ error: "Upload thất bại" });
  }
}

async function listCmsProducts(_req, res) {
  const r = await query(`SELECT * FROM cms_products ORDER BY updated_at DESC LIMIT 2000`);
  return res.json({ products: r.rows.map(mapProduct) });
}

async function listPublicCatalog(_req, res) {
  const [p, s] = await Promise.all([
    query(`SELECT * FROM cms_products WHERE active = TRUE ORDER BY updated_at DESC LIMIT 2000`),
    query(`SELECT * FROM cms_shops WHERE active = TRUE ORDER BY updated_at DESC LIMIT 2000`)
  ]);
  return res.json({
    products: p.rows.map(mapProduct),
    shops: s.rows.map(mapShop)
  });
}

async function upsertCmsProduct(req, res) {
  try {
    const body = req.body || {};
    let id = String(body.id || req.params.id || "").trim();
    if (!id) id = String(900000 + Math.floor(Math.random() * 90000));
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Thiếu tên sản phẩm" });
    let slug = String(body.slug || "").trim() || slugify(name);
    const price = Math.round(Number(body.price || 0));
    const regular =
      body.regular != null && body.regular !== ""
        ? Math.round(Number(body.regular))
        : price;
    const image = String(body.image || "").trim();
    const seller = String(body.seller || "").trim();
    const sellerToken = String(body.sellerToken || body.seller_token || "").trim();
    const sellerSlug = String(body.sellerSlug || "").trim() || slugify(seller || name);
    const cats = Array.isArray(body.cats)
      ? body.cats.map(String)
      : String(body.catsText || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    const description = String(body.description || "").trim();
    const metaTitle = String(body.metaTitle || "").trim().slice(0, 70);
    const metaDescription = String(body.metaDescription || "").trim().slice(0, 170);
    const active = body.active != null ? Boolean(body.active) : true;
    const data = {
      rating: Number(body.rating || 4.9),
      stock: Number(body.stock || 100)
    };

    await query(
      `INSERT INTO cms_products
        (id, slug, name, price_cents, regular_cents, image, seller, seller_token, seller_slug,
         cats, description, meta_title, meta_description, active, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15::jsonb,NOW())
       ON CONFLICT (id) DO UPDATE SET
         slug = EXCLUDED.slug,
         name = EXCLUDED.name,
         price_cents = EXCLUDED.price_cents,
         regular_cents = EXCLUDED.regular_cents,
         image = EXCLUDED.image,
         seller = EXCLUDED.seller,
         seller_token = EXCLUDED.seller_token,
         seller_slug = EXCLUDED.seller_slug,
         cats = EXCLUDED.cats,
         description = EXCLUDED.description,
         meta_title = EXCLUDED.meta_title,
         meta_description = EXCLUDED.meta_description,
         active = EXCLUDED.active,
         data = EXCLUDED.data,
         updated_at = NOW()`,
      [
        id,
        slug,
        name,
        price,
        regular,
        image,
        seller,
        sellerToken,
        sellerSlug,
        JSON.stringify(cats),
        description,
        metaTitle,
        metaDescription,
        active,
        JSON.stringify(data)
      ]
    );
    const r = await query(`SELECT * FROM cms_products WHERE id = $1`, [id]);
    return res.json({ product: mapProduct(r.rows[0]) });
  } catch (err) {
    console.error(err);
    if (String(err.message || "").includes("unique")) {
      return res.status(409).json({ error: "Slug hoặc ID đã tồn tại" });
    }
    return res.status(500).json({ error: "Không lưu sản phẩm" });
  }
}

async function deleteCmsProduct(req, res) {
  await query(`DELETE FROM cms_products WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
}

async function listCmsShops(_req, res) {
  const r = await query(`SELECT * FROM cms_shops ORDER BY updated_at DESC LIMIT 2000`);
  return res.json({ shops: r.rows.map(mapShop) });
}

async function upsertCmsShop(req, res) {
  try {
    const body = req.body || {};
    let token = String(body.token || req.params.token || "").trim();
    if (!token) token = crypto.randomBytes(12).toString("hex");
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Thiếu tên gian hàng" });
    const slug = String(body.slug || "").trim() || slugify(name);
    const avatar = String(body.avatar || body.avatarUrl || "").trim();
    const bio = String(body.bio || "").trim();
    const rating = Number(body.rating || 5);
    const active = body.active != null ? Boolean(body.active) : true;
    const data = {
      joinedYear: Number(body.joinedYear || new Date().getFullYear()),
      metaTitle: String(body.metaTitle || "").trim(),
      metaDescription: String(body.metaDescription || "").trim()
    };
    await query(
      `INSERT INTO cms_shops
        (token, name, slug, avatar_url, rating, bio, active, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW())
       ON CONFLICT (token) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         avatar_url = EXCLUDED.avatar_url,
         rating = EXCLUDED.rating,
         bio = EXCLUDED.bio,
         active = EXCLUDED.active,
         data = EXCLUDED.data,
         updated_at = NOW()`,
      [token, name, slug, avatar, rating, bio, active, JSON.stringify(data)]
    );
    const r = await query(`SELECT * FROM cms_shops WHERE token = $1`, [token]);
    return res.json({ shop: mapShop(r.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không lưu gian hàng" });
  }
}

async function deleteCmsShop(req, res) {
  await query(`DELETE FROM cms_shops WHERE token = $1`, [req.params.token]);
  return res.json({ ok: true });
}

module.exports = {
  uploadFile,
  listPublicCatalog,
  listCmsProducts,
  upsertCmsProduct,
  deleteCmsProduct,
  listCmsShops,
  upsertCmsShop,
  deleteCmsShop,
  slugify
};
