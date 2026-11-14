// Fase 35: boodschappen als wensenlijst (OND-1, MEE-11, MEE-12, MEE-13, AAN-80, AAN-93).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { boodschapDicht } from '../../src/server/acties/items.js';
import { losmakenGevolgen } from '../../src/shared/stappen.js';
import { MENU, menuItems } from '../../src/shared/start.js';
import { ONDERDELEN } from '../../src/shared/onderdelen.js';
import { pasItemsToe, NIEUW_ITEM } from '../../src/web/stand.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';
const WEEKEND = '2027-05-21';

function opzet({ weekend = '' } = {}) {
  const demo = maakDemo({ antwoorden: true, stap: 'voorbereiding', items: true, weekend });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'bram'), soort: 'deelnemer', subjectId: BRAM, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const als = (sessie) => (actie, data) => vraag({ actie, sessie, data });
  const scherm = (sessie) => vraag({ actie: 'scherm', sessie, data: { naam: 'meenemen' } }).data;
  const items = () => { nep.store.nieuwVerzoek(); return nep.store.lees('Items'); };
  return { nep, org: als(beheer), anna: als('anna'), bram: als('bram'), scherm, items };
}

test('AAN-93 MEE-13: zonder vastgelegd weekend weigert het script een boodschap met gesloten, ook via Wie neemt wat mee', () => {
  const { anna, org, scherm } = opzet();
  assert.equal(anna('boodschapToevoegen', { naam: 'Tripel Karmeliet, 4 flesjes' }).fout, 'gesloten');
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: 'Chips' }).fout, 'gesloten');
  assert.equal(org('itemOpslaan', { soort: 'boodschap', naam: 'Chips' }).fout, 'gesloten');
  assert.equal(anna('bundel', { acties: [{ actie: 'boodschapToevoegen', data: { naam: 'Chips' } }] }).data.uitslagen[0].fout, 'gesloten');
  // Spullen en items uit eigen keuken blijven altijd open.
  assert.equal(anna('itemOpslaan', { soort: 'spullen', naam: 'Tent' }).ok, true);
  assert.equal(anna('itemOpslaan', { soort: 'keuken', naam: 'Honing' }).ok, true);
  const s = scherm('anna');
  assert.equal(s.vastgelegdWeekend, '');
  assert.match(s.boodschapDicht, /zodra het weekend vastligt/);
});

test('AAN-93: boodschapDicht volgt weekend en definitief', () => {
  assert.notEqual(boodschapDicht({ vastgelegdWeekend: '' }), '');
  assert.equal(boodschapDicht({ vastgelegdWeekend: WEEKEND }), '');
  assert.match(boodschapDicht({ vastgelegdWeekend: WEEKEND, boodschappenDefinitief: true }), /definitief/);
});

test('MEE-12: een deelnemer zet een boodschap op de lijst met naam en categorie; bij elk item staat wie hem toevoegde', () => {
  const { anna, scherm, items } = opzet({ weekend: WEEKEND });
  const r = anna('boodschapToevoegen', { naam: '  Tripel   Karmeliet, 4 flesjes ', categorie: 'Frisdrank, bier en wijn' });
  assert.equal(r.ok, true);
  const rij = items().find((i) => i.id === r.data.id);
  assert.equal(rij.soort, 'boodschap');
  assert.equal(rij.naam, 'Tripel Karmeliet, 4 flesjes');
  assert.equal(rij.toegevoegdDoor, ANNA);
  const vanAnna = scherm('anna').items.find((i) => i.id === r.data.id);
  assert.equal(vanAnna.eigen, true);
  const vanBram = scherm('bram').items.find((i) => i.id === r.data.id);
  assert.equal(vanBram.eigen, false);
  assert.equal(vanBram.door, 'Anna');
  // Zonder categorie volgt het voorstel uit de woordenlijst.
  assert.equal(anna('boodschapToevoegen', { naam: 'Tomaten' }).data.categorie, 'Groente en fruit');
  // Een keukenitem van de startlijst heeft geen naam erbij.
  assert.equal(scherm('anna').items.find((i) => i.soort === 'keuken').door, '');
});

test('MEE-12 AAN-83: dezelfde boodschap van dezelfde persoon blijft één item; de laatste categorie wint', () => {
  const { anna, bram, items } = opzet({ weekend: WEEKEND });
  const a = anna('boodschapToevoegen', { naam: 'Chips' }).data;
  const b = anna('boodschapToevoegen', { naam: 'chips', categorie: 'Overig' }).data;
  assert.equal(b.id, a.id);
  assert.equal(b.categorie, 'Overig');
  assert.equal(items().filter((i) => i.naam.toLowerCase() === 'chips').length, 1);
  // Een ander mag dezelfde wens hebben.
  assert.notEqual(bram('boodschapToevoegen', { naam: 'Chips' }).data.id, a.id);
});

