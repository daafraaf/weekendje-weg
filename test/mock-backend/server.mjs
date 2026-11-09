// Nepbackend: dezelfde API-logica als het Apps Script, over HTTP op localhost (spec §3, §5.3).
// POST met Content-Type text/plain en een JSON-body, op elk pad (bijvoorbeeld /macros/s/<id>/exec).
// GET geeft alleen `status`.
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { maakApi } from '../../src/server/api.js';
import { ALLE_HANDLERS } from '../../src/server/acties/index.js';
import { maakMemoryStore, maakMemoryLock, nodeSha256, nodeRandom } from './memorystore.mjs';
import { maakDemo } from './demo.mjs';

const MAX_BODY = 256 * 1024;

export function maakNepApi({ seed = {}, handlers = ALLE_HANDLERS, nu = () => new Date() } = {}) {
  const { store, adapter } = maakMemoryStore(seed, { nu });
  const lock = maakMemoryLock();
  const api = maakApi({ store, lock, sha256: nodeSha256, random: nodeRandom, nu, handlers, logFout: (e) => console.error(e) });
  return { api, store, adapter, lock };
}

export function startServer({ port = 8787, host = '127.0.0.1', ...opties } = {}) {
  const nep = maakNepApi(opties);
  const server = http.createServer((req, res) => {
    const stuur = (antwoord) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(antwoord));
    };
    if (req.method === 'GET') return stuur(nep.api.verwerkGet());
    if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (stuk) => {
      body += stuk;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on('end', () => stuur(nep.api.verwerk(body)));
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve({ ...nep, server, url: `http://${host}:${server.address().port}` }));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.MOCK_PORT || 8787);
  const demo = maakDemo();
  const { url } = await startServer({ port, seed: demo.seed });
  const app = process.env.APP_URL || 'http://127.0.0.1:4173/';
  console.log(`Nepbackend draait op ${url}/macros/s/${demo.scriptId}/exec`);
  console.log(`Pincode van alle demodeelnemers: ${demo.pin}`);
  demo.namen.forEach((naam, i) => console.log(`Demolink ${naam}: ${app}${demo.fragment(i)}`));
}
