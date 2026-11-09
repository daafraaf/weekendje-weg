import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashToken } from '../../src/server/crypto.js';
import { API_VERSIE } from '../../src/server/api.js';
import { euro, leesBedrag, invoerTekst, CATEGORIEEN, POST_GRENZEN } from '../../src/shared/geld.js';
import { verdeel, verdelingFout, restNaar, inVerdeling, standaardVerdeling, iedereen, schoonVerdeling } from '../../src/shared/verdeling.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const NAMEN = { jan: 'Jan', klaas: 'Klaas', piet: 'Piet' };
const naamVan = (id) => NAMEN[id] || '';

test('GELD-4 §7.13.2: € 100,00 gelijk over Jan (betaler), Klaas en Piet geeft 33,34, 33,33, 33,33', () => {
  const uit = verdeel(10000, { wijze: 'gelijk', deelnemers: ['jan', 'klaas', 'piet'] }, { betalerId: 'jan', naamVan });
  assert.deepEqual(uit, { jan: 3334, klaas: 3333, piet: 3333 });
});

test('GELD-4 §7.13.3: € 90,00 met aandeel Jan 1 en Klaas 2 geeft 30,00 en 60,00', () => {
  const uit = verdeel(9000, { wijze: 'aandeel', aandelen: { jan: 1, klaas: 2 } }, { betalerId: 'jan', naamVan });
  assert.deepEqual(uit, { jan: 3000, klaas: 6000 });
});

test('GELD-4: aandeel rondt naar beneden af en de restcent gaat naar de betaler', () => {
  const uit = verdeel(1000, { wijze: 'aandeel', aandelen: { jan: 1, klaas: 1, piet: 1 } }, { betalerId: 'piet', naamVan });
  assert.deepEqual(uit, { jan: 333, klaas: 333, piet: 334 });
});

test('AAN-10: deelt de betaler niet mee, dan gaat de restcent naar de eerste op voornaam en daarna op id', () => {
  const uit = verdeel(10000, { wijze: 'gelijk', deelnemers: ['piet', 'klaas', 'jan'] }, { betalerId: 'bas', naamVan });
  assert.deepEqual(uit, { jan: 3334, klaas: 3333, piet: 3333 });
  assert.equal(restNaar(['b2', 'b1'], 'x', () => 'Bas'), 'b1');
  assert.equal(restNaar(['klaas', 'jan'], 'klaas', naamVan), 'klaas');
  // aandeel 0 telt niet als "in de verdeling"
  const a = verdeel(101, { wijze: 'aandeel', aandelen: { jan: 0, klaas: 1, piet: 1 } }, { betalerId: 'jan', naamVan });
  assert.deepEqual(a, { klaas: 51, piet: 50 });
});

test('AAN-09 GELD-3: bedrag per persoon kan pas opgeslagen worden als het verschil nul is', () => {
  assert.equal(verdelingFout(8460, { wijze: 'bedrag', bedragen: { jan: 1200, klaas: 5660 } }), 'Nog € 16,00 te verdelen');
  assert.equal(verdelingFout(8460, { wijze: 'bedrag', bedragen: { jan: 9000 } }), '€ 5,40 te veel');
  assert.equal(verdelingFout(8460, { wijze: 'bedrag', bedragen: { jan: 8460, klaas: 0 } }), null);
  assert.deepEqual(verdeel(8460, { wijze: 'bedrag', bedragen: { jan: 8460, klaas: 0 } }), { jan: 8460 });
  assert.deepEqual(verdeel(8460, { wijze: 'bedrag', bedragen: { jan: 100 } }), {});
});

