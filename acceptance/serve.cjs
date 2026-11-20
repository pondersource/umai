const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filename = path.resolve(root, '.' + pathname);
    if (!filename.startsWith(root + path.sep) && filename !== root) { res.writeHead(403).end(); return; }
    if (pathname === '/') filename = path.join(root, 'index.html');
    if (!fs.existsSync(filename) || fs.statSync(filename).isDirectory()) {
        if (path.extname(pathname)) { res.writeHead(404).end(); return; }
        res.statusCode = 404;
        filename = path.join(root, '404.html');
    }
    res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    fs.createReadStream(filename).pipe(res);
}).listen(5001, '127.0.0.1');
