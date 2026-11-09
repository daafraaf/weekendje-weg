// Sheet-menu "Weekendje weg" (spec GRP-1, §7.1.9, §7.1.10, NFR-16). Dunne laag: de logica staat in acties/opzet.js.
/* global SpreadsheetApp, ScriptApp */
import { SLOT_WACHTTIJD_MS } from '../api.js';
import { mag } from '../rechten.js';
import { ApiFout } from '../fouten.js';
import { maakDeps } from './deps.js';
import { groepOpgezet, setupcodeMaken, beheerlinkVoorLid, wachtwoordResetten, SETUPCODE_GELDIG_MS } from '../acties/opzet.js';

// GRP-1: Setupcode tonen, Beheerlink maken, Beheerwachtwoord resetten, Uitleg (plus Log legen, NFR-16).
export function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Weekendje weg')
    .addItem('Setupcode tonen', 'menuSetupcode')
    .addItem('Beheerlink maken', 'menuBeheerlink')
    .addItem('Beheerwachtwoord resetten', 'menuWachtwoordResetten')
    .addItem('Uitleg', 'menuUitleg')
    .addSeparator()
    .addItem('Log legen', 'menuLogLegen')
    .addToUi();
}

// Draait `werk` onder het scriptslot met een verse Store; meldt een fout aan de eigenaar.
function metSlot(ui, werk) {
  const deps = maakDeps();
  if (!deps.lock.tryLock(SLOT_WACHTTIJD_MS)) { ui.alert('Even druk, probeer het opnieuw.'); return undefined; }
  try {
    deps.store.nieuwVerzoek();
    const uit = werk({ store: deps.store, deps });
    deps.store.flush();
    return uit;
  } catch (e) {
    if (e instanceof ApiFout) { ui.alert(e.melding); return undefined; }
    throw e;
  } finally {
    deps.lock.releaseLock();
  }
}

// Laat de eigenaar een regel kiezen uit een genummerde lijst; geeft de index of -1.
function kies(ui, titel, regels) {
  const r = ui.prompt(titel, `${regels.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nTyp het nummer:`, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return -1;
  const n = parseInt(r.getResponseText(), 10);
  return Number.isInteger(n) && n >= 1 && n <= regels.length ? n - 1 : -1;
}

// AAN-45: het script kent de Pages-URL niet; de beheerlink is het fragment achter het adres van de app.
function scriptId() {
  try {
    const m = /\/macros\/s\/([A-Za-z0-9_-]{20,120})\/exec$/.exec(ScriptApp.getService().getUrl() || '');
    return m ? m[1] : null;
  } catch { return null; }
}

export function menuSetupcode() {
  const ui = SpreadsheetApp.getUi();
  if (!mag('eigenaar', 'setupcodeTonen')) return;
  const code = metSlot(ui, ({ store, deps }) => {
    if (groepOpgezet(store)) throw new ApiFout('gesloten', 'Deze groep is al opgezet.');
    return setupcodeMaken(deps);
  });
  if (code) ui.alert('Setupcode', `${code}\n\nGeldig voor ${SETUPCODE_GELDIG_MS / 60000} minuten en maar één keer te gebruiken. Plak hem in de opzetwizard van de app. Een nieuwe code maakt de vorige ongeldig.`, ui.ButtonSet.OK);
}

export function menuBeheerlink() {
  const ui = SpreadsheetApp.getUi();
  if (!mag('eigenaar', 'beheerlinkMaken')) return;
  const id = scriptId();
  if (!id) { ui.alert('Implementeer het script eerst als webapp (Implementeren, Nieuwe implementatie) en probeer het dan opnieuw.'); return; }
  const tekst = metSlot(ui, (h) => {
    const leden = h.store.lees('Leden').filter((l) => l.actief);
    if (!leden.length) throw new ApiFout('gesloten', 'Zet eerst de groep op in de app.');
    const i = kies(ui, 'Beheerlink maken voor', leden.map((l) => `${l.voornaam} (${l.woonplaats})`));
    if (i < 0) return null;
    return `#b=${id}&beheer=${beheerlinkVoorLid(h, leden[i].id)}`;
  });
  if (tekst) ui.alert('Beheerlink', `Zet dit achter het adres van de app en geef het door aan het lid. Hij is alleen nu zichtbaar. Het lid kiest bij eerste gebruik een eigen wachtwoord.\n\n${tekst}`, ui.ButtonSet.OK);
}

export function menuWachtwoordResetten() {
  const ui = SpreadsheetApp.getUi();
  if (!mag('eigenaar', 'wachtwoordResetten')) return;
  const klaar = metSlot(ui, (h) => {
    const leden = new Map(h.store.lees('Leden').map((l) => [l.id, l.voornaam]));
    const links = h.store.lees('Beheerlinks').filter((b) => b.actief);
    if (!links.length) throw new ApiFout('gesloten', 'Er zijn nog geen beheerlinks.');
    const i = kies(ui, 'Beheerwachtwoord resetten van', links.map((b) => `Beheerlink van ${leden.get(b.lidId) || 'onbekend lid'}`));
    if (i < 0) return false;
    wachtwoordResetten(h, links[i].id);
    return true;
  });
  if (klaar) ui.alert('Het wachtwoord is leeg. Het lid kiest bij de volgende keer inloggen een nieuw wachtwoord.');
}

export function menuUitleg() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Uitleg',
    'Groep opzetten: kies hier Setupcode tonen en plak de code in de opzetwizard van de app, samen met de webapp-URL (eindigt op /exec).\n\n'
    + 'Nieuwe organisator: kies Beheerlink maken. Wachtwoord kwijt: kies Beheerwachtwoord resetten.\n\n'
    + 'Het script bijwerken doe je altijd als nieuwe versie op de bestaande implementatie, nooit als nieuwe implementatie: anders werken alle links niet meer.',
    ui.ButtonSet.OK);
}

// NFR-16: het Sheet-menu kan het log legen.
export function menuLogLegen() {
  const ui = SpreadsheetApp.getUi();
  if (!mag('eigenaar', 'logLegen')) return;
  const klaar = metSlot(ui, ({ store }) => { store.leeg('Log'); return true; });
  if (klaar) ui.alert('Het log is leeg.');
}
