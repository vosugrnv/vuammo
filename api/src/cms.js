const { query } = require("./db");

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/* ---- Blacklist ---- */
async function listBlacklist(req, res) {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const r = await query(
      `SELECT b.id, b.reason, b.admin_email, b.created_at,
              u.id AS user_id, u.email, u.name
       FROM user_blacklist b
       JOIN users u ON u.id = b.user_id
       WHERE ($1 = '' OR lower(u.email) LIKE '%'||$1||'%'
              OR lower(COALESCE(u.name,'')) LIKE '%'||$1||'%'
              OR CAST(u.id AS text) LIKE '%'||$1||'%')
       ORDER BY b.created_at DESC
       LIMIT 200`,
      [q]
    );
    const n = await query(`SELECT COUNT(*)::int AS n FROM user_blacklist`);
    return res.json({
      total: n.rows[0].n,
      items: r.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        name: row.name,
        reason: row.reason,
        adminEmail: row.admin_email,
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải blacklist" });
  }
}

async function addBlacklist(req, res) {
  try {
    const needle = String(req.body.query || req.body.email || req.body.userId || "").trim();
    const reason = String(req.body.reason || "").trim();
    if (!needle) return res.status(400).json({ error: "Nhập email / tên / user id" });
    if (!reason) return res.status(400).json({ error: "Lý do bắt buộc" });
    const u = await query(
      `SELECT id, email, name FROM users
       WHERE lower(email) = lower($1)
          OR CAST(id AS text) = $1
          OR lower(name) = lower($1)
       LIMIT 1`,
      [needle]
    );
    if (!u.rows[0]) return res.status(404).json({ error: "Không tìm thấy user" });
    await query(
      `INSERT INTO user_blacklist (user_id, reason, admin_email)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET
         reason = EXCLUDED.reason,
         admin_email = EXCLUDED.admin_email,
         created_at = NOW()`,
      [u.rows[0].id, reason.slice(0, 500), req.user?.email || ""]
    );
    return res.json({ ok: true, user: u.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không thêm blacklist" });
  }
}

async function removeBlacklist(req, res) {
  try {
    await query(`DELETE FROM user_blacklist WHERE id = $1`, [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không gỡ blacklist" });
  }
}

async function isUserBlacklisted(userId) {
  if (!userId) return false;
  const r = await query(`SELECT 1 FROM user_blacklist WHERE user_id = $1 LIMIT 1`, [userId]);
  return !!r.rows[0];
}

/* ---- Promo ---- */
async function listPromos(_req, res) {
  try {
    const r = await query(`SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT 200`);
    const active = r.rows.filter((p) => p.active).length;
    return res.json({
      total: r.rows.length,
      active,
      items: r.rows.map(mapPromo)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải khuyến mãi" });
  }
}

function perUserLimitOf(row) {
  if (row.per_user_limit != null && row.per_user_limit !== "") {
    const n = Math.round(Number(row.per_user_limit));
    if (Number.isFinite(n) && n > 0) return n;
    if (Number.isFinite(n) && n === 0) return 0;
  }
  return row.once_per_user ? 1 : 0;
}

function mapPromo(row) {
  const perUserLimit = perUserLimitOf(row);
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    percent: row.percent,
    maxCents: Number(row.max_cents),
    minOrderCents: Number(row.min_order_cents),
    expiresAt: row.expires_at,
    active: row.active,
    usedCount: row.used_count,
    maxUses: row.max_uses,
    visibility: row.visibility === "hidden" ? "hidden" : "public",
    perUserLimit,
    oncePerUser: perUserLimit === 1,
    createdAt: row.created_at
  };
}

async function createPromo(req, res) {
  try {
    const code = String(req.body.code || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    const percent = Math.round(Number(req.body.percent || 0));
    const maxCents = Math.round(Number(req.body.maxCents || 0));
    const minOrderCents = Math.round(Number(req.body.minOrderCents || 0));
    const description = String(req.body.description || "").trim().slice(0, 500);
    const expiresAt = req.body.expiresAt || null;
    const maxUses = Math.max(1, Math.round(Number(req.body.maxUses || 1)));
    let visibility = String(req.body.visibility || "public").trim().toLowerCase();
    if (visibility !== "hidden") visibility = "public";
    let perUserLimit = Math.round(Number(req.body.perUserLimit));
    if (!Number.isFinite(perUserLimit) || perUserLimit < 0) perUserLimit = 0;
    // Legacy kind / oncePerUser still accepted
    const kind = String(req.body.kind || req.body.type || "").trim().toLowerCase();
    if (kind === "hidden" || kind === "private") visibility = "hidden";
    else if (kind === "public_once" || kind === "once" || kind === "public-once") {
      visibility = "public";
      if (!perUserLimit) perUserLimit = 1;
    } else if (kind === "public") visibility = "public";
    if (req.body.oncePerUser === true && !perUserLimit) perUserLimit = 1;
    const oncePerUser = perUserLimit === 1;
    if (!code || code.length < 3) return res.status(400).json({ error: "Mã quá ngắn" });
    if (!(percent > 0 && percent <= 100)) {
      return res.status(400).json({ error: "% giảm không hợp lệ" });
    }
    const r = await query(
      `INSERT INTO promo_codes
         (code, description, percent, max_cents, min_order_cents, expires_at, max_uses, visibility, once_per_user, per_user_limit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        code,
        description,
        percent,
        maxCents,
        minOrderCents,
        expiresAt,
        maxUses,
        visibility,
        oncePerUser,
        perUserLimit
      ]
    );
    return res.json({ promo: mapPromo(r.rows[0]) });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Mã đã tồn tại" });
    console.error(err);
    return res.status(500).json({ error: "Không tạo mã" });
  }
}

async function updatePromo(req, res) {
  try {
    const active = req.body.active != null ? Boolean(req.body.active) : null;
    if (active == null) return res.status(400).json({ error: "Thiếu active" });
    const r = await query(
      `UPDATE promo_codes SET active = $1 WHERE id = $2 RETURNING *`,
      [active, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Không tìm thấy mã" });
    return res.json({ promo: mapPromo(r.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không cập nhật mã" });
  }
}

async function deletePromo(req, res) {
  await query(`DELETE FROM promo_codes WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
}

/** Lookup + compute discount for a cart subtotal (does not consume uses). */
async function resolvePromo(codeRaw, subtotalCents, userId) {
  const code = String(codeRaw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const subtotal = Math.round(Number(subtotalCents) || 0);
  if (!code) {
    const err = new Error("Nhập mã khuyến mãi");
    err.status = 400;
    throw err;
  }
  const r = await query(`SELECT * FROM promo_codes WHERE upper(code) = $1 LIMIT 1`, [code]);
  const row = r.rows[0];
  if (!row || !row.active) {
    const err = new Error("Mã không hợp lệ hoặc đã tắt");
    err.status = 400;
    throw err;
  }
  if (row.expires_at) {
    const exp = new Date(row.expires_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (exp < today) {
      const err = new Error("Mã đã hết hạn");
      err.status = 400;
      throw err;
    }
  }
  if (Number(row.used_count) >= Number(row.max_uses)) {
    const err = new Error("Mã đã hết lượt sử dụng");
    err.status = 400;
    throw err;
  }
  const perUserLimit = perUserLimitOf(row);
  if (perUserLimit > 0) {
    if (!userId) {
      const err = new Error("Cần đăng nhập để dùng mã này");
      err.status = 401;
      throw err;
    }
    const used = await query(
      `SELECT COUNT(*)::int AS n FROM promo_redemptions WHERE promo_id = $1 AND user_id = $2`,
      [row.id, userId]
    );
    const usedN = used.rows[0]?.n || 0;
    if (usedN >= perUserLimit) {
      const err = new Error(
        perUserLimit === 1
          ? "Bạn đã dùng mã này rồi (mỗi tài khoản 1 lần)"
          : "Bạn đã dùng hết " + perUserLimit + " lần cho mã này"
      );
      err.status = 400;
      throw err;
    }
  }
  const minOrder = Number(row.min_order_cents || 0);
  if (subtotal < minOrder) {
    const err = new Error(
      "Đơn tối thiểu " + minOrder.toLocaleString("vi-VN") + "₫ để dùng mã này"
    );
    err.status = 400;
    throw err;
  }
  let discount = Math.floor((subtotal * Number(row.percent)) / 100);
  const maxCents = Number(row.max_cents || 0);
  if (maxCents > 0) discount = Math.min(discount, maxCents);
  discount = Math.max(0, Math.min(discount, subtotal));
  return {
    promo: mapPromo(row),
    discountCents: discount,
    payCents: Math.max(0, subtotal - discount)
  };
}

async function validatePromo(req, res) {
  try {
    const amount = Math.round(Number(req.body.amount || req.query.amount || 0));
    const code = req.body.code || req.query.code;
    const result = await resolvePromo(code, amount, req.user?.id);
    return res.json({
      ok: true,
      code: result.promo.code,
      description: result.promo.description,
      percent: result.promo.percent,
      maxCents: result.promo.maxCents,
      minOrderCents: result.promo.minOrderCents,
      discount: result.discountCents,
      pay: result.payCents,
      subtotal: amount,
      oncePerUser: result.promo.oncePerUser,
      perUserLimit: result.promo.perUserLimit
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "Không kiểm tra được mã" });
  }
}

/** Consume one use inside an open transaction client. */
async function consumePromo(client, promoId, userId, orderId) {
  const r = await client.query(
    `UPDATE promo_codes
     SET used_count = used_count + 1
     WHERE id = $1 AND active = TRUE AND used_count < max_uses
     RETURNING id, once_per_user, per_user_limit`,
    [promoId]
  );
  if (!r.rowCount) {
    const err = new Error("Mã vừa hết lượt hoặc không còn hiệu lực");
    err.status = 409;
    throw err;
  }
  const limit = perUserLimitOf(r.rows[0]);
  if (userId && limit > 0) {
    const cnt = await client.query(
      `SELECT COUNT(*)::int AS n FROM promo_redemptions WHERE promo_id = $1 AND user_id = $2`,
      [promoId, userId]
    );
    if ((cnt.rows[0]?.n || 0) >= limit) {
      const e = new Error(
        limit === 1
          ? "Bạn đã dùng mã này rồi (mỗi tài khoản 1 lần)"
          : "Bạn đã dùng hết " + limit + " lần cho mã này"
      );
      e.status = 400;
      throw e;
    }
    await client.query(
      `INSERT INTO promo_redemptions (promo_id, user_id, order_id)
       VALUES ($1,$2,$3)`,
      [promoId, userId, orderId || null]
    );
  }
}

/** Public list for checkout chips — only visibility=public; hide when user hit per_user_limit. */
async function listActivePromos(req, res) {
  try {
    const userId = req.user?.id || null;
    const r = await query(
      `SELECT p.code, p.description, p.percent, p.max_cents, p.min_order_cents, p.expires_at,
              p.once_per_user, p.per_user_limit
       FROM promo_codes p
       WHERE p.active = TRUE
         AND p.visibility = 'public'
         AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
         AND p.used_count < p.max_uses
         AND (
           COALESCE(NULLIF(p.per_user_limit, 0), CASE WHEN p.once_per_user THEN 1 ELSE 0 END) = 0
           OR $1::uuid IS NULL
           OR (
             SELECT COUNT(*)::int FROM promo_redemptions r
             WHERE r.promo_id = p.id AND r.user_id = $1::uuid
           ) < COALESCE(NULLIF(p.per_user_limit, 0), CASE WHEN p.once_per_user THEN 1 ELSE 0 END)
         )
       ORDER BY p.created_at DESC LIMIT 50`,
      [userId]
    );
    return res.json({
      items: r.rows.map((row) => {
        const perUserLimit = perUserLimitOf(row);
        return {
          code: row.code,
          description: row.description,
          percent: row.percent,
          maxCents: Number(row.max_cents),
          minOrderCents: Number(row.min_order_cents),
          expiresAt: row.expires_at,
          perUserLimit,
          oncePerUser: perUserLimit === 1
        };
      })
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải mã" });
  }
}

/* ---- Notifications ---- */
async function listNotifications(_req, res) {
  try {
    const r = await query(
      `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100`
    );
    const users = await query(`SELECT COUNT(*)::int AS n FROM users`);
    return res.json({
      stats: {
        total: r.rows.length,
        users: users.rows[0].n
      },
      items: r.rows.map((row) => ({
        id: row.id,
        audience: row.audience,
        title: row.title,
        body: row.body,
        kind: row.kind,
        createdBy: row.created_by,
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải thông báo" });
  }
}

async function createNotification(req, res) {
  try {
    const audience = String(req.body.audience || "all").trim();
    const title = String(req.body.title || "").trim().slice(0, 200);
    const body = String(req.body.body || "").trim().slice(0, 4000);
    const kind = String(req.body.kind || "system").trim().slice(0, 40);
    if (!["all", "customers", "shops"].includes(audience)) {
      return res.status(400).json({ error: "audience không hợp lệ" });
    }
    if (!title || !body) return res.status(400).json({ error: "Thiếu tiêu đề / nội dung" });
    const r = await query(
      `INSERT INTO notifications (audience, title, body, kind, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [audience, title, body, kind, req.user?.email || ""]
    );
    return res.json({ notification: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không gửi thông báo" });
  }
}

async function deleteNotification(req, res) {
  await query(`DELETE FROM notifications WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
}

/* ---- Blog ---- */
function mapBlogAdmin(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    locale: row.locale,
    status: row.status,
    category: row.category || "",
    categoryLabel: row.category_label || "",
    excerpt: row.excerpt || "",
    metaTitle: row.meta_title || "",
    metaDescription: row.meta_description || "",
    keywords: row.keywords || "",
    image: row.image || "",
    ogImage: row.og_image || "",
    canonicalPath: row.canonical_path || "",
    readTime: row.read_time || "",
    publishedDate: row.published_date || null,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/** Shape dùng cho website Chia sẻ */
function mapBlogPublic(row) {
  const date =
    row.published_date ||
    (row.updated_at ? String(row.updated_at).slice(0, 10) : "") ||
    (row.created_at ? String(row.created_at).slice(0, 10) : "");
  let dateLabel = date;
  try {
    if (date) {
      const d = new Date(date);
      dateLabel = d.toLocaleDateString("vi-VN");
    }
  } catch (_) {}
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.meta_description || row.excerpt || "",
    cat: row.category || "",
    catLabel: row.category_label || row.category || "",
    date,
    dateLabel,
    readTime: row.read_time || "5 phút đọc",
    image: row.image || row.og_image || "",
    keywords: row.keywords || "",
    body: row.content || "",
    metaTitle: row.meta_title || row.title,
    metaDescription: row.meta_description || row.excerpt || "",
    ogImage: row.og_image || row.image || "",
    canonicalPath: row.canonical_path || `/vi/chia-se/${row.slug}`
  };
}

async function listBlog(req, res) {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "all").trim();
    const locale = String(req.query.locale || "all").trim();
    const category = String(req.query.category || "all").trim();
    const params = [];
    const where = [];
    if (q) {
      params.push("%" + q + "%");
      where.push(
        `(lower(title) LIKE $${params.length} OR lower(slug) LIKE $${params.length} OR lower(COALESCE(excerpt,'')) LIKE $${params.length} OR lower(COALESCE(category,'')) LIKE $${params.length} OR lower(COALESCE(keywords,'')) LIKE $${params.length})`
      );
    }
    if (status && status !== "all") {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (locale && locale !== "all") {
      params.push(locale);
      where.push(`locale = $${params.length}`);
    }
    if (category && category !== "all") {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    const r = await query(
      `SELECT * FROM blog_posts` +
        (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
        ` ORDER BY updated_at DESC LIMIT 500`,
      params
    );
    const cats = await query(
      `SELECT category, COUNT(*)::int AS n FROM blog_posts
       WHERE category <> '' GROUP BY category ORDER BY n DESC`
    );
    const counts = await query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'published')::int AS published,
              COUNT(*) FILTER (WHERE status = 'draft')::int AS draft
       FROM blog_posts`
    );
    return res.json({
      counts: counts.rows[0],
      categories: cats.rows,
      items: r.rows.map(mapBlogAdmin)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải blog" });
  }
}

async function getBlog(req, res) {
  const r = await query(`SELECT * FROM blog_posts WHERE id = $1`, [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: "Không tìm thấy bài" });
  return res.json({ post: mapBlogAdmin(r.rows[0]) });
}

function pickBlogBody(body) {
  const title = String(body.title || "").trim();
  let slug = String(body.slug || "").trim() || slugify(title);
  const locale = String(body.locale || "vi").trim().slice(0, 8) || "vi";
  const status = String(body.status || "draft").trim();
  const content = String(body.content || "");
  const category = String(body.category || "").trim().slice(0, 80);
  const categoryLabel = String(body.categoryLabel || body.category_label || "").trim().slice(0, 80);
  const excerpt = String(body.excerpt || "").trim().slice(0, 500);
  const metaTitle = String(body.metaTitle || body.meta_title || "").trim().slice(0, 200);
  const metaDescription = String(
    body.metaDescription || body.meta_description || excerpt || ""
  )
    .trim()
    .slice(0, 320);
  const keywords = String(body.keywords || "").trim().slice(0, 400);
  const image = String(body.image || "").trim().slice(0, 500);
  const ogImage = String(body.ogImage || body.og_image || image || "").trim().slice(0, 500);
  let canonicalPath = String(body.canonicalPath || body.canonical_path || "").trim().slice(0, 300);
  if (!canonicalPath && slug) canonicalPath = `/vi/chia-se/${slug}`;
  const readTime = String(body.readTime || body.read_time || "").trim().slice(0, 40);
  const publishedDate = body.publishedDate || body.published_date || null;
  return {
    title,
    slug,
    locale,
    status,
    content,
    category,
    categoryLabel,
    excerpt,
    metaTitle,
    metaDescription,
    keywords,
    image,
    ogImage,
    canonicalPath,
    readTime,
    publishedDate
  };
}

async function upsertBlog(req, res) {
  try {
    const id = req.params.id || req.body.id;
    const p = pickBlogBody(req.body);
    if (!p.title) return res.status(400).json({ error: "Thiếu tiêu đề" });
    if (!["draft", "published"].includes(p.status)) {
      return res.status(400).json({ error: "status không hợp lệ" });
    }
    if (!p.slug) p.slug = "bai-" + Date.now();
    const vals = [
      p.title,
      p.slug,
      p.locale,
      p.status,
      p.content,
      p.category,
      p.categoryLabel,
      p.excerpt,
      p.metaTitle,
      p.metaDescription,
      p.keywords,
      p.image,
      p.ogImage,
      p.canonicalPath,
      p.readTime,
      p.publishedDate
    ];
    let r;
    if (id) {
      r = await query(
        `UPDATE blog_posts SET
           title=$1, slug=$2, locale=$3, status=$4, content=$5,
           category=$6, category_label=$7, excerpt=$8,
           meta_title=$9, meta_description=$10, keywords=$11,
           image=$12, og_image=$13, canonical_path=$14, read_time=$15,
           published_date=$16, updated_at=NOW()
         WHERE id=$17 RETURNING *`,
        [...vals, id]
      );
      if (!r.rows[0]) return res.status(404).json({ error: "Không tìm thấy bài" });
    } else {
      r = await query(
        `INSERT INTO blog_posts
           (title, slug, locale, status, content, category, category_label, excerpt,
            meta_title, meta_description, keywords, image, og_image, canonical_path,
            read_time, published_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        vals
      );
    }
    return res.json({ post: mapBlogAdmin(r.rows[0]) });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Slug đã tồn tại" });
    console.error(err);
    return res.status(500).json({ error: "Không lưu bài" });
  }
}

async function deleteBlog(req, res) {
  await query(`DELETE FROM blog_posts WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
}

async function syncBlogFromSite(req, res) {
  try {
    const posts = Array.isArray(req.body.posts) ? req.body.posts : [];
    if (!posts.length) return res.status(400).json({ error: "Không có bài để đồng bộ" });
    let upserted = 0;
    for (const raw of posts.slice(0, 200)) {
      const p = pickBlogBody({
        title: raw.title,
        slug: raw.slug,
        content: raw.content || raw.body || "",
        category: raw.category || raw.cat || "",
        categoryLabel: raw.categoryLabel || raw.catLabel || "",
        excerpt: raw.excerpt || "",
        metaTitle: raw.metaTitle || raw.title || "",
        metaDescription: raw.metaDescription || raw.excerpt || "",
        keywords: raw.keywords || "",
        image: raw.image || "",
        ogImage: raw.ogImage || raw.image || "",
        canonicalPath: raw.canonicalPath || (raw.slug ? `/vi/chia-se/${raw.slug}` : ""),
        readTime: raw.readTime || "",
        publishedDate: raw.publishedDate || raw.date || null,
        locale: raw.locale || "vi",
        status: raw.status === "draft" ? "draft" : "published"
      });
      if (!p.title || !p.slug) continue;
      await query(
        `INSERT INTO blog_posts
           (title, slug, locale, status, content, category, category_label, excerpt,
            meta_title, meta_description, keywords, image, og_image, canonical_path,
            read_time, published_date, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           category = EXCLUDED.category,
           category_label = EXCLUDED.category_label,
           excerpt = EXCLUDED.excerpt,
           meta_title = EXCLUDED.meta_title,
           meta_description = EXCLUDED.meta_description,
           keywords = EXCLUDED.keywords,
           image = EXCLUDED.image,
           og_image = EXCLUDED.og_image,
           canonical_path = EXCLUDED.canonical_path,
           read_time = EXCLUDED.read_time,
           published_date = COALESCE(EXCLUDED.published_date, blog_posts.published_date),
           locale = EXCLUDED.locale,
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [
          p.title,
          p.slug,
          p.locale,
          p.status,
          p.content,
          p.category,
          p.categoryLabel,
          p.excerpt,
          p.metaTitle,
          p.metaDescription,
          p.keywords,
          p.image,
          p.ogImage,
          p.canonicalPath,
          p.readTime,
          p.publishedDate
        ]
      );
      upserted += 1;
    }
    return res.json({ ok: true, upserted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không đồng bộ blog" });
  }
}

async function listPublicBlog(_req, res) {
  try {
    const r = await query(
      `SELECT * FROM blog_posts WHERE status = 'published'
       ORDER BY COALESCE(published_date, created_at::date) DESC, updated_at DESC
       LIMIT 200`
    );
    return res.json({ items: r.rows.map(mapBlogPublic) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải blog" });
  }
}

async function getPublicBlog(req, res) {
  try {
    const r = await query(
      `SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published'`,
      [req.params.slug]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Không tìm thấy" });
    return res.json({ post: mapBlogPublic(r.rows[0]) });
  } catch (err) {
    return res.status(500).json({ error: "Không tải bài" });
  }
}

/* ---- Virtual shops ---- */
async function listVirtualShops(req, res) {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const r = await query(
      `SELECT * FROM virtual_shops
       WHERE ($1 = '' OR lower(name) LIKE '%'||$1||'%'
              OR lower(city) LIKE '%'||$1||'%'
              OR phone LIKE '%'||$1||'%')
       ORDER BY updated_at DESC
       LIMIT 500`,
      [q]
    );
    const stats = await query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE visible)::int AS visible,
              COUNT(*) FILTER (WHERE on_shift)::int AS on_shift
       FROM virtual_shops`
    );
    return res.json({
      stats: stats.rows[0],
      items: r.rows.map((row) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        district: row.district,
        phone: row.phone,
        rating: Number(row.rating),
        bio: row.bio,
        visible: row.visible,
        onShift: row.on_shift,
        avatarUrl: row.avatar_url,
        updatedAt: row.updated_at
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải shop ảo" });
  }
}

async function upsertVirtualShop(req, res) {
  try {
    const id = req.params.id || req.body.id;
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Thiếu tên shop" });
    const city = String(req.body.city || "").trim();
    const district = String(req.body.district || "").trim();
    const phone = String(req.body.phone || "").trim();
    const rating = Number(req.body.rating != null ? req.body.rating : 4.9);
    const bio = String(req.body.bio || "").trim().slice(0, 1000);
    const visible = req.body.visible != null ? Boolean(req.body.visible) : true;
    const onShift = req.body.onShift != null ? Boolean(req.body.onShift) : true;
    const avatarUrl = String(req.body.avatarUrl || "").trim();
    let r;
    if (id) {
      r = await query(
        `UPDATE virtual_shops SET
           name=$1, city=$2, district=$3, phone=$4, rating=$5, bio=$6,
           visible=$7, on_shift=$8, avatar_url=$9, updated_at=NOW()
         WHERE id=$10 RETURNING *`,
        [name, city, district, phone, rating, bio, visible, onShift, avatarUrl, id]
      );
      if (!r.rows[0]) return res.status(404).json({ error: "Không tìm thấy" });
    } else {
      r = await query(
        `INSERT INTO virtual_shops
           (name, city, district, phone, rating, bio, visible, on_shift, avatar_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [name, city, district, phone, rating, bio, visible, onShift, avatarUrl]
      );
    }
    return res.json({ shop: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không lưu shop ảo" });
  }
}

async function deleteVirtualShop(req, res) {
  await query(`DELETE FROM virtual_shops WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
}

module.exports = {
  listBlacklist,
  addBlacklist,
  removeBlacklist,
  isUserBlacklisted,
  listPromos,
  createPromo,
  updatePromo,
  deletePromo,
  validatePromo,
  resolvePromo,
  consumePromo,
  listActivePromos,
  listNotifications,
  createNotification,
  deleteNotification,
  listBlog,
  getBlog,
  upsertBlog,
  deleteBlog,
  syncBlogFromSite,
  listPublicBlog,
  getPublicBlog,
  listVirtualShops,
  upsertVirtualShop,
  deleteVirtualShop
};
