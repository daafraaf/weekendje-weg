import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { boodschappenLijst, kopieerTekst, opLijst, tellingenBij, voortgang } from '../../src/shared/boodschappen.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';

function opzet() {
  const demo = maakDemo({ antwoorden: true, stap: 'voorbereiding', items: true, weekend: '2027-05-21' }); // AAN-93: met een vastgelegd weekend
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'bram'), soort: 'deelnemer', subjectId: BRAM, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const als = (sessie) => (actie, data) => vraag({ actie, sessie, data });
  const scherm = (sessie) => vraag({ actie: 'scherm', sessie, data: { naam: 'meenemen' } }).data;
  const item = (naam) => { nep.store.nieuwVerzoek(); return nep.store.lees('Items').find((i) => i.naam === naam); };
  return { nep, org: als(beheer), anna: als('anna'), bram: als('bram'), scherm, item };
}

const i = (id, soort, naam, categorie, extra = {}) => ({ id, soort, naam, categorie, afgevinkt: false, claims: [], ...extra });

test('MEE-5 AAN-19: boodschap en ongeclaimde keuken staan in categorievolgorde, binnen een categorie op naam', () => {
  const items = [
    i('4', 'boodschap', 'Bier, krat', 'Frisdrank, bier en wijn'),
    i('1', 'boodschap', 'Stokbrood, 2', 'Brood'),
    i('2', 'boodschap', 'Paprika, 3', 'Groente en fruit'),
    i('3', 'boodschap', 'Bananen', 'Groente en fruit'),
    i('5', 'keuken', 'Koffie', 'Ontbijt en beleg'),
    i('6', 'keuken', 'Thee', 'Ontbijt en beleg', { claims: [{ naam: 'Anna' }] }), // geclaimd: niet op de lijst
    i('7', 'spullen', 'Speaker', 'Overig'), // wordt nooit gekocht
  ];
  assert.deepEqual(items.map(opLijst), [true, true, true, true, true, false, false]);
  assert.deepEqual(boodschappenLijst(items).map((g) => [g.categorie, g.items.map((x) => x.naam)]), [
    ['Groente en fruit', ['Bananen', 'Paprika, 3']],
    ['Brood', ['Stokbrood, 2']],
    ['Ontbijt en beleg', ['Koffie']],
    ['Frisdrank, bier en wijn', ['Bier, krat']],
  ]);
});

test('MEE-7: afgevinkte items staan onderaan hun categorie en tellen in de voortgang', () => {
  const items = [i('1', 'boodschap', 'Bananen', 'Groente en fruit', { afgevinkt: true }), i('2', 'boodschap', 'Paprika', 'Groente en fruit'), i('3', 'boodschap', 'Appels', 'Groente en fruit')];
  const groepen = boodschappenLijst(items);
  assert.deepEqual(groepen[0].items.map((x) => x.naam), ['Appels', 'Paprika', 'Bananen']);
  assert.deepEqual(voortgang(groepen), { klaar: 1, totaal: 3 });
});

test('MEE-8: de gekopieerde tekst heeft per categorie een kop en de items, zonder afgevinkte items', () => {
  const items = [
    i('1', 'boodschap', 'Bananen', 'Groente en fruit', { afgevinkt: true }), i('2', 'boodschap', 'Paprika, 3', 'Groente en fruit'),
    i('3', 'boodschap', 'Eieren, 12', 'Zuivel en eieren', { afgevinkt: true }), // hele categorie klaar: geen kop
    i('4', 'boodschap', '0,0 bier', 'Frisdrank, bier en wijn'),
  ];
  assert.equal(kopieerTekst(boodschappenLijst(items)), 'Groente en fruit\n- Paprika, 3\n\nFrisdrank, bier en wijn\n- 0,0 bier');
  assert.equal(kopieerTekst([]), '');
});

