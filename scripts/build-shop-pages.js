const fs = require("fs");
const path = require("path");

// Copy header/footer shell from wishlist
const wish = fs.readFileSync("wishlist.html", "utf8");
const headStart = wish.indexOf("<!DOCTYPE html>");
const mainStart = wish.indexOf("<main");
const mainEnd = wish.indexOf("</main>") + "</main>".length;
const scriptsStart = wish.indexOf('<script src="js/products-data.js"');

const headerPart = wish.slice(0, mainStart);
const footerPart = wish.slice(mainEnd, scriptsStart);

const shopMain = `<main class="shop-page">
  <div class="container">
    <nav class="breadcrumb seller-crumb" aria-label="Breadcrumb">
      <a href="index.html">Trang chủ</a><span class="sep">›</span>
      <a href="tat-ca-san-pham.html">Sản phẩm</a><span class="sep">›</span>
      <span class="current" id="shopCrumbName">Gian hàng</span>
    </nav>

    <header class="shop-profile-head" id="shopProfileHead">
      <div class="shop-avatar" id="shopAvatar" aria-hidden="true"></div>
      <div class="shop-profile-copy">
        <p class="account-kicker">Gian hàng · Vua MMO</p>
        <h1 id="shopName">Đang tải…</h1>
        <p class="shop-profile-meta" id="shopMeta"></p>
        <p class="shop-profile-lead" id="shopBio"></p>
        <p class="shop-token-line">Token shop: <code id="shopToken"></code></p>
      </div>
      <div class="shop-profile-stats" id="shopStats" aria-label="Thống kê gian hàng"></div>
    </header>

    <div id="shopMissing" class="wish-empty" hidden>
      <h2>Không tìm thấy gian hàng</h2>
      <p class="wish-empty-desc">Token hoặc slug không hợp lệ. Vui lòng mở lại từ trang sản phẩm.</p>
      <div class="wish-empty-actions">
        <a href="tat-ca-san-pham.html" class="btn btn-primary">Xem cửa hàng</a>
      </div>
    </div>

    <section id="shopProducts" class="shop-products" aria-labelledby="shopProductsTitle" hidden>
      <div class="shop-products-bar">
        <h2 id="shopProductsTitle">Sản phẩm đang bán</h2>
        <p id="shopProductsCount" class="shop-products-count"></p>
      </div>
      <div class="card-grid" id="shopGrid"></div>
    </section>
  </div>
</main>
`;

const scripts = `<script src="js/products-data.js"></script>
<script src="js/shops-data.js?v=20260907g"></script>
<script src="js/chat-widget.js"></script>
<script src="js/cards.js?v=20260907g"></script>
<script src="js/api-client.js?v=20260907c"></script>
<script src="js/cart-store.js?v=20260907c"></script>
<script src="js/wish-store.js?v=20260907c"></script>
<script src="js/site-header.js?v=20260907f"></script>
<script src="js/auth.js?v=20260907f"></script>
<script src="js/cart-page.js"></script>
<script src="js/shop-page.js?v=20260907g"></script>
<script src="js/layout.js?v=20260907f"></script>
</body>
</html>
`;

const head = headerPart
  .replace(/<title>[\s\S]*?<\/title>/, "<title>Gian hàng | Vua MMO</title>")
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Trang gian hàng người bán trên Vua MMO — xem hồ sơ shop, token và danh sách sản phẩm đang bán.">')
  .replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="https://vuammo.com/shop.html">')
  .replace(/wishlist\.html/g, "shop.html")
  .replace(/Danh sách yêu thích/g, "Gian hàng")
  .replace(/wish-page/g, "shop-page");

const html = head + shopMain + footerPart + scripts;
fs.writeFileSync("shop.html", html);

// Generate per-shop static pages for SEO
const shops = JSON.parse(fs.readFileSync("data/shops-50.json", "utf8"));
fs.mkdirSync("gian-hang", { recursive: true });
for (const s of shops) {
  const page = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0;url=../shop.html?token=${encodeURIComponent(s.token)}">
<link rel="canonical" href="https://vuammo.com/shop.html?token=${encodeURIComponent(s.token)}">
<title>${s.name} | Gian hàng Vua MMO</title>
<meta name="description" content="Gian hàng ${s.name} trên Vua MMO — ${s.city}. Token: ${s.token}">
<script>location.replace("../shop.html?token=${encodeURIComponent(s.token)}");</script>
</head>
<body>
<p>Đang chuyển tới gian hàng <a href="../shop.html?token=${encodeURIComponent(s.token)}">${s.name}</a>…</p>
</body>
</html>
`;
  fs.writeFileSync(path.join("gian-hang", s.slug + ".html"), page);
}
console.log("shop.html +", shops.length, "gian-hang pages");
