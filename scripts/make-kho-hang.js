const fs = require("fs");
const src = fs.readFileSync("C:/Users/Admin/Downloads/vuammo/don-hang.html", "utf8");
let html = src
  .replace("Đơn hàng — Vua MMO", "Kho hàng — Vua MMO")
  .replace('current">Đơn hàng', 'current">Kho hàng')
  .replace(
    'id="ordersApp" class="orders-app"><p>Đang tải...</p></div>',
    'id="stockApp" class="stock-app"><p>Đang tải...</p></div>'
  )
  .replace("js/orders-page.js", "js/kho-hang.js?v=20260907p")
  .replace("css/style.css?v=20260907o", "css/style.css?v=20260907p");
fs.writeFileSync("C:/Users/Admin/Downloads/vuammo/kho-hang.html", html, "utf8");
console.log("ok", html.includes("stockApp"), /Kho hàng/.test(html));
