const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("./config");
const { query } = require("./db");

const COOKIE = "vuammo_token";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/vuammo/uploads";
const USER_COLS = "id, email, name, avatar_url, balance_cents, created_at";

function ensureUploadDir() {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (_) {}
}

function signUser(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: `${config.jwtDays}d` }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: config.jwtDays * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE, { path: "/" });
}

async function register(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const name = String(req.body.name || "").trim();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Mật khẩu tối thiểu 6 ký tự" });
    }
    const hash = await bcrypt.hash(password, 10);
    const r = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1,$2,$3)
       RETURNING ${USER_COLS}`,
      [email, hash, name || email.split("@")[0]]
    );
    const user = r.rows[0];
    const token = signUser(user);
    setAuthCookie(res, token);
    return res.json({ user: publicUser(user), token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email đã được đăng ký" });
    }
    console.error(err);
    return res.status(500).json({ error: "Không đăng ký được" });
  }
}

async function login(req, res) {
  try {
    const email = String(req.body.email || req.body.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const r = await query(
      `SELECT ${USER_COLS}, password_hash
       FROM users WHERE email = $1`,
      [email]
    );
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
    const token = signUser(user);
    setAuthCookie(res, token);
    return res.json({ user: publicUser(user), token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không đăng nhập được" });
  }
}

function logout(_req, res) {
  clearAuthCookie(res);
  return res.json({ ok: true });
}

async function me(req, res) {
  const r = await query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [req.user.id]);
  if (!r.rows[0]) return res.status(401).json({ error: "Unauthorized" });
  const user = publicUser(r.rows[0]);
  try {
    const cms = require("./cms");
    user.isBlacklisted = await cms.isUserBlacklisted(user.id);
  } catch (_) {
    user.isBlacklisted = false;
  }
  return res.json({ user });
}

async function updateProfile(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    if (!name || name.length < 2) {
      return res.status(400).json({ error: "Tên hiển thị tối thiểu 2 ký tự" });
    }
    if (name.length > 80) {
      return res.status(400).json({ error: "Tên hiển thị tối đa 80 ký tự" });
    }
    const r = await query(
      `UPDATE users SET name = $1 WHERE id = $2
       RETURNING ${USER_COLS}`,
      [name, req.user.id]
    );
    if (!r.rows[0]) return res.status(401).json({ error: "Unauthorized" });
    return res.json({ user: publicUser(r.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không cập nhật được hồ sơ" });
  }
}

async function uploadAvatar(req, res) {
  try {
    ensureUploadDir();
    const raw = String(req.body.data || "");
    const nameHint = String(req.body.filename || "avatar.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
    const m = raw.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: "Thiếu ảnh (data URL base64)" });
    const mime = m[1].toLowerCase();
    if (!mime.startsWith("image/")) {
      return res.status(400).json({ error: "Chỉ chấp nhận file ảnh" });
    }
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: "Ảnh tối đa 3MB" });
    }
    const ext =
      mime.includes("png")
        ? ".png"
        : mime.includes("webp")
          ? ".webp"
          : mime.includes("gif")
            ? ".gif"
            : ".jpg";
    const file =
      "avatar-" +
      String(req.user.id).slice(0, 8) +
      "-" +
      Date.now().toString(36) +
      "-" +
      crypto.randomBytes(3).toString("hex") +
      ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
    const url = "/uploads/" + file;
    const r = await query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING ${USER_COLS}`,
      [url, req.user.id]
    );
    if (!r.rows[0]) return res.status(401).json({ error: "Unauthorized" });
    return res.json({ ok: true, url, user: publicUser(r.rows[0]) });
  } catch (err) {
    console.error("uploadAvatar", err);
    return res.status(500).json({ error: "Upload avatar thất bại" });
  }
}

async function changePassword(req, res) {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Mật khẩu mới tối thiểu 6 ký tự" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "Mật khẩu mới phải khác mật khẩu hiện tại" });
    }
    const r = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
    const hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, req.user.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không đổi được mật khẩu" });
  }
}

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    const token = bearer || req.cookies?.[COOKIE] || "";
    if (!token) return res.status(401).json({ error: "Cần đăng nhập" });
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Phiên đăng nhập hết hạn" });
  }
}

function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    const token = bearer || req.cookies?.[COOKIE] || "";
    if (token) {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = { id: payload.sub, email: payload.email };
    }
  } catch (_) {
    /* ignore */
  }
  next();
}

function publicUser(row) {
  const base = {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url || "",
    balanceCents: Number(row.balance_cents),
    balance: Number(row.balance_cents),
    createdAt: row.created_at
  };
  const admin = require("./admin");
  base.isAdmin = admin.isAdmin(base);
  return base;
}

module.exports = {
  register,
  login,
  logout,
  me,
  updateProfile,
  uploadAvatar,
  changePassword,
  authRequired,
  optionalAuth,
  publicUser,
  COOKIE
};
