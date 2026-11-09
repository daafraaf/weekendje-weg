// Afhankelijkheden van de API in Apps Script: Sheet, slot, willekeur, klok en scripteigenschappen.
/* global SpreadsheetApp, LockService, Utilities, PropertiesService */
import { ALLE_HANDLERS } from '../acties/index.js';
import { maakSheetStore } from './sheetstore.js';
import { maakGasRandom, maakGasSha256 } from './random.js';

export function maakDeps() {
  const sha256 = maakGasSha256(Utilities);
  const random = maakGasRandom(Utilities);
  const nu = () => new Date();
  const store = maakSheetStore(SpreadsheetApp.getActive(), { flush: () => SpreadsheetApp.flush(), random, nu });
  let slot = null;
  const lock = {
    tryLock(ms) { slot = LockService.getScriptLock(); return slot.tryLock(ms); },
    releaseLock() { if (slot) slot.releaseLock(); slot = null; },
  };
  // Setupcode: alleen hash en verlooptijd, in de scripteigenschappen (spec §7.1.9).
  const eigenschappen = {
    lees: (k) => PropertiesService.getScriptProperties().getProperty(k),
    zet: (k, w) => { PropertiesService.getScriptProperties().setProperty(k, String(w)); },
    wis: (k) => { PropertiesService.getScriptProperties().deleteProperty(k); },
  };
  return { store, lock, sha256, random, nu, eigenschappen, handlers: ALLE_HANDLERS, logFout: (e) => console.error(String((e && e.stack) || e)) };
}