test('MEE-8: de gekopieerde tekst van de demolijst is gelijk aan de vaste verwachte tekst', () => {
  const { scherm } = opzet();
  const verwacht = [
    'Ontbijt en beleg', '- Koffie', '- Pindakaas', '- Suiker', '- Thee', '',
    'Conserven en sauzen', '- Ketchup', '- Kruiden', '- Mayonaise', '- Olijfolie', '- Zout en peper',
  ].join('\n');
  assert.equal(kopieerTekst(boodschappenLijst(scherm('anna').items)), verwacht);
});

test('MEE-9 AAN-67: een wens uit eten en drinken hoort bij een boodschap als al haar woorden in de naam staan', () => {
  const wensen = [{ label: '0,0 bier', aantal: 2 }, { label: 'Wijn', aantal: 1 }, { label: 'IPA', aantal: 0 }, { label: 'Vegetarisch', aantal: 3 }];
  assert.deepEqual(tellingenBij('0,0 bier', wensen), [{ label: '0,0 bier', aantal: 2 }]);
  assert.deepEqual(tellingenBij('Bier, krat', wensen), []); // gewoon bier is niet 0,0 bier
  assert.deepEqual(tellingenBij('Rode wijn', wensen), [{ label: 'Wijn', aantal: 1 }]);
  assert.deepEqual(tellingenBij('Vegetarische burgers', wensen), [{ label: 'Vegetarisch', aantal: 3 }]);
  assert.deepEqual(tellingenBij('IPA', wensen), []); // niemand wil het
});

test('MEE-9: het scherm geeft de tellingen uit eten en drinken zonder namen, afgehaakten tellen niet mee', () => {
  const { scherm, org } = opzet();
  const telling = () => Object.fromEntries(scherm('anna').wensen.map((w) => [w.label, w.aantal]));
  assert.deepEqual(telling(), { Vegetarisch: 2, Veganistisch: 0, 'Geen vis': 0, IPA: 1, '0,0 bier': 1, Wijn: 1, Whisky: 0, Barbecue: 0 });
  assert.equal(JSON.stringify(scherm('anna').wensen).includes('dln'), false);
  // Eva (organisator) heeft de wijn en vegetarisch ingevuld; na afhaken telt ze niet meer mee.
  assert.equal(org('afhakenMarkeren', { deelnemerId: 'dln0000000000001', afgehaakt: true }).ok, true);
  assert.deepEqual([telling().Wijn, telling().Vegetarisch], [0, 1]);
});

test('MEE-7 AAN-27: iedereen vinkt af, het is gedeeld, ook na definitief; spullen niet', () => {
  const { anna, bram, scherm, item } = opzet();
  const koffie = item('Koffie').id;
  assert.equal(anna('afvinken', { itemId: koffie, afgevinkt: true }).ok, true);
  assert.equal(scherm('bram').items.find((x) => x.naam === 'Koffie').afgevinkt, true);
  assert.equal(bram('afvinken', { itemId: koffie, afgevinkt: false }).ok, true);
  assert.equal(scherm('anna').items.find((x) => x.naam === 'Koffie').afgevinkt, false);
  assert.equal(anna('afvinken', { itemId: item('Speaker').id, afgevinkt: true }).fout, 'ongeldig');
  assert.equal(anna('afvinken', { itemId: '0000000000000000', afgevinkt: true }).fout, 'gewijzigd');
});

test('MEE-6: alleen de organisator zet definitief; daarna is toevoegen gesloten en afvinken blijft werken', () => {
  const { org, anna, bram, scherm, item } = opzet();
  assert.equal(anna('boodschappenDefinitief', { definitief: true }).fout, 'geen_toegang');
  assert.equal(scherm('anna').definitief, false);
  assert.equal(org('boodschappenDefinitief', { definitief: true }).ok, true);
  assert.equal(scherm('anna').definitief, true);
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: 'Bananen' }).fout, 'gesloten');
  assert.equal(bram('claimen', { itemId: item('Thee').id }).fout, 'gesloten');
  assert.equal(anna('afvinken', { itemId: item('Thee').id, afgevinkt: true }).ok, true);
  // De organisator draait het terug.
  assert.equal(org('boodschappenDefinitief', { definitief: false }).ok, true);
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: 'Bananen' }).ok, true);
});
