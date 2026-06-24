import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3006;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
};

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

// Add Express-like shims so API handlers work identically to Vercel
function shimRes(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json   = obj  => {
    if (!res.headersSent) res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  res.send   = data => {
    if (!res.headersSent) res.writeHead(res.statusCode || 200);
    res.end(data);
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  // SSE streaming narrate
  if (url.pathname === '/api/narrate' && req.method === 'POST') {
    const body = await readBody(req);
    shimRes(res);
    try {
      const mod = await import(`./api/narrate.js?t=${Date.now()}`);
      await mod.default({ method: req.method, body }, res);
    } catch (err) {
      if (!res.headersSent) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); }
    }
    return;
  }

  // ElevenLabs speak
  if (url.pathname === '/api/speak' && req.method === 'POST') {
    const body = await readBody(req);
    shimRes(res);
    try {
      const mod = await import(`./api/speak.js?t=${Date.now()}`);
      await mod.default({ method: req.method, body }, res);
    } catch (err) {
      if (!res.headersSent) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); }
    }
    return;
  }

  // Static files
  const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  try {
    const data = fs.readFileSync(path.join(__dirname, filePath));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  The Patriot Gazette → http://localhost:${PORT}\n`);
});
