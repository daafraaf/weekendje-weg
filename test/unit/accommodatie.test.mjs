import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { prijsPerPersoon, heleEuro, isHttpsLink } from '../../src/shared/accommodatie.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';
const CHRIS = 'dln0000000000004';

function opzet({ stap = 'accommodatie' } = {}) {
  const demo = maakDemo({ antwoorden: true, stap });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'bram'), soort: 'deelnemer', subjectId: BRAM, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const org = (actie, data) => vraag({ actie, sessie: beheer, data });
  const scherm = (sessie) => vraag({ actie: 'scherm', sessie, data: { naam: 'accommodaties' } });
  const voegToe = (naam, prijsTotaal = 138000, extra = {}) => org('accommodatieOpslaan', { naam, plaats: 'Dwingeloo', link: 'https://voorbeeld.nl/huis', prijsTotaal, notitie: '', ...extra });
  const editie = () => { nep.store.nieuwVerzoek(); return nep.store.vind('Edities', DEMO_EDITIE_ID); };
  return { demo, nep, vraag, beheer, org, scherm, voegToe, editie };
}

test('ACC-5: prijs per persoon is het totaal gedeeld door het aantal, afgerond op hele euro\'s', () => {
  assert.equal(prijsPerPersoon(138000, 6), 23000);
  assert.equal(prijsPerPersoon(100000, 3), 33300);
  assert.equal(prijsPerPersoon(0, 3), null);
  assert.equal(prijsPerPersoon(100000, 0), null);
  assert.equal(heleEuro(138000), '€ 1.380');
  assert.equal(heleEuro(23000), '€ 230');
});

test('ACC-2 NFR-3: alleen een link met https:// is geldig', () => {
  assert.ok(isHttpsLink('https://voorbeeld.nl/a?b=1'));
  for (const slecht of ['http://voorbeeld.nl', 'javascript:alert(1)', 'https://', 'voorbeeld.nl', 'https://a b', '']) assert.ok(!isHttpsLink(slecht), slecht);
});

test('ACC-1 AAN-63: de organisator legt een vrijdag binnen de periode vast, een andere dag of ander jaar niet', () => {
  const { org, editie, scherm, beheer, nep } = opzet();
  const s = scherm(beheer).data;
  assert.equal(s.top.length, 5);
  assert.ok(s.weekenden.length > 40);
  assert.equal(org('weekendVastleggen', { vrijdag: s.top[0].vrijdag }).ok, true);
  assert.equal(editie().vastgelegdWeekend, s.top[0].vrijdag);
  assert.equal(org('weekendVastleggen', { vrijdag: s.weekenden[3] }).ok, true); // vervangt het eerdere weekend
  assert.equal(editie().vastgelegdWeekend, s.weekenden[3]);
  assert.equal(org('weekendVastleggen', { vrijdag: '2027-06-12' }).fout, 'ongeldig'); // zaterdag
  assert.equal(org('weekendVastleggen', { vrijdag: '2028-06-09' }).fout, 'ongeldig'); // buiten de periode
  assert.equal(editie().vastgelegdWeekend, s.weekenden[3]);
  assert.equal(nep.store.lees('Edities').length, 1);
});

test('ACC-2 AAN-64: toevoegen, wijzigen en verwijderen met grenzen en versiecontrole', () => {
  const { org, voegToe, scherm, beheer, nep } = opzet();
  const r = voegToe('Hoeve de Kraanvogel');
  assert.equal(r.ok, true);
  assert.equal(voegToe('X', 100, { link: 'http://onveilig.nl' }).fout, 'ongeldig');
  assert.equal(voegToe('  ').fout, 'ongeldig');
  assert.equal(voegToe('Te duur', 10000001).fout, 'ongeldig');
  assert.equal(voegToe('Gratis', 0).ok, true); // 0 = prijs onbekend
  assert.equal(org('accommodatieOpslaan', { id: r.data.id, versie: r.data.versie, naam: 'Hoeve', plaats: 'Drenthe', link: '', prijsTotaal: 150000, notitie: 'sauna' }).ok, true);
  const verouderd = org('accommodatieOpslaan', { id: r.data.id, versie: r.data.versie, naam: 'Nogmaals', plaats: '', link: '', prijsTotaal: 1, notitie: '' });
  assert.equal(verouderd.fout, 'gewijzigd');
  const lijst = scherm(beheer).data.accommodaties;
  assert.deepEqual(lijst.map((a) => a.naam), ['Hoeve', 'Gratis']);
  assert.equal(lijst[1].prijsPerPersoon, null);
  const nu = lijst[0];
  assert.equal(org('accommodatieVerwijderen', { id: nu.id, versie: nu.versie }).ok, true);
  assert.equal(scherm(beheer).data.accommodaties.length, 1);
  for (let i = 0; i < 12; i++) voegToe(`Extra ${i}`);
  assert.equal(voegToe('Een te veel').fout, 'ongeldig');
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Accommodaties').length, 12);
});

test('ACC-2 TOE-7: een deelnemer beheert geen accommodaties of weekend', () => {
  const { vraag, voegToe } = opzet();
  const id = voegToe('Hoeve').data.id;
  const data = { naam: 'X', plaats: '', link: '', prijsTotaal: 1, notitie: '' };
  assert.equal(vraag({ actie: 'accommodatieOpslaan', sessie: 'anna', data }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'accommodatieVerwijderen', sessie: 'anna', data: { id, versie: 1 } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'weekendVastleggen', sessie: 'anna', data: { vrijdag: '2027-06-11' } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'deelvormZetten', sessie: 'anna', data: { deelvorm: 'stemmen' } }).fout, 'geen_toegang');
});

