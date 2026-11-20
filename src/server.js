/**
 * server.js
 * Lightweight zero-dependency HTTP server to run "Đảo Đèn Lồng" in any browser.
 * Usage: node src/server.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2], 10) || 3000;
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';

  let filePath;
  // Route /src/engine/GameSimulation.js directly
  if (reqUrl.startsWith('/src/')) {
    filePath = path.join(ROOT_DIR, reqUrl);
  } else {
    filePath = path.join(PUBLIC_DIR, reqUrl);
  }

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  ĐẢO ĐÈN LỒNG - GAME 3D ĐÃ KHỞI CHẠY THÀNH CÔNG!`);
  console.log(`  Mở trình duyệt tại: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
