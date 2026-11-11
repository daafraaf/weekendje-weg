import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { inMenu, menuItems, MENU, BEHEER_SCHERMEN, aftelTekst, eersteActie } from '../../src/shared/start.js';
import { STAPPEN, STAPNAMEN, komtInStap } from '../../src/shared/stappen.js';
import { stapTekst } from '../../src/shared/whatsapp.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';

function opzet(opties = {}) {
  const demo = maakDemo({ antwoorden: true, stap: 'invullen', ...opties });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const wijzig = (patch) => { nep.store.nieuwVerzoek(); nep.store.werkBij('Edities', DEMO_EDITIE_ID, patch, nep.store.vind('Edities', DEMO_EDITIE_ID).versie); nep.store.flush(); };
  const zetStap = (stap) => wijzig({ stap });
  const scherm = (sessie, naam, editieId) => vraag({ actie: 'scherm', sessie, editieId, data: { naam } });
  return { demo, nep, vraag, beheer, zetStap, wijzig, scherm, anna: (naam) => scherm('anna', naam), org: (naam) => scherm(beheer, naam, DEMO_EDITIE_ID) };
}

test('NAV-1: Archief en Uitleg staan niet in het hoofdmenu', () => {
  for (const naam of ['archief', 'uitleg']) assert.equal(inMenu(naam), false, naam);
});

test('NAV-9: de beheerschermen staan niet los in het hoofdmenu, alleen achter Beheren', () => {
  for (const naam of BEHEER_SCHERMEN) assert.equal(inMenu(naam), false, naam);
  const { beheer } = menuItems(['start', 'beheren', ...BEHEER_SCHERMEN]);
  assert.deepEqual(beheer.routes, ['beheren', ...BEHEER_SCHERMEN]);
});

const ALLES_AAN = { boodschappen: true, kookbeurten: true, programma: true, kamers: true, carpool: true };
const ALLE_ROUTES = ['start', 'archief', 'beheren', 'formulier', 'leden', 'voortgang', 'overzicht', 'detail', 'stappen', 'posten', 'afrekening',
  'accommodaties', 'accommodatie-beheer', 'meenemen', 'boodschappen', 'kookbeurten', 'programma', 'kamers', 'carpool', 'uitleg'];

test('NAV-10 AAN-12: het menu heeft altijd zeven items in stapvolgorde, onafhankelijk van de stap', () => {
  const deelnemer = menuItems(ALLE_ROUTES.filter((r) => r !== 'beheren' && !BEHEER_SCHERMEN.includes(r)));
  assert.deepEqual(deelnemer.items.map((m) => m.label), ['Start', 'Invullen', 'Voortgang', 'Weekendje prikker', 'Accommodatie', 'Meenemen', 'Afrekening']);
  assert.equal(deelnemer.beheer, null);
  for (const naam of ['boodschappen', 'kookbeurten', 'programma', 'kamers', 'carpool', 'posten']) assert.equal(inMenu(naam), false, naam);
  // Een beheersessie heeft geen eigen antwoorden en dus geen Invullen; Beheren staat apart.
  const beheer = menuItems(ALLE_ROUTES.filter((r) => r !== 'formulier'));
  assert.deepEqual(beheer.items.map((m) => m.naam), ['start', 'voortgang', 'overzicht', 'accommodaties', 'meenemen', 'afrekening']);
  assert.equal(beheer.beheer.label, 'Beheren');
});

test('NAV-11: Afrekening opent Wie betaalt wat en is actief op posten en eindafrekening', () => {
  const afr = menuItems(ALLE_ROUTES).items.find((m) => m.naam === 'afrekening');
  assert.equal(afr.href, 'posten');
  assert.deepEqual(afr.routes, ['posten', 'afrekening']);
});