test('GELD-2: gelijk vraagt minstens één persoon, aandeel een geheel getal 0 tot en met 20 met som groter dan 0', () => {
  assert.equal(verdelingFout(100, { wijze: 'gelijk', deelnemers: [] }), 'Kies minstens één persoon.');
  assert.equal(verdelingFout(100, { wijze: 'aandeel', aandelen: { jan: 0 } }), 'Geef minstens één persoon een aandeel.');
  assert.match(verdelingFout(100, { wijze: 'aandeel', aandelen: { jan: 21 } }), /0 tot en met 20/);
  assert.match(verdelingFout(100, { wijze: 'aandeel', aandelen: { jan: 1.5 } }), /heel getal/);
  assert.deepEqual(inVerdeling({ wijze: 'gelijk', deelnemers: ['a', 'a', 'b'] }), ['a', 'b']);
  assert.deepEqual(schoonVerdeling({ wijze: 'aandeel', aandelen: { a: 0, b: 2 }, bedragen: { a: 1 } }), { wijze: 'aandeel', aandelen: { b: 2 } });
});

test('AAN-61 §7.13.5: de standaardverdeling en "Iedereen" laten afgehaakte deelnemers weg', () => {
  const ds = [{ id: 'a', afgehaakt: false }, { id: 'b', afgehaakt: true }, { id: 'c', afgehaakt: false }];
  assert.deepEqual(iedereen(ds), ['a', 'c']);
  assert.deepEqual(standaardVerdeling(ds), { wijze: 'gelijk', deelnemers: ['a', 'c'] });
});

test('GELD-4 §7.13.1: bedragen als € 1.234,56 en invoer met komma of punt', () => {
  assert.equal(euro(123456), '€ 1.234,56');
  assert.equal(euro(5), '€ 0,05');
  assert.equal(euro(-1240), '-€ 12,40');
  assert.equal(euro(100000000), '€ 1.000.000,00');
  assert.equal(invoerTekst(8460), '84,60');
  for (const [t, c] of [['84,60', 8460], ['€ 84,60', 8460], ['1.234,56', 123456], ['84.6', 8460], ['12', 1200], ['12,', 1200], ['1.234', 123400], ['0,05', 5]]) assert.equal(leesBedrag(t), c, t);
  for (const t of ['', 'abc', '1,234', '12,345', '1.2.3', '-5']) assert.equal(leesBedrag(t), null, t);
});

test('AAN-16: zes categorieën in vaste volgorde', () => {
  assert.deepEqual(CATEGORIEEN.map((c) => c.label), ['Verblijf', 'Eten en drinken', 'Boodschappen', 'Activiteit', 'Vervoer', 'Overig']);
});

// --- API: postOpslaan en postVerwijderen tegen de nepbackend ---
const WACHTWOORD = 'duinpan-kraanvogel';
const EVA = 'dln0000000000001';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';
const CHRIS = 'dln0000000000004';

function opzet() {
  const demo = maakDemo({ posten: true, stap: 'weekend' });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const post = (extra = {}) => ({ soort: 'uitgave', omschrijving: 'Drank', bedrag: 8460, betalerId: ANNA, datum: '2027-06-11', categorie: 'etenDrinken', verdeling: { wijze: 'gelijk', deelnemers: [ANNA, BRAM] }, ...extra });
  const rij = (id) => { nep.store.nieuwVerzoek(); return nep.store.vind('Posten', id); };
  return { nep, vraag, beheer, post, rij };
}

test('GELD-1 GELD-5: een deelnemer voegt een post toe en wijzigt en verwijdert alleen zijn eigen posten', () => {
  const { vraag, post, rij } = opzet();
  const r = vraag({ actie: 'postOpslaan', sessie: 'anna', data: post() });
  assert.equal(r.ok, true, r.melding);
  const nieuw = rij(r.data.id);
  assert.equal(nieuw.aangemaaktDoor, ANNA);
  assert.equal(nieuw.aangepastDoorOrganisator, false);
  const w = vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ id: r.data.id, versie: 1, omschrijving: 'Bier' }) });
  assert.equal(w.ok, true, w.melding);
  assert.equal(rij(r.data.id).omschrijving, 'Bier');
  // een post van Bram
  const ander = vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ id: 'pst0000000000002', versie: 1 }) });
  assert.equal(ander.fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'postVerwijderen', sessie: 'anna', data: { id: 'pst0000000000002', versie: 1 } }).fout, 'geen_toegang');
  assert.equal(rij('pst0000000000002').omschrijving, 'Kanoverhuur');
  assert.equal(vraag({ actie: 'postVerwijderen', sessie: 'anna', data: { id: r.data.id, versie: 2 } }).ok, true);
  assert.equal(rij(r.data.id), null);
});