test('MEE-12 §7.8.4: je eigen boodschap haal je weg zolang de lijst open is, die van een ander niet', () => {
  const { anna, bram, org, items } = opzet({ weekend: WEEKEND });
  const a = anna('boodschapToevoegen', { naam: 'Drop' }).data;
  assert.equal(bram('itemVerwijderen', { id: a.id, versie: a.versie }).fout, 'geen_toegang');
  const b = anna('boodschapToevoegen', { naam: 'Stroopwafels' }).data;
  assert.equal(org('boodschappenDefinitief', { definitief: true }).ok, true);
  assert.equal(anna('itemVerwijderen', { id: b.id, versie: b.versie }).fout, 'gesloten');
  assert.equal(org('boodschappenDefinitief', { definitief: false }).ok, true);
  assert.equal(anna('itemVerwijderen', { id: a.id, versie: a.versie }).ok, true);
  assert.equal(items().some((i) => i.id === a.id), false);
});

test('AAN-93 MEE-6: na definitief kan niemand meer toevoegen en afvinken werkt nog', () => {
  const { anna, org } = opzet({ weekend: WEEKEND });
  const a = anna('boodschapToevoegen', { naam: 'Spa rood' }).data;
  assert.equal(org('boodschappenDefinitief', { definitief: true }).ok, true);
  assert.equal(anna('boodschapToevoegen', { naam: 'Cola' }).fout, 'gesloten');
  assert.equal(org('boodschapToevoegen', { naam: 'Cola' }).fout, 'gesloten');
  assert.equal(org('itemOpslaan', { soort: 'boodschap', naam: 'Cola' }).fout, 'gesloten');
  assert.equal(anna('afvinken', { itemId: a.id, afgevinkt: true }).ok, true);
});

test('AAN-93 §7.8.11: na Ander weekend kiezen blijven de items staan en is toevoegen dicht tot er een nieuw weekend ligt', () => {
  const { anna, org, scherm } = opzet({ weekend: WEEKEND });
  const a = anna('boodschapToevoegen', { naam: 'Bitterballen' }).data;
  assert.equal(org('weekendLosmaken', {}).ok, true);
  assert.ok(scherm('anna').items.some((i) => i.id === a.id));
  assert.equal(anna('boodschapToevoegen', { naam: 'Kaas' }).fout, 'gesloten');
  assert.equal(org('weekendVastleggen', { vrijdag: '2027-06-11' }).ok, true);
  assert.equal(anna('boodschapToevoegen', { naam: 'Kaas' }).ok, true);
});

test('AAN-93 ACC-7: de losmaakbevestiging zegt dat toevoegen stilstaat tot er een nieuw weekend ligt', () => {
  assert.ok(losmakenGevolgen().some((t) => /boodschappen blijven/.test(t) && /nieuw weekend/.test(t)));
  assert.ok(!losmakenGevolgen({ onderdelen: { ...ONDERDELEN, boodschappen: false } }).some((t) => /boodschap/.test(t)));
});

test('MEE-11 NAV-10: het menu houdt zeven items en Meenemen is actief op beide tabs', () => {
  assert.equal(MENU.length, 7);
  const { items } = menuItems(MENU.map((m) => m.naam).concat('boodschappen'));
  assert.equal(items.length, 7);
  assert.deepEqual(items.find((m) => m.naam === 'meenemen').routes, ['meenemen', 'boodschappen']);
});

test('MEE-12 AAN-83: een nieuwe boodschap staat direct op de lijst met een voorlopig id; dezelfde naam blijft één item', () => {
  const g = { items: [] };
  pasItemsToe(g, { actie: 'boodschapToevoegen', data: { naam: ' Tripel Karmeliet ', categorie: 'Frisdrank, bier en wijn' } });
  pasItemsToe(g, { actie: 'boodschapToevoegen', data: { naam: 'tripel karmeliet', categorie: 'Overig' } });
  assert.equal(g.items.length, 1);
  assert.ok(g.items[0].id.startsWith(NIEUW_ITEM));
  assert.equal(g.items[0].naam, 'Tripel Karmeliet');
  assert.equal(g.items[0].categorie, 'Overig');
  assert.equal(g.items[0].eigen, true);
});