test('STA-8: balk, menu, stappenbeheer en WhatsApp gebruiken dezelfde stapnamen', () => {
  assert.deepEqual(Object.keys(STAPNAMEN), STAPPEN);
  assert.deepEqual(Object.values(STAPNAMEN), ['Invullen', 'Weekendje prikker', 'Accommodatie', 'Meenemen', 'Weekend', 'Afrekening', 'Afgerond']);
  for (const m of MENU.filter((x) => x.stap)) assert.equal(m.label, STAPNAMEN[m.stap], m.naam);
  assert.equal(komtInStap('overzicht'), 'Komt in stap Weekendje prikker');
  assert.match(stapTekst({ editieTitel: 'W', stap: 'overzicht' }), /Daarna volgt de stap Accommodatie\./);
  assert.equal(eersteActie({ editie: { id: 'e1', stap: 'invullen' }, voortgang: { aantal: 2, ingevuld: 2 } }).tekst, 'Zet de stap op Weekendje prikker');
});

test('STA-5: de aftelteller telt dagen tot de vrijdag en zegt op de dag zelf Vandaag!', () => {
  assert.equal(aftelTekst('2027-05-10', '2027-05-14'), 'Nog 4 dagen tot het weekend');
  assert.equal(aftelTekst('2027-05-13', '2027-05-14'), 'Nog 1 dag tot het weekend');
  assert.equal(aftelTekst('2027-05-14', '2027-05-14'), 'Vandaag!');
  assert.equal(aftelTekst('2027-05-15', '2027-05-14'), null);
  assert.equal(aftelTekst('2027-05-10', ''), null);
});

test('STA-4 ACC-10: de eerstvolgende actie van de organisator volgt de stap', () => {
  const g = (stap, extra = {}) => ({ editie: { id: 'e1', stap, vastgelegdWeekend: '', deelvorm: 'info', boodschappenDefinitief: false }, voortgang: { aantal: 4, ingevuld: 2 }, programma: { punten: 0 }, afrekening: { open: [] }, ...extra });
  assert.equal(eersteActie(g('invullen')).tekst, 'Herinnering sturen');
  assert.equal(eersteActie(g('invullen', { voortgang: { aantal: 4, ingevuld: 4 } })).route, '#/stappen');
  assert.equal(eersteActie(g('overzicht')).tekst, 'Weekend vastleggen');
  assert.equal(eersteActie(g('accommodatie')).tekst, 'Accommodaties beheren');
  // ACC-10: geboekt is genoeg om door te gaan, ook bij een verrassing die niet onthuld is.
  assert.equal(eersteActie(g('accommodatie', { geboekt: { geregeld: true, verrassing: true } })).tekst, 'Zet de stap op Meenemen');
  assert.equal(eersteActie(g('voorbereiding'), ALLES_AAN).tekst, 'Boodschappen definitief maken');
  assert.equal(eersteActie(g('weekend'), ALLES_AAN).tekst, 'Programma beheren');
  assert.equal(eersteActie(g('voorbereiding')).tekst, 'Zet de stap op Weekend'); // OND-2: Boodschappen staat uit
  assert.equal(eersteActie(g('weekend')).tekst, 'Zet de stap op Afrekening'); // OND-2: Programma staat uit
  assert.equal(eersteActie(g('afrekenen', { afrekening: { open: [{}] } })).tekst, 'Openstaande betalingen');
  assert.equal(eersteActie(g('afgerond')).tekst, 'Nieuwe editie');
  assert.equal(eersteActie(g('afgerond')).route, '#/editie-nieuw?van=e1');
  assert.equal(eersteActie({ editie: null }).route, '#/editie-nieuw');
});

