// Apps Script-ingang (spec §3). Dunne adapter: doPost en doGet geven altijd JSON terug.
/* global ContentService, Utilities */
import { maakApi } from '../api.js';
import { foutAntwoord } from '../fouten.js';
import { hashGeheim } from '../crypto.js';
import { maakDeps } from './deps.js';
import { maakGasSha256 } from './random.js';

export { onOpen, menuSetupcode, menuBeheerlink, menuWachtwoordResetten, menuUitleg, menuLogLegen } from './menu.js';

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

// Voor de hashtestvector in test/unit/bundel.test.mjs: dezelfde hash als in Node.
export function hashGeheimGas(geheim, salt, iteraties) {
  return hashGeheim(maakGasSha256(Utilities), geheim, salt, iteraties);
}
