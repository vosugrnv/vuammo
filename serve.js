const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 5174;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function send(res, code, data, type){
  res.writeHead(code, {"Content-Type": type || "text/plain; charset=utf-8"});
  res.end(data);
}

function resolveFile(urlPath){
  let filePath = decodeURIComponent(urlPath.split("?")[0]);
  if(filePath === "/") filePath = "/index.html";

  /* SEO listing */
  if(filePath === "/vi/tat-ca-san-pham" || filePath === "/vi/tat-ca-san-pham/"){
    return path.join(root, "tat-ca-san-pham.html");
  }

  /* SEO Chia sẻ listing */
  if(filePath === "/vi/chia-se" || filePath === "/vi/chia-se/" || filePath === "/chia-se"){
    return path.join(root, "chia-se.html");
  }

  /* SEO article: /vi/chia-se/slug */
  const shareMatch = filePath.match(/^\/vi\/chia-se\/([^/]+?)(?:\.html)?\/?$/i);
  if(shareMatch){
    const staticFile = path.join(root, "vi", "chia-se", shareMatch[1] + ".html");
    if(fs.existsSync(staticFile)) return staticFile;
    return path.join(root, "chia-se-bai.html");
  }

  /* SEO product: /vi/tat-ca-san-pham/ten-san-pham-10001 */
  const prodMatch = filePath.match(/^\/vi\/tat-ca-san-pham\/([^/]+?)(?:\.html)?\/?$/i);
  if(prodMatch && prodMatch[1] !== "index"){
    const staticFile = path.join(root, "vi", "tat-ca-san-pham", prodMatch[1] + ".html");
    if(fs.existsSync(staticFile)) return staticFile;
    return path.join(root, "product.html");
  }

  /* Legacy blog → chia sẻ */
  if(filePath === "/blog.html" || filePath === "/blog"){
    return path.join(root, "chia-se.html");
  }

  return path.join(root, filePath);
}

http.createServer((req, res) => {
  const fullPath = resolveFile(req.url || "/");
  fs.readFile(fullPath, (err, data) => {
    if(err){
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(fullPath);
    send(res, 200, data, types[ext] || "application/octet-stream");
  });
}).listen(port, () => console.log(`Serving on http://localhost:${port}`));
