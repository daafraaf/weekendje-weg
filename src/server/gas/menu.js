// Sheet-menu "Weekendje weg" (spec GRP-1, GRP-6, GRP-8, §7.1.9, §7.1.10, §7.18, NFR-16). Dunne laag: de logica staat in acties/opzet.js.
/* global SpreadsheetApp, ScriptApp, PropertiesService, HtmlService */
import { SLOT_WACHTTIJD_MS } from '../api.js';
import { mag } from '../rechten.js';
import { ApiFout } from '../fouten.js';
import { maakDeps } from './deps.js';
import { APP_ADRES } from '../../shared/uitrol.js';
import { leesScriptUrl, scriptIdGeldig } from '../../shared/links.js';
import { opzetDialoog, beheerDialoog, DIALOOG_BREEDTE, DIALOOG_HOOGTE } from './dialoog.js';
import { groepOpgezet, setupcodeMaken, beheerlinkVoorLid, wachtwoordResetten, SETUPCODE_GELDIG_MS } from '../acties/opzet.js';

// GRP-1: Groep opzetten, Beheerlink maken, Beheerwachtwoord resetten, Uitleg (plus Log legen, NFR-16).
export function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Weekendje weg')
    .addItem('Groep opzetten', 'menuSetupcode')
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

const WEBAPP_ID = 'webappId';

// AAN-79: het webapp-ID komt eerst uit getUrl() als die op /exec eindigt, dan uit de eigenschap webappId,
// en anders vraagt het menu één keer de webapp-URL (§7.18.2). Het is niet zeker wat getUrl() in de nieuwe
// Apps Script-editor teruggeeft. Zonder `vragen` (Beheerlink maken) stopt het na de eigenschap. Geeft het ID of null.
function webappId(ui, vragen) {
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch { url = ''; }
  const uitDienst = leesScriptUrl(url);
  if (uitDienst.scriptId) return uitDienst.scriptId;
  const eigenschappen = PropertiesService.getScriptProperties();
  const bewaard = eigenschappen.getProperty(WEBAPP_ID);
  if (scriptIdGeldig(bewaard)) return bewaard;
  if (!vragen) return null;
  const uitleg = 'Plak de webapp-URL van dit script. Je vindt hem in Apps Script bij Implementeren, Implementaties beheren. Hij eindigt op /exec. Nog geen implementatie? Kies daar eerst Implementeren en Nieuwe implementatie.';
  let fout = '';
  for (;;) {
    const r = ui.prompt('Webapp-URL', fout ? `${fout}\n\n${uitleg}` : uitleg, ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return null;
    const gelezen = leesScriptUrl(r.getResponseText());
    if (gelezen.scriptId) { eigenschappen.setProperty(WEBAPP_ID, gelezen.scriptId); return gelezen.scriptId; }
    fout = gelezen.fout;
  }
}

// §7.18.4: de dialoog valt onder de scope script.container.ui.
function toonDialoog(ui, titel, html) {
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(DIALOOG_BREEDTE).setHeight(DIALOOG_HOOGTE), titel);
}

const AL_OPGEZET = 'Deze groep is al opgezet. Een nieuwe organisator krijgt toegang met Beheerlink maken.';

// GRP-6: eerst het webapp-ID (ook bij een opgezette groep, zodat Beheerlink maken het daarna kent), pas daarna
// de setupcode; Annuleren stopt zonder code.
export function menuSetupcode() {
  const ui = SpreadsheetApp.getUi();
  if (!mag('eigenaar', 'setupcodeTonen')) return;
  const id = webappId(ui, true);
  if (!id) return;
  const code = metSlot(ui, ({ store, deps }) => {
    if (groepOpgezet(store)) throw new ApiFout('gesloten', AL_OPGEZET);
    return setupcodeMaken(deps);
  });
  if (code) toonDialoog(ui, 'Groep opzetten', opzetDialoog({ appAdres: APP_ADRES, webappId: id, code, minuten: SETUPCODE_GELDIG_MS / 60000 }));
}

export function menuBeheerlink() {
  const ui = SpreadsheetApp.getUi();
  if (!mag('eigenaar', 'beheerlinkMaken')) return;
  const id = webappId(ui, false);
  if (!id) { ui.alert('Implementeer het script eerst als webapp (Implementeren, Nieuwe implementatie) en probeer het dan opnieuw. Werkt dat niet, kies dan één keer Groep opzetten en plak daar de webapp-URL; daarna kent Beheerlink maken hem ook.'); return; }
  const uit = metSlot(ui, (h) => {
    const leden = h.store.lees('Leden').filter((l) => l.actief);
    if (!leden.length) throw new ApiFout('gesloten', 'Zet eerst de groep op in de app.');
    const i = kies(ui, 'Beheerlink maken voor', leden.map((l) => `${l.voornaam} (${l.woonplaats})`));
    if (i < 0) return null;
    return { voornaam: leden[i].voornaam, token: beheerlinkVoorLid(h, leden[i].id) };
  });
  if (!uit) return;
  // AAN-45, GRP-8: met APP_ADRES de volledige link in de dialoog, zonder het fragment om achter het adres van de app te zetten.
  if (APP_ADRES) { toonDialoog(ui, 'Beheerlink', beheerDialoog({ appAdres: APP_ADRES, webappId: id, token: uit.token, voornaam: uit.voornaam })); return; }
  const tekst = `#b=${id}&beheer=${uit.token}`;
  ui.alert('Beheerlink', `Zet dit achter het adres van de app en geef het door aan het lid. Hij is alleen nu zichtbaar. Het lid kiest bij eerste gebruik een eigen wachtwoord.\n\n${tekst}`, ui.ButtonSet.OK);
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
    'Groep opzetten: implementeer het script als webapp, kies hier Groep opzetten en klik op de link. De app opent dan met je Sheet al gekoppeld; je geeft de groep een naam en voegt de leden toe.\n\n'
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
