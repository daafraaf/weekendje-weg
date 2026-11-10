// Nepbackend: dezelfde API-logica als het Apps Script, over HTTP op localhost (spec §3, §5.3).
// POST met Content-Type text/plain en een JSON-body, op elk pad (bijvoorbeeld /macros/s/<id>/exec).
// GET geeft alleen `status`.
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { maakApi } from '../../src/server/api.js';
import { ALLE_HANDLERS } from '../../src/server/acties/index.js';
import { maakMemoryStore, maakMemoryLock, maakMemoryEigenschappen, nodeSha256, nodeRandom } from './memorystore.mjs';
import { setupcodeMaken, beheerlinkAanmaken } from '../../src/server/acties/opzet.js';
import { maakVolledigeDemo } from './demo.mjs';

const MAX_BODY = 256 * 1024;

export function maakNepApi({ seed = {}, handlers = ALLE_HANDLERS, nu = () => new Date() } = {}) {
  const { store, adapter } = maakMemoryStore(seed, { nu });
  const lock = maakMemoryLock();
  const eigenschappen = maakMemoryEigenschappen();
  const deps = { store, lock, sha256: nodeSha256, random: nodeRandom, nu, handlers, eigenschappen, logFout: (e) => console.error(e) };
  const api = maakApi(deps);
  // Het Sheet-menu "Groep opzetten" van de nepbackend: geeft een verse setupcode.
  const setupcode = () => setupcodeMaken(deps);
  // Het Sheet-menu "Beheerlink maken": geeft het token van een nieuwe beheerlink voor een lid (zonder wachtwoord).
  const beheerlink = (lidId, wachtwoord) => {
    store.nieuwVerzoek();
    const r = beheerlinkAanmaken({ store, deps }, lidId, wachtwoord);
    store.flush();
    return r.token;
  };
  return { api, store, adapter, lock, eigenschappen, setupcode, beheerlink };
}

export function startServer({ port = 8787, host = '127.0.0.1', ...opties } = {}) {
  const nep = maakNepApi(opties);
  // SYNC-2: de tests tellen de aanroepen per actie; SYNC-5: zetStoring(['bundel']) verbreekt die aanroepen
  // (netwerkfout), zetStoring([]) herstelt.
  const aanroepen = {};
  let storing = new Set();
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
    req.on('end', () => {
      let actie = '';
      try { actie = JSON.parse(body).actie || ''; } catch { /* de API meldt zelf ongeldig */ }
      aanroepen[actie] = (aanroepen[actie] || 0) + 1;
      if (storing.has(actie)) { req.socket.destroy(); return; }
      stuur(nep.api.verwerk(body));
    });
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve({ ...nep, server, aanroepen: (actie) => aanroepen[actie] || 0, zetStoring: (acties) => { storing = new Set(acties); }, url: `http://${host}:${server.address().port}` }));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.MOCK_PORT || 8787);
  const leeg = process.argv.includes('--leeg'); // lege Sheet: probeer de opzetwizard met de setupcode uit de console
  const stapArg = process.argv.find((a) => a.startsWith('--stap='));
  const stap = stapArg ? stapArg.slice(7) : 'invullen';
  // De demo uit spec §11: editie 2026 afgerond, editie 2027 in de gekozen stap.
  const demo = maakVolledigeDemo({ stap });
  const { url, setupcode } = await startServer({ port, seed: leeg ? {} : demo.seed });
  const app = process.env.APP_URL || 'http://127.0.0.1:4173/';
  if (leeg) {
    console.log(`Nepbackend (lege Sheet) draait op ${url}/macros/s/${demo.scriptId}/exec`);
    const code = setupcode();
    console.log(`Setupcode (30 minuten geldig, eenmalig): ${code}`);
    console.log(`Opzetlink, zoals het Sheet-menu Groep opzetten hem toont: ${app}#/opzetten?b=${demo.scriptId}&code=${code}`);
  } else {
    console.log(`Nepbackend draait op ${url}/macros/s/${demo.scriptId}/exec`);
    console.log(`Pincode van alle demodeelnemers: ${demo.pin}`);
    for (const jaar of ['2027', '2026']) {
      console.log(`Editie ${jaar}${jaar === '2027' ? ` (stap ${stap})` : ' (afgerond)'}:`);
      for (const { naam, fragment } of demo.links[jaar]) console.log(`  Demolink ${naam}: ${app}${fragment}`);
    }
  }
}
