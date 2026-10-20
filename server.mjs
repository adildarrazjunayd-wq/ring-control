import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = process.cwd();
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png' };
createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : normalize(pathname.slice(1));
    if (relative.startsWith('..')) throw new Error('invalid path');
    const file = join(root, relative); await stat(file);
    res.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('WWE TCG disponible sur http://localhost:4173'));
