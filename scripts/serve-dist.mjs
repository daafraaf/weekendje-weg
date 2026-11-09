// Serveert dist/web voor de Playwright-tests (poort uit PORT, standaard 4173).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'web');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.resolve(dir, rel);
  if (!file.startsWith(dir + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('niet gevonden');
  }
}).listen(Number(process.env.PORT) || 4173, '127.0.0.1');
