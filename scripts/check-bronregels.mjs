// Bewaakt de harde bronregels (NFR-3). Gebruik: node scripts/check-bronregels.mjs [wortel]
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// AAN-37: de navigatielijst met vaste externe links is dit ene bestand in src/web.
export const NAVIGATIELIJST = 'src/web/navigatie.js';

const CODE_EXT = new Set(['.js', '.mjs', '.html', '.css']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'test-results', 'playwright-report']);
const SECRET_SKIP = new Set(['test/unit/bronregels.test.mjs']);

const GEHEIMEN = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bghp_[A-Za-z0-9]{30,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(secret|password|passwd|token|api[_-]?key)\w*\s*[:=]\s*['"][^'"\s]{8,}['"]/i,
];

async function* walk(dir, root) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full, root);
    else if (CODE_EXT.has(path.extname(e.name)) || e.name.endsWith('.json')) {
      yield { full, rel: path.relative(root, full).split(path.sep).join('/') };
    }
  }
}

function isLiteralZonderVariabelen(rhs) {
  const m = rhs.trim().match(/^(['"`])((?:\\.|(?!\1).)*)\1\s*;?\s*(\/\/.*)?$/);
  return Boolean(m) && !(m[1] === '`' && m[2].includes('${'));
}

function controleerCode(rel, regels, out) {
  const web = rel.startsWith('src/web/');
  regels.forEach((tekst, i) => {
    const meld = (regel) => out.push({ file: rel, line: i + 1, regel, tekst: tekst.trim() });

    const inner = tekst.match(/\.(innerHTML|outerHTML)\s*\+?=(?!=)\s*(.*)$/);
    if (inner && !isLiteralZonderVariabelen(inner[2])) meld('innerHTML met variabele inhoud');
    if (/\binsertAdjacentHTML\s*\(|\bdocument\.write(ln)?\s*\(/.test(tekst)) meld('ruwe HTML-invoer');
    if (/\beval\s*\(/.test(tekst)) meld('eval');
    if (/\bnew\s+Function\b/.test(tekst)) meld('new Function');
    if (/<script\b[^>]*\bsrc\s*=\s*["']?\s*(https?:)?\/\//i.test(tekst)) meld('externe script-src');

    for (const m of tekst.matchAll(/\bfetch\s*\(\s*(['"`])([^'"`]*)\1/g)) {
      if (!m[2].startsWith('https://script.google.com/')) meld('fetch buiten script.google.com');
    }
    if (web && /\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/.test(tekst)) meld('netwerk buiten fetch');
    if (web && rel !== NAVIGATIELIJST && /\b(wa\.me|maps\.google\.com)\b/.test(tekst)) meld('vaste link buiten de navigatielijst');
  });
}

export async function checkBronregels(root) {
  const out = [];
  for (const top of ['src', 'scripts', 'test', 'data']) {
    for await (const { full, rel } of walk(path.join(root, top), root)) {
      const regels = (await readFile(full, 'utf8')).split(/\r?\n/);
      if (rel.startsWith('src/') && !rel.endsWith('.json')) controleerCode(rel, regels, out);
      if (SECRET_SKIP.has(rel)) continue;
      regels.forEach((tekst, i) => {
        if (GEHEIMEN.some((re) => re.test(tekst))) out.push({ file: rel, line: i + 1, regel: 'geheimen-achtige string', tekst: tekst.trim().slice(0, 60) });
      });
    }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const fouten = await checkBronregels(root);
  for (const f of fouten) console.error(`${f.file}:${f.line}  ${f.regel}  ${f.tekst}`);
  if (fouten.length) { console.error(`bronregels: ${fouten.length} overtreding(en)`); process.exit(1); }
  console.log('bronregels: groen');
}
