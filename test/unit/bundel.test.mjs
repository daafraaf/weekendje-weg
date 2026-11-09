// NFR-20: dist/gas bevat één Apps Script-bestand met de globale ingangen; appsscript.json volgt §3.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGas } from '../../scripts/build.mjs';
import { INGANGEN } from '../../src/server/gas/ingangen.js';
import { nepSpreadsheet, nepUtilities } from './nep-gas.mjs';
import { hashGeheim } from '../../src/server/crypto.js';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Eigen uitvoermap: bronregels.test.mjs bouwt tegelijk naar dist/.
const gasDir = await mkdtemp(path.join(tmpdir(), 'ww-gas-'));
after(() => rm(gasDir, { recursive: true, force: true }));

let code;
async function bundel() {
  if (!code) {
    await buildGas(gasDir);
    code = await readFile(path.join(gasDir, 'Code.js'), 'utf8');
  }
  return code;
}

function gasOmgeving({ kapot = false } = {}) {
  const ss = nepSpreadsheet();
  const menu = [];
  const ctx = {
    console: { error: () => {}, log: () => {} },
    Utilities: nepUtilities(),
    SpreadsheetApp: {
      getActive: () => { if (kapot) throw new Error('geen spreadsheet'); return ss; },
      flush: () => {},
      getUi: () => {
        const ui = {
          createMenu: (naam) => { menu.push(naam); return ui; },
          addItem: (label, fn) => { menu.push(fn); return ui; },
          addSeparator: () => ui,
          addToUi: () => {},
          alert: () => {},
        };
        return ui;
      },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (tekst) => ({ tekst, setMimeType(m) { this.mime = m; return this; } }),
    },
  };
  vm.createContext(ctx);
  return { ctx, ss, menu };
}

async function laad(opties) {
  const omg = gasOmgeving(opties);
  vm.runInContext(await bundel(), omg.ctx, { filename: 'Code.js' });
  return omg;
}

test('NFR-20: dist/gas bevat precies Code.js en appsscript.json', async () => {
  await bundel();
  assert.deepEqual((await readdir(gasDir)).sort(), ['Code.js', 'appsscript.json']);
});

test('NFR-20: elke ingang staat als globale functie in de bundel', async () => {
  const c = await bundel();
  assert.match(c, /^var WW = /m);
  for (const naam of ['doPost', 'doGet', 'onOpen', ...INGANGEN]) {
    assert.match(c, new RegExp(`^function ${naam}\\(e\\)\\{return WW\\.${naam}\\(e\\)\\}$`, 'm'), naam);
  }
  assert.doesNotMatch(c, /^\s*(import|export)\s/m);
});

test('NFR-20: appsscript.json volgt §3', async () => {
  for (const bestand of [path.join(repo, 'appsscript.json'), path.join(gasDir, 'appsscript.json')]) {
    const j = JSON.parse(await readFile(bestand, 'utf8'));
    assert.equal(j.runtimeVersion, 'V8');
    assert.equal(j.timeZone, 'Europe/Amsterdam');
    assert.deepEqual(j.webapp, { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' });
    assert.deepEqual(j.oauthScopes.sort(), [
      'https://www.googleapis.com/auth/script.container.ui',
      'https://www.googleapis.com/auth/spreadsheets.currentonly',
    ]);
  }
});

test('NFR-20: doPost en doGet in de bundel geven JSON via ContentService', async () => {
  const { ctx } = await laad();
  const post = vm.runInContext('doPost({ postData: { contents: \'{"actie":"status"}\' } })', ctx);
  assert.equal(post.mime, 'application/json');
  assert.deepEqual(JSON.parse(post.tekst), { ok: true, data: { apiVersie: 1, opgezet: false } });
  const get = vm.runInContext('doGet({})', ctx);
  assert.equal(JSON.parse(get.tekst).ok, true);
  assert.equal(JSON.parse(vm.runInContext('doPost(undefined)', ctx).tekst).fout, 'ongeldig');
});

test('NFR-20: een onverwachte fout in de bundel geeft JSON met code fout', async () => {
  const { ctx } = await laad({ kapot: true });
  const r = vm.runInContext('doPost({ postData: { contents: \'{"actie":"status"}\' } })', ctx);
  assert.equal(r.mime, 'application/json');
  assert.equal(JSON.parse(r.tekst).fout, 'fout');
});

test('NFR-20: onOpen zet het menu met de menufuncties', async () => {
  const { ctx, menu } = await laad();
  vm.runInContext('onOpen()', ctx);
  assert.equal(menu[0], 'Weekendje weg');
  for (const fn of menu.slice(1)) assert.ok(INGANGEN.includes(fn), fn);
});

test('NFR-16: het Sheet-menu leegt het log', async () => {
  const { ctx, ss } = await laad();
  const blad = ss.insertSheet('Log');
  blad.getRange(1, 1, 1, 5).setNumberFormat('@').setValues([['tijd', 'actie', 'wie', 'editieId', 'detail']]);
  blad.getRange(2, 1, 1, 5).setNumberFormat('@').setValues([['t', 'a', 'w', 'e', '']]);
  vm.runInContext('menuLogLegen()', ctx);
  assert.equal(blad.cellen.length, 1);
});

test('NFR-1: de hashtestvector is gelijk in de GAS-bundel en in Node', async () => {
  const { ctx } = await laad();
  const gas = vm.runInContext('WW.hashGeheimGas("123456", "zout-vast-01", 1000)', ctx);
  assert.equal(gas, hashGeheim(nodeSha256, '123456', 'zout-vast-01', 1000));
  assert.equal(gas, '2TZS1uDOme0uox-wR6hcCtnYDmWtONyTG4CD23hKz1E');
});