test('GELD-5 §7.13.10: wijzigt de organisator een post van een ander, dan blijft de aantekening staan', () => {
  const { vraag, beheer, post, rij } = opzet();
  const r = vraag({ actie: 'postOpslaan', sessie: beheer, data: post({ id: 'pst0000000000002', versie: 1, betalerId: BRAM, verdeling: { wijze: 'aandeel', aandelen: { [BRAM]: 1, [CHRIS]: 1 } } }) });
  assert.equal(r.ok, true, r.melding);
  assert.equal(rij('pst0000000000002').aangepastDoorOrganisator, true);
  assert.equal(rij('pst0000000000002').aangemaaktDoor, BRAM);
  // eigen post van de organisator krijgt geen aantekening
  const eigen = vraag({ actie: 'postOpslaan', sessie: beheer, data: post({ id: 'pst0000000000001', versie: 1, betalerId: EVA }) });
  assert.equal(eigen.ok, true);
  assert.equal(rij('pst0000000000001').aangepastDoorOrganisator, false);
});

test('GELD-3 AAN-09: de server weigert een verdeling per bedrag die niet sluit', () => {
  const { vraag, post } = opzet();
  const r = vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ verdeling: { wijze: 'bedrag', bedragen: { [ANNA]: 1200, [BRAM]: 5660 } } }) });
  assert.equal(r.fout, 'ongeldig');
  assert.equal(r.melding, 'Nog € 16,00 te verdelen.');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ verdeling: { wijze: 'bedrag', bedragen: { [ANNA]: 2800, [BRAM]: 5660 } } }) }).ok, true);
});

test('AAN-59: een post heeft een bedrag van 1 cent tot € 100.000, een bekende betaler en een omschrijving', () => {
  const { vraag, post } = opzet();
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ bedrag: 0 }) }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ bedrag: POST_GRENZEN.bedragMax + 1 }) }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ omschrijving: 'x'.repeat(81) }) }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ omschrijving: '   ' }) }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ betalerId: 'onbekend00000000' }) }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ verdeling: { wijze: 'gelijk', deelnemers: ['onbekend00000000'] } }) }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ categorie: 'snoep' }) }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: 'anna', data: post({ bedrag: POST_GRENZEN.bedragMax }) }).ok, true);
});

test('GELD-6: scherm posten levert per post betaler, bedrag, categorie en jouw aandeel, plus totalen per categorie', () => {
  const { vraag } = opzet();
  const r = vraag({ actie: 'scherm', sessie: 'anna', data: { naam: 'posten' } });
  assert.equal(r.ok, true, r.melding);
  const g = r.data;
  assert.equal(g.ik, ANNA);
  const bood = g.posten.find((p) => p.id === 'pst0000000000001');
  assert.equal(bood.betalerId, EVA);
  assert.equal(bood.aandelen[ANNA], 4660);
  assert.equal(bood.aandelen[EVA], 4660);
  assert.equal(bood.magWijzigen, false);
  assert.equal(g.totaal, 27640);
  assert.equal(g.mijnDeel, 4660);
  assert.deepEqual(g.perCategorie.map((c) => [c.label, c.bedrag]), [['Boodschappen', 18640], ['Activiteit', 9000]]);
  assert.equal(g.categorieen.length, 6);
  assert.equal(g.saldi.reduce((s, x) => s + x.saldo, 0), 0);
  assert.equal(g.saldi.find((s) => s.id === EVA).saldo, 18640 - 4660);
});
