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
import { APP_ADRES } from '../../src/shared/uitrol.js';
import { opzetDialoog } from '../../src/server/gas/dialoog.js';

const WEBAPP_ID = 'AKfycbx1234567890abcdefghij';
const EXEC = `https://script.google.com/macros/s/${WEBAPP_ID}/exec`;

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

// `url` is wat ScriptApp.getService().getUrl() teruggeeft; `prompts` zijn de antwoorden op ui.prompt, in volgorde
// ({ knop, tekst }); daarna antwoordt elke prompt met OK en `antwoord`.
function gasOmgeving({ kapot = false, antwoord = '1', url = EXEC, prompts = [] } = {}) {
  const ss = nepSpreadsheet();
  const menu = [];
  const meldingen = [];
  const dialogen = [];
  const vragen = [];
  const wachtrij = [...prompts];
  const eigenschappen = new Map();
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
          alert: (...a) => { meldingen.push(a.join(' | ')); },
          prompt: (...a) => {
            vragen.push(a.join(' | '));
            const p = wachtrij.shift() || { knop: 'OK', tekst: antwoord };
            return { getSelectedButton: () => p.knop, getResponseText: () => p.tekst };
          },
          showModalDialog: (uitvoer, titel) => { dialogen.push({ ...uitvoer, titel }); },
          Button: { OK: 'OK', CANCEL: 'CANCEL' },
          ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL' },
        };
        return ui;
      },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (eigenschappen.has(k) ? eigenschappen.get(k) : null), setProperty: (k, w) => { eigenschappen.set(k, w); }, deleteProperty: (k) => { eigenschappen.delete(k); } }) },
    ScriptApp: { getService: () => ({ getUrl: () => { if (url instanceof Error) throw url; return url; } }) },
    HtmlService: { createHtmlOutput: (html) => ({ html, setWidth(b) { this.breedte = b; return this; }, setHeight(h) { this.hoogte = h; return this; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (tekst) => ({ tekst, setMimeType(m) { this.mime = m; return this; } }),
    },
  };
  vm.createContext(ctx);
  return { ctx, ss, menu, meldingen, dialogen, vragen, eigenschappen };
}

// De setupcode uit de dialoog van Groep opzetten: in de opzetlink, of zonder APP_ADRES in het veld Setupcode.
const codeUit = (dialoog) => (/code=([A-Z2-9]{8})/.exec(dialoog.html) || /id="code"[^>]*value="([A-Z2-9]{8})"/.exec(dialoog.html))?.[1];
const opzetVerzoek = (code, eigenaar = 0) => JSON.stringify({ actie: 'groepOpzetten', apiVersie: 2, data: { setupcode: code, groepsnaam: 'Test', leden: [{ voornaam: 'A', woonplaats: '' }, { voornaam: 'B', woonplaats: '' }], eigenaar, wachtwoord: 'lang-genoeg-wachtwoord' } });

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
  assert.deepEqual(JSON.parse(post.tekst), { ok: true, data: { apiVersie: 2, opgezet: false } });
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

test('GRP-1: het menu heeft Groep opzetten, Beheerlink maken, Beheerwachtwoord resetten en Uitleg', async () => {
  const { ctx, menu } = await laad();
  vm.runInContext('onOpen()', ctx);
  assert.equal(menu[0], 'Weekendje weg');
  assert.deepEqual(menu.slice(1), ['menuSetupcode', 'menuBeheerlink', 'menuWachtwoordResetten', 'menuUitleg', 'menuLogLegen']);
});

test('GRP-1: de menu-items heten Groep opzetten, Beheerlink maken, Beheerwachtwoord resetten en Uitleg', async () => {
  const labels = [];
  const { ctx } = await laad();
  const ui = ctx.SpreadsheetApp.getUi();
  ctx.SpreadsheetApp.getUi = () => ({ ...ui, createMenu() { return this; }, addItem(label) { labels.push(label); return this; }, addSeparator() { return this; } });
  vm.runInContext('onOpen()', ctx);
  assert.deepEqual(labels, ['Groep opzetten', 'Beheerlink maken', 'Beheerwachtwoord resetten', 'Uitleg', 'Log legen']);
  assert.ok(!(await bundel()).includes('Setupcode tonen'));
});

test('GRP-6 AAN-28: Groep opzetten toont de opzetlink in een dialoog en bewaart alleen de hash; de bundel kan er een groep mee opzetten', async () => {
  const { ctx, meldingen, dialogen, vragen, eigenschappen } = await laad();
  vm.runInContext('menuSetupcode()', ctx);
  assert.equal(dialogen.length, 1, meldingen.join('\n'));
  assert.equal(vragen.length, 0); // getUrl() eindigt op /exec: er wordt niets gevraagd
  const code = codeUit(dialogen[0]);
  assert.ok(code, dialogen[0].html);
  // §7.18.4: precies de dialoog uit dialoog.js, met APP_ADRES de opzetlink en anders code en webapp-URL.
  assert.equal(dialogen[0].titel, 'Groep opzetten');
  assert.equal(dialogen[0].html, opzetDialoog({ appAdres: APP_ADRES, webappId: WEBAPP_ID, code, minuten: 30 }));
  assert.ok(dialogen[0].breedte > 0 && dialogen[0].hoogte > 0);
  if (APP_ADRES) assert.ok(dialogen[0].html.includes(`${APP_ADRES}#/opzetten?b=${WEBAPP_ID}&amp;code=${code}`));
  assert.ok(!eigenschappen.get('setupcode').includes(code));
  ctx.verzoek = opzetVerzoek(code, 1);
  const r = JSON.parse(vm.runInContext('doPost({ postData: { contents: verzoek } })', ctx).tekst);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(eigenschappen.has('setupcode'), false);
  // GRP-3, GRP-6: de tweede keer wordt geweigerd; het menu zegt dat de groep al is opgezet en maakt geen code.
  assert.equal(JSON.parse(vm.runInContext('doPost({ postData: { contents: verzoek } })', ctx).tekst).fout, 'gesloten');
  vm.runInContext('menuSetupcode()', ctx);
  assert.match(meldingen.at(-1), /al opgezet/);
  assert.equal(dialogen.length, 1);
  assert.equal(eigenschappen.has('setupcode'), false);
});

test('AAN-79 §7.18.2: het webapp-ID komt uit getUrl(), dan uit de eigenschap webappId, dan uit één vraag', async () => {
  const anderId = 'AKfycbxANDER-0987654321_zyxwv';
  const ander = `https://script.google.com/macros/s/${anderId}/exec`;
  const dev = `https://script.google.com/macros/s/${WEBAPP_ID}/dev`;
  const idUit = (d) => (/[?&]b=([A-Za-z0-9_-]+)/.exec(d.html.split('&amp;').join('&')) || /macros\/s\/([A-Za-z0-9_-]+)\/exec/.exec(d.html))?.[1];

  // 1. getUrl() op /exec wint van de eigenschap.
  let omg = await laad();
  omg.eigenschappen.set('webappId', anderId);
  vm.runInContext('menuSetupcode()', omg.ctx);
  assert.equal(idUit(omg.dialogen[0]), WEBAPP_ID);
  assert.equal(omg.vragen.length, 0);

  // 2. getUrl() geeft /dev, niets of een fout: de eigenschap, zonder vraag.
  for (const url of [dev, null, '', new Error('geen dienst')]) {
    omg = await laad({ url });
    omg.eigenschappen.set('webappId', anderId);
    vm.runInContext('menuSetupcode()', omg.ctx);
    assert.equal(idUit(omg.dialogen[0]), anderId, String(url));
    assert.equal(omg.vragen.length, 0);
  }

  // 3. Geen van beide: vragen. Een /dev-URL wordt geweigerd met uitleg en opnieuw gevraagd; het ID wordt bewaard.
  omg = await laad({ url: null, prompts: [{ knop: 'OK', tekst: dev }, { knop: 'OK', tekst: 'https://voorbeeld.nl/x' }, { knop: 'OK', tekst: ` ${ander} ` }] });
  vm.runInContext('menuSetupcode()', omg.ctx);
  assert.equal(omg.vragen.length, 3);
  assert.doesNotMatch(omg.vragen[0], /testlink/);
  assert.match(omg.vragen[1], /testlink die eindigt op \/dev/);
  assert.match(omg.vragen[2], /geen webapp-URL/);
  assert.equal(omg.eigenschappen.get('webappId'), anderId);
  assert.equal(idUit(omg.dialogen[0]), anderId);
  // De volgende keer vraagt het menu niets meer.
  vm.runInContext('menuSetupcode()', omg.ctx);
  assert.equal(omg.vragen.length, 3);
  assert.equal(omg.dialogen.length, 2);

  // 4. Annuleren stopt zonder code en zonder dialoog.
  omg = await laad({ url: null, prompts: [{ knop: 'OK', tekst: 'onzin' }, { knop: 'CANCEL', tekst: ander }] });
  vm.runInContext('menuSetupcode()', omg.ctx);
  assert.equal(omg.vragen.length, 2);
  assert.equal(omg.dialogen.length, 0);
  assert.equal(omg.eigenschappen.has('setupcode'), false);
  assert.equal(omg.eigenschappen.has('webappId'), false);

  // 5. Beheerlink maken gebruikt dezelfde volgorde zonder te vragen.
  vm.runInContext('menuBeheerlink()', omg.ctx);
  assert.equal(omg.vragen.length, 2);
  assert.match(omg.meldingen.at(-1), /Implementeer het script eerst/);
});

test('GRP-8 AAN-45: Beheerlink maken toont de volledige link (zonder APP_ADRES het fragment), Beheerwachtwoord resetten maakt het wachtwoord leeg, Uitleg noemt de nieuwe route', async () => {
  const { ctx, meldingen, dialogen } = await laad();
  vm.runInContext('menuSetupcode()', ctx);
  ctx.verzoek = opzetVerzoek(codeUit(dialogen[0]));
  assert.equal(JSON.parse(vm.runInContext('doPost({ postData: { contents: verzoek } })', ctx).tekst).ok, true);
  vm.runInContext('menuBeheerlink()', ctx);
  const fragment = /#b=AKfycbx1234567890abcdefghij&beheer=[A-Za-z0-9_-]{22}/;
  if (APP_ADRES) {
    assert.equal(dialogen.length, 2);
    assert.equal(dialogen[1].titel, 'Beheerlink');
    const html = dialogen[1].html.split('&amp;').join('&');
    assert.match(html, fragment);
    assert.ok(html.includes(`readonly value="${APP_ADRES}#b=${WEBAPP_ID}&beheer=`));
    assert.doesNotMatch(dialogen[1].html.split(APP_ADRES).join(''), /http/);
  } else {
    assert.match(meldingen.at(-1), fragment);
  }
  vm.runInContext('menuWachtwoordResetten()', ctx);
  assert.match(meldingen.at(-1), /wachtwoord is leeg/);
  vm.runInContext('menuUitleg()', ctx);
  assert.match(meldingen.at(-1), /kies hier Groep opzetten en klik op de link/);
  assert.match(meldingen.at(-1), /nieuwe versie op de bestaande implementatie/);
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
