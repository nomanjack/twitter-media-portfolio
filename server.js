const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

// API endpoint to save hidden IDs to config
const handleApi = (req, res) => {
  if (req.method === "POST" && req.url === "/api/hidden") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { hiddenIds } = JSON.parse(body);
        const configPath = path.join(__dirname, "portfolio.config.json");
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        config.hiddenIds = hiddenIds;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }
  return false;
};

http
  .createServer((req, res) => {
    if (handleApi(req, res)) return;

    let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`));
