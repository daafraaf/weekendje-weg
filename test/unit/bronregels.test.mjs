import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBronregels, NAVIGATIELIJST } from '../../scripts/check-bronregels.mjs';
import { build } from '../../scripts/build.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function metBestand(rel, inhoud, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'ww-bron-'));
  try {
    await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await writeFile(path.join(dir, rel), inhoud);
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
const regels = async (rel, inhoud) => (await metBestand(rel, inhoud, checkBronregels)).map((f) => f.regel);

test('NFR-3: de echte repo is schoon', async () => {
  assert.deepEqual(await checkBronregels(repo), []);
});

test('NFR-3: innerHTML met variabele inhoud faalt, letterlijke tekst niet', async () => {
  assert.deepEqual(await regels('src/web/a.js', 'el.innerHTML = x;\n'), ['innerHTML met variabele inhoud']);
  assert.deepEqual(await regels('src/web/a.js', 'el.innerHTML = `<b>${x}</b>`;\n'), ['innerHTML met variabele inhoud']);
  assert.deepEqual(await regels('src/web/a.js', "el.innerHTML = '';\n"), []);
});

test('NFR-3: eval en new Function falen', async () => {
  assert.deepEqual(await regels('src/web/a.js', 'eval("1");\n'), ['eval']);
  assert.deepEqual(await regels('src/server/a.js', 'const f = new Function("return 1");\n'), ['new Function']);
});

test('NFR-3: externe script-src faalt, eigen script niet', async () => {
  assert.deepEqual(await regels('src/web/index.html', '<script src="https://cdn.example/x.js"></script>\n'), ['externe script-src']);
  assert.deepEqual(await regels('src/web/index.html', '<script src="//cdn.example/x.js"></script>\n'), ['externe script-src']);
  assert.deepEqual(await regels('src/web/index.html', '<script type="module" src="app.js"></script>\n'), []);
});

test('NFR-3: fetch alleen naar script.google.com', async () => {
  assert.deepEqual(await regels('src/web/a.js', "fetch('https://example.com/x');\n"), ['fetch buiten script.google.com']);
  assert.deepEqual(await regels('src/web/a.js', "fetch('https://script.google.com/macros/s/x/exec');\n"), []);
});

test('NFR-3: vaste links alleen in de navigatielijst', async () => {
  assert.deepEqual(await regels('src/web/a.js', "const u = 'https://wa.me/1';\n"), ['vaste link buiten de navigatielijst']);
  assert.deepEqual(await regels(NAVIGATIELIJST, "export const wa = 'https://wa.me/';\n"), []);
});

test('NFR-3: geheimen-achtige strings falen', async () => {
  assert.deepEqual(await regels('src/web/a.js', 'const pass' + 'word = "abcdefgh1234";\n'), ['geheimen-achtige string']);
  assert.deepEqual(await regels('scripts/x.mjs', '// -----BEGIN RSA PRIVATE ' + 'KEY-----\n'), ['geheimen-achtige string']);
});

test('NFR-4: gebouwde index.html bevat de CSP ongewijzigd', async () => {
  await build();
  const html = await readFile(path.join(repo, 'dist/web/index.html'), 'utf8');
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)?.[1];
  assert.equal(csp, "default-src 'self'; connect-src https://script.google.com https://script.googleusercontent.com; img-src 'self' data:; style-src 'self'; script-src 'self'; manifest-src 'self'; worker-src 'self'");
});

test('AAN-37: de navigatielijst is src/web/navigatie.js', () => {
  assert.equal(NAVIGATIELIJST, 'src/web/navigatie.js');
});