test('ACC-3 AAN-65: deelvorm kiezen; geboekt hoort bij één accommodatie en verdwijnt met die accommodatie', () => {
  const { org, voegToe, editie, scherm, beheer } = opzet();
  const a = voegToe('Hoeve').data;
  const b = voegToe('Strandhuis').data;
  assert.equal(editie().deelvorm, 'info');
  assert.equal(org('deelvormZetten', { deelvorm: 'geboekt' }).fout, 'ongeldig'); // geen accommodatie gekozen
  assert.equal(org('deelvormZetten', { deelvorm: 'stemmen' }).ok, true);
  assert.equal(org('deelvormZetten', { deelvorm: 'geboekt', accommodatieId: 'onbekend-id-0000' }).fout, 'gewijzigd');
  assert.equal(org('deelvormZetten', { deelvorm: 'geboekt', accommodatieId: a.id }).ok, true);
  assert.equal(editie().geboektAccommodatieId, a.id);
  assert.equal(scherm(beheer).data.geboektId, a.id);
  assert.equal(org('deelvormZetten', { deelvorm: 'info' }).ok, true);
  assert.equal(editie().geboektAccommodatieId, '');
  org('deelvormZetten', { deelvorm: 'geboekt', accommodatieId: b.id });
  assert.equal(org('accommodatieVerwijderen', { id: b.id, versie: b.versie }).ok, true);
  assert.equal(editie().deelvorm, 'info');
  assert.equal(editie().geboektAccommodatieId, '');
});

test('ACC-4 AAN-08: één favoriet per persoon, wijzigen mag, aantallen zichtbaar zonder namen', () => {
  const { org, vraag, voegToe, scherm, beheer, nep } = opzet();
  const a = voegToe('Hoeve').data;
  const b = voegToe('Boerderij').data;
  const c = voegToe('Strandhuis').data;
  assert.equal(vraag({ actie: 'stemmen', sessie: 'anna', data: { accommodatieId: a.id } }).fout, 'gesloten'); // deelvorm info
  org('deelvormZetten', { deelvorm: 'stemmen' });
  assert.equal(vraag({ actie: 'stemmen', sessie: 'anna', data: { accommodatieId: a.id } }).ok, true);
  assert.equal(vraag({ actie: 'stemmen', sessie: 'bram', data: { accommodatieId: a.id } }).ok, true);
  assert.equal(org('stemmen', { accommodatieId: c.id }).ok, true); // de organisator stemt met zijn eigen deelnemersrij
  const na = scherm('anna').data;
  assert.deepEqual(na.accommodaties.map((x) => x.stemmen), [2, 0, 1]);
  assert.equal(na.mijnStem, a.id);
  // Wijzigen vervangt de stem; nooit twee stemmen van één persoon.
  assert.equal(vraag({ actie: 'stemmen', sessie: 'anna', data: { accommodatieId: b.id } }).ok, true);
  assert.equal(vraag({ actie: 'stemmen', sessie: 'anna', data: { accommodatieId: b.id } }).ok, true);
  const later = scherm('anna').data;
  assert.deepEqual(later.accommodaties.map((x) => x.stemmen), [1, 1, 1]);
  assert.equal(later.mijnStem, b.id);
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Stemmen').filter((s) => s.deelnemerId === ANNA).length, 1);
  // Alleen aantallen: geen ID's van anderen of namen in het scherm (`ik` is het eigen ID).
  const tekst = JSON.stringify(later);
  for (const id of ['dln0000000000001', BRAM, CHRIS]) assert.ok(!tekst.includes(id));
  assert.ok(!tekst.includes('Anna') && !tekst.includes('Bram'));
  assert.equal(vraag({ actie: 'stemmen', sessie: 'anna', data: { accommodatieId: 'onbekend-id-0000' } }).fout, 'gewijzigd');
});

test('ACC-4: stemmen van een verwijderde accommodatie verdwijnen mee', () => {
  const { org, vraag, voegToe, scherm, nep } = opzet();
  const a = voegToe('Hoeve').data;
  const b = voegToe('Boerderij').data;
  org('deelvormZetten', { deelvorm: 'stemmen' });
  vraag({ actie: 'stemmen', sessie: 'anna', data: { accommodatieId: a.id } });
  org('accommodatieVerwijderen', { id: a.id, versie: a.versie });
  const s = scherm('anna').data;
  assert.equal(s.mijnStem, '');
  assert.deepEqual(s.accommodaties.map((x) => x.id), [b.id]);
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Stemmen').length, 0);
});

test('ACC-5: het scherm geeft de prijs per persoon over de niet-afgehaakte deelnemers', () => {
  const { org, voegToe, scherm, beheer, nep } = opzet();
  const a = voegToe('Hoeve', 100000).data;
  assert.equal(scherm(beheer).data.accommodaties[0].prijsPerPersoon, 25000); // 4 deelnemers
  org('afhakenMarkeren', { deelnemerId: CHRIS, afgehaakt: true });
  const s = scherm('anna').data;
  assert.equal(s.aantal, 3);
  assert.equal(s.accommodaties[0].prijsPerPersoon, 33300); // 1000 / 3 = 333,33 -> 333
  org('deelvormZetten', { deelvorm: 'geboekt', accommodatieId: a.id });
  const g = scherm('anna').data;
  assert.equal(g.deelvorm, 'geboekt');
  assert.equal(g.geboektId, a.id);
  assert.equal(g.accommodaties[0].stemmen, 0);
  assert.ok(nep);
});

test('ACC-3: een deelnemer ziet de accommodaties pas vanaf de stap Accommodatie, de organisator altijd', () => {
  const { scherm, beheer } = opzet({ stap: 'overzicht' });
  assert.equal(scherm('anna').fout, 'gesloten');
  assert.equal(scherm(beheer).ok, true);
});
