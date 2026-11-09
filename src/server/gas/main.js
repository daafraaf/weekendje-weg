// Apps Script-ingang (spec §3). Dunne adapter: doPost en doGet geven altijd JSON terug.
/* global SpreadsheetApp, LockService, Utilities, ContentService */
import { maakApi, SLOT_WACHTTIJD_MS } from '../api.js';
import { foutAntwoord } from '../fouten.js';
import { mag } from '../rechten.js';
import { hashGeheim } from '../crypto.js';
import { maakSheetStore } from './sheetstore.js';
import { maakGasRandom, maakGasSha256 } from './random.js';

function maakDeps() {
  const sha256 = maakGasSha256(Utilities);
  const random = maakGasRandom(Utilities);
  const nu = () => new Date();
  const store = maakSheetStore(SpreadsheetApp.getActive(), { flush: () => SpreadsheetApp.flush(), random, nu });
  let slot = null;
  const lock = {
    tryLock(ms) { slot = LockService.getScriptLock(); return slot.tryLock(ms); },
    releaseLock() { if (slot) slot.releaseLock(); slot = null; },
  };
  return { store, lock, sha256, random, nu, logFout: (e) => console.error(String((e && e.stack) || e)) };
}

function json(antwoord) {
  return ContentService.createTextOutput(JSON.stringify(antwoord)).setMimeType(ContentService.MimeType.JSON);
}

export function doPost(e) {
  let antwoord;
  try {
    const tekst = e && e.postData ? e.postData.contents : '';
    antwoord = maakApi(maakDeps()).verwerk(tekst);
  } catch (err) {
    console.error(String((err && err.stack) || err));
    antwoord = foutAntwoord('fout');
  }
  return json(antwoord);
}

export function doGet() {
  let antwoord;
  try {
    antwoord = maakApi(maakDeps()).verwerkGet();
  } catch (err) {
    console.error(String((err && err.stack) || err));
    antwoord = foutAntwoord('fout');
  }
  return json(antwoord);
}

export function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Weekendje weg')
    .addItem('Setupcode tonen', 'menuSetupcode')
    .addItem('Beheerlink maken', 'menuBeheerlink')
    .addItem('Wachtwoord resetten', 'menuWachtwoordResetten')
    .addSeparator()
    .addItem('Log legen', 'menuLogLegen')
    .addToUi();
}

const nogNiet = () => SpreadsheetApp.getUi().alert('Dit menu-item komt in een volgende versie van het script.');
export const menuSetupcode = nogNiet;
export const menuBeheerlink = nogNiet;
export const menuWachtwoordResetten = nogNiet;

// NFR-16: het Sheet-menu kan het log legen.
export function menuLogLegen() {
  const ui = SpreadsheetApp.getUi();
  if (!mag('eigenaar', 'logLegen')) return;
  const { store, lock } = maakDeps();
  if (!lock.tryLock(SLOT_WACHTTIJD_MS)) { ui.alert('Even druk, probeer het opnieuw.'); return; }
  try {
    store.nieuwVerzoek();
    store.leeg('Log');
    store.flush();
  } finally {
    lock.releaseLock();
  }
  ui.alert('Het log is leeg.');
}

// Voor de hashtestvector in test/unit/bundel.test.mjs: dezelfde hash als in Node.
export function hashGeheimGas(geheim, salt, iteraties) {
  return hashGeheim(maakGasSha256(Utilities), geheim, salt, iteraties);
}
