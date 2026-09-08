const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./config");
const auth = require("./auth");
const wallet = require("./wallet");
const orders = require("./orders");
const stock = require("./stock");
const admin = require("./admin");
const cms = require("./cms");
const catalogCms = require("./catalog-cms");

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      return cb(null, true);
    },
    credentials: true
  })
);
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    payos: wallet.hasPayos(),
    mock: config.payos.mock,
    adminConfigured: config.adminEmails.length > 0
  });
});

app.post("/auth/register", auth.register);
app.post("/auth/login", auth.login);
app.post("/auth/logout", auth.logout);
app.get("/auth/me", auth.authRequired, auth.me);
app.patch("/auth/profile", auth.authRequired, auth.updateProfile);
app.post("/auth/avatar", auth.authRequired, auth.uploadAvatar);
app.post("/auth/password", auth.authRequired, auth.changePassword);

app.get("/notifications", auth.authRequired, async (req, res) => {
  try {
    const { query } = require("./db");
    const r = await query(
      `SELECT id, audience, title, body, kind, created_at
       FROM notifications
       WHERE audience IN ('all','customers')
       ORDER BY created_at DESC LIMIT 50`
    );
    return res.json({ items: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không tải thông báo" });
  }
});
app.get("/promos/active", auth.optionalAuth, cms.listActivePromos);
app.post("/promos/validate", auth.authRequired, cms.validatePromo);
app.get("/blog", cms.listPublicBlog);
app.get("/blog/:slug", cms.getPublicBlog);
app.get("/catalog/extra", catalogCms.listPublicCatalog);

app.post("/wallet/topup", auth.authRequired, wallet.createTopup);
app.get("/wallet/ledger", auth.authRequired, wallet.ledger);
app.get("/wallet/topup/:code/sync", auth.authRequired, wallet.syncTopup);
app.post("/payos/webhook", wallet.payosWebhook);

app.post("/orders", auth.authRequired, orders.createOrder);
app.get("/orders", auth.authRequired, orders.listOrders);
app.get("/orders/reviews/mine", auth.authRequired, orders.listMyReviews);
app.get("/orders/:id", auth.authRequired, orders.getOrder);
app.post("/orders/:id/dispute", auth.authRequired, orders.disputeOrder);
app.post("/orders/:id/dispute/withdraw", auth.authRequired, orders.withdrawDispute);
app.post("/orders/:id/review", auth.authRequired, orders.reviewOrder);
app.get("/products/:productId/reviews", orders.listProductReviews);

app.get("/stock/counts", stock.getCounts);
app.get("/stock", auth.authRequired, stock.listStock);
app.post("/stock/import", auth.authRequired, stock.importStock);
app.get("/stock/:productId/preview", auth.authRequired, stock.previewStock);

app.post("/chat/messages", auth.optionalAuth, admin.postChatMessage);
app.get("/chat/messages", auth.optionalAuth, admin.listChatMessages);

const adm = [auth.authRequired, admin.adminRequired];
app.get("/admin/dashboard", ...adm, admin.dashboard);
app.get("/admin/orders", ...adm, admin.listOrders);
app.patch("/admin/orders/:id", ...adm, admin.updateOrderStatus);
app.get("/admin/users", ...adm, admin.listUsers);
app.post("/admin/users/:id/credit", ...adm, admin.creditWallet);
app.get("/admin/ledger", ...adm, admin.listLedger);
app.get("/admin/disputes", ...adm, admin.listDisputes);
app.patch("/admin/disputes/:id", ...adm, admin.updateDispute);
app.post("/admin/stock/void", ...adm, admin.voidStock);
app.get("/admin/shops", ...adm, admin.listShopOverrides);
app.put("/admin/shops/:token", ...adm, admin.upsertShop);
app.delete("/admin/shops/:token", ...adm, admin.deleteShopOverride);
app.get("/admin/products", ...adm, admin.listProductOverrides);
app.put("/admin/products/:id", ...adm, admin.upsertProduct);
app.delete("/admin/products/:id", ...adm, admin.deleteProductOverride);
app.get("/admin/chat/threads", ...adm, admin.adminChatThreads);
app.get("/admin/badges", ...adm, admin.adminBadges);

app.get("/admin/blacklist", ...adm, cms.listBlacklist);
app.post("/admin/blacklist", ...adm, cms.addBlacklist);
app.delete("/admin/blacklist/:id", ...adm, cms.removeBlacklist);
app.get("/admin/promos", ...adm, cms.listPromos);
app.post("/admin/promos", ...adm, cms.createPromo);
app.patch("/admin/promos/:id", ...adm, cms.updatePromo);
app.delete("/admin/promos/:id", ...adm, cms.deletePromo);
app.get("/admin/notifications", ...adm, cms.listNotifications);
app.post("/admin/notifications", ...adm, cms.createNotification);
app.delete("/admin/notifications/:id", ...adm, cms.deleteNotification);
app.get("/admin/blog", ...adm, cms.listBlog);
app.get("/admin/blog/:id", ...adm, cms.getBlog);
app.post("/admin/blog", ...adm, cms.upsertBlog);
app.put("/admin/blog/:id", ...adm, cms.upsertBlog);
app.delete("/admin/blog/:id", ...adm, cms.deleteBlog);
app.post("/admin/blog/sync", ...adm, cms.syncBlogFromSite);
app.get("/admin/virtual-shops", ...adm, cms.listVirtualShops);
app.post("/admin/virtual-shops", ...adm, cms.upsertVirtualShop);
app.put("/admin/virtual-shops/:id", ...adm, cms.upsertVirtualShop);
app.delete("/admin/virtual-shops/:id", ...adm, cms.deleteVirtualShop);

app.post("/admin/upload", ...adm, catalogCms.uploadFile);
app.get("/admin/cms-products", ...adm, catalogCms.listCmsProducts);
app.post("/admin/cms-products", ...adm, catalogCms.upsertCmsProduct);
app.put("/admin/cms-products/:id", ...adm, catalogCms.upsertCmsProduct);
app.delete("/admin/cms-products/:id", ...adm, catalogCms.deleteCmsProduct);
app.get("/admin/cms-shops", ...adm, catalogCms.listCmsShops);
app.post("/admin/cms-shops", ...adm, catalogCms.upsertCmsShop);
app.put("/admin/cms-shops/:token", ...adm, catalogCms.upsertCmsShop);
app.delete("/admin/cms-shops/:token", ...adm, catalogCms.deleteCmsShop);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

setInterval(() => {
  orders.releaseExpiredOrders().catch((e) => console.error("release job", e));
}, 60 * 60 * 1000);
orders.releaseExpiredOrders().catch(() => {});

app.listen(config.port, config.host, () => {
  console.log(`vuammo-api on http://${config.host}:${config.port}`);
});
