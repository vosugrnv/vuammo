const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

module.exports = {
  port: Number(process.env.PORT || 3100),
  host: process.env.HOST || "127.0.0.1",
  webOrigin: process.env.WEB_ORIGIN || "http://127.0.0.1",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtDays: Number(process.env.JWT_DAYS || 14),
  holdDays: Number(process.env.HOLD_DAYS || 3),
  adminEmails: String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  payos: {
    clientId: process.env.PAYOS_CLIENT_ID || "",
    apiKey: process.env.PAYOS_API_KEY || "",
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || "",
    mock: process.env.PAYOS_MOCK === "1"
  }
};