test('STA-3: het scherm start geeft per stap de tellingen; een deelnemer ziet alleen zijn eigen betalingen, de organisator die van iedereen', () => {
  const { zetStap, anna, org } = opzet({ afrekening: true });
  zetStap('invullen');
  assert.equal(anna('start').data.editie.stap, 'invullen');
  assert.equal(anna('start').data.ik.ingevuld, false);
  assert.deepEqual(org('start').data.voortgang.nogNiet, ['Anna']);
  assert.equal(anna('start').data.voorbereiding, undefined);
  zetStap('voorbereiding');
  assert.equal(typeof anna('start').data.voorbereiding.kamers.aantal, 'number');
  zetStap('afrekenen');
  const mijn = anna('start').data.afrekening;
  const alle = org('start').data.afrekening;
  assert.ok(alle.open.length >= 1);
  assert.equal(mijn.aantalOpen, alle.aantalOpen);
  assert.ok(mijn.open.every((b) => b.ikBetaal || b.ikKrijg));
  assert.ok(alle.open.length >= mijn.open.length);
});

test('ARC-1 AAN-30: iedere deelnemer ziet het archief met alle edities van de groep, nieuwste bovenaan', () => {
  const { nep, zetStap, anna, org } = opzet();
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Edities', { jaar: 2026, titel: 'Weekendje weg 2026', stap: 'afgerond', stapData: {}, vastgelegdWeekend: '2026-05-15', deelvorm: 'info', geboektAccommodatieId: '', lijsten: {}, blokken: {} });
  nep.store.flush();
  zetStap('voorbereiding');
  for (const antwoord of [anna('archief'), org('archief')]) {
    assert.equal(antwoord.ok, true);
    assert.deepEqual(antwoord.data.edities.map((e) => e.jaar), [2027, 2026]);
  }
  const e = anna('archief').data.edities[0];
  assert.deepEqual(e.organisatoren, ['Eva']);
  assert.ok(e.deelnemers.includes('Anna'));
  assert.equal(JSON.stringify(anna('archief').data).includes('dln0'), false); // geen deelnemer-ID's
});

test('ARC-2 AAN-29 AAN-71: na Afgerond is alles alleen-lezen en Nieuwe editie neemt leden, lijsten en blokken over', () => {
  const { vraag, nep, beheer, zetStap, wijzig, anna } = opzet();
  zetStap('voorbereiding');
  const als = (sessie, actie, data, editieId) => vraag({ actie, sessie, editieId, data });
  const nieuw = { titel: 'Weekendje weg 2028', jaar: 2028, periodeVan: '2028-04-01', periodeTot: '2028-10-31', deadline: '2028-02-01T22:59:00.000Z', deelnemers: [], organisatoren: [], vanEditieId: DEMO_EDITIE_ID };
  assert.equal(als(beheer, 'editieAanmaken', nieuw).fout, 'gesloten'); // nog niet afgerond
  zetStap('afgerond');
  assert.equal(als(beheer, 'weekendVastleggen', { vrijdag: '2027-05-14' }, DEMO_EDITIE_ID).fout, 'gesloten'); // AAN-29
  assert.equal(anna('archief').ok, true);
  assert.equal(als('anna', 'editieAanmaken', nieuw).fout, 'geen_toegang');
  // Een eigen lijst en blokinstelling in de afgeronde editie gaan mee.
  wijzig({ lijsten: { activiteiten: [{ sleutel: 'kano', label: 'Kanoën' }] }, blokken: { etenDrinken: true, activiteiten: true, programma: false, samenwerken: true } });
  const r = als(beheer, 'editieAanmaken', nieuw);
  assert.equal(r.ok, true);
  const rollen = r.data.deelnemers.map((d) => d.rol).sort();
  assert.equal(rollen.length, 4); // dezelfde vier leden uit de demo
  assert.equal(rollen.filter((x) => x === 'organisator').length, 1);
  nep.store.nieuwVerzoek();
  const rij = nep.store.vind('Edities', r.data.editie.id);
  assert.deepEqual(rij.lijsten.activiteiten, [{ sleutel: 'kano', label: 'Kanoën' }]);
  assert.equal(rij.blokken.samenwerken, true);
  assert.equal(rij.blokken.programma, false);
  assert.equal(rij.stap, 'invullen');
});
