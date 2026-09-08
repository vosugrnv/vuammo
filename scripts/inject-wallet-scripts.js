/**
 * Inject wallet client scripts before layout.js / app.js on all HTML pages.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const inject = [
  '<script src="js/api-client.js"></script>',
  '<script src="js/cart-store.js"></script>',
  '<script src="js/auth.js"></script>',
  '<script src="js/cart-page.js"></script>'
].join("\n");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "api" || name === ".git") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

let n = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  if (html.includes("js/api-client.js")) continue;
  let next = html;
  if (next.includes('<script src="js/layout.js"></script>')) {
    next = next.replace(
      '<script src="js/layout.js"></script>',
      inject + "\n<script src=\"js/layout.js\"></script>"
    );
  } else if (next.includes('<script src="js/app.js"></script>')) {
    next = next.replace(
      '<script src="js/app.js"></script>',
      inject + "\n<script src=\"js/app.js\"></script>"
    );
  } else {
    continue;
  }
  if (next !== html) {
    fs.writeFileSync(file, next);
    n++;
  }
}
console.log("Updated", n, "files");
