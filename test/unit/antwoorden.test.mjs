import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken, maakToken } from '../../src/server/crypto.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { nodeSha256, nodeRandom } from '../mock-backend/memorystore.mjs';
import { VERBLIJF_WENSEN, ontbreekt, isIngevuld, schijfTekst, bovengrens, BUDGET_VERBLIJF, BUDGET_WEEKEND } from '../../src/shared/antwoorden.js';

const E1 = 'editie0000000001';
const ANNA = 'dln0000000000001';
const BRAM = 'dln0000000000002';
const NU = new Date('2027-02-01T12:00:00Z');
const GELDIG = { beschikbaarheid: { '2027-04-09': 'ja' }, budgetVerblijf: 15000, budgetWeekend: 40000, maxReistijdUur: 2 };

function omgeving({ stap = 'invullen', nu = NU } = {}) {
  const tokenA = maakToken(nodeRandom);
  const tokenB = maakToken(nodeRandom);
  const seed = {
    Groep: [{ naam: 'Studievrienden', apiVersie: 1, opgezet: true, aangemaakt: '2027-01-01T00:00:00Z' }],
    Leden: [{ id: 'lid0000000000001', voornaam: 'Anna', woonplaats: 'Zwolle', actief: true }, { id: 'lid0000000000002', voornaam: 'Bram', woonplaats: 'Arnhem', actief: true }],
    Edities: [{ id: E1, jaar: 2027, titel: 'Ardennen', stap, periodeVan: '2027-01-01', periodeTot: '2027-12-31', voorkeursmaanden: [4, 5], deadline: '2027-03-01T23:59:00+01:00', blokken: {}, lijsten: {}, versie: 1, bijgewerkt: '2027-01-01T00:00:00Z' }],
    Deelnemers: [
      { id: ANNA, editieId: E1, lidId: 'lid0000000000001', rol: 'deelnemer' },
      { id: BRAM, editieId: E1, lidId: 'lid0000000000002', rol: 'deelnemer' },
    ],
    Sessies: [
      { id: 'ses0000000000001', tokenHash: hashToken(nodeSha256, tokenA), soort: 'deelnemer', subjectId: ANNA, verloopt: '2027-12-01T00:00:00Z' },
      { id: 'ses0000000000002', tokenHash: hashToken(nodeSha256, tokenB), soort: 'deelnemer', subjectId: BRAM, verloopt: '2027-12-01T00:00:00Z' },
    ],
  };
  const nep = maakNepApi({ seed, nu: () => nu });
  const vraag = (sessie, actie, data) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, sessie, actie, data }));
  return { nep, tokenA, tokenB, vraag, deelnemer: (id) => { nep.store.nieuwVerzoek(); return nep.store.vind('Deelnemers', id); } };
}

test('FRM-8: opslaan bewaart de antwoorden met versie 1 en een tweede keer met versie 2', () => {
  const { tokenA, vraag } = omgeving();
  const eerste = vraag(tokenA, 'antwoordenOpslaan', { versie: 0, data: GELDIG });
  assert.equal(eerste.ok, true);
  assert.equal(eerste.data.versie, 1);
  const tweede = vraag(tokenA, 'antwoordenOpslaan', { versie: 1, data: { ...GELDIG, budgetWeekend: 50000 } });
  assert.equal(tweede.data.versie, 2);
  const scherm = vraag(tokenA, 'scherm', { naam: 'formulier' });
  assert.equal(scherm.data.antwoorden.versie, 2);
  assert.equal(scherm.data.antwoorden.data.budgetWeekend, 50000);
});

test('AAN-33: ingevuld is minstens een weekend, beide budgetten en de reistijd', () => {
  assert.deepEqual(ontbreekt({}), ['een weekend', 'budget verblijf', 'budget weekend', 'reistijd']);
  assert.equal(isIngevuld(GELDIG), true);
  assert.deepEqual(ontbreekt({ ...GELDIG, maxReistijdUur: undefined }), ['reistijd']);
  assert.deepEqual(ontbreekt({ ...GELDIG, beschikbaarheid: {} }), ['een weekend']);
  assert.equal(isIngevuld({ ...GELDIG, beschikbaarheid: { '2027-04-09': 'nee' } }), true);
});

test('AAN-33 FRM-8: opslaan zet ingevuld en ingevuldOp op de deelnemer en haalt ze weg als er iets ontbreekt', () => {
  const { tokenA, vraag, deelnemer } = omgeving();
  const half = vraag(tokenA, 'antwoordenOpslaan', { versie: 0, data: { budgetVerblijf: 5000 } });
  assert.equal(half.data.ingevuld, false);
  assert.deepEqual(half.data.ontbreekt, ['een weekend', 'budget weekend', 'reistijd']);
  assert.equal(deelnemer(ANNA).ingevuld, false);
  const vol = vraag(tokenA, 'antwoordenOpslaan', { versie: 1, data: GELDIG });
  assert.equal(vol.data.ingevuld, true);
  assert.equal(deelnemer(ANNA).ingevuld, true);
  assert.equal(deelnemer(ANNA).ingevuldOp, NU.toISOString());
  assert.equal(deelnemer(BRAM).ingevuld, false);
  vraag(tokenA, 'antwoordenOpslaan', { versie: 2, data: { ...GELDIG, beschikbaarheid: {} } });
  assert.equal(deelnemer(ANNA).ingevuld, false);
  assert.equal(deelnemer(ANNA).ingevuldOp, '');
});

test('FRM-10: een oude versie geeft gewijzigd en laat de nieuwste antwoorden ongemoeid', () => {
  const { tokenA, vraag } = omgeving();
  vraag(tokenA, 'antwoordenOpslaan', { versie: 0, data: GELDIG });
  vraag(tokenA, 'antwoordenOpslaan', { versie: 1, data: { ...GELDIG, maxReistijdUur: 4 } });
  const oud = vraag(tokenA, 'antwoordenOpslaan', { versie: 1, data: { ...GELDIG, maxReistijdUur: 9 } });
  assert.equal(oud.ok, false);
  assert.equal(oud.fout, 'gewijzigd');
  assert.equal(vraag(tokenA, 'scherm', { naam: 'formulier' }).data.antwoorden.data.maxReistijdUur, 4);
  // Nog niets opgeslagen maar toch een versie meesturen kan niet kloppen.
  const { tokenB, vraag: vraag2 } = omgeving();
  assert.equal(vraag2(tokenB, 'antwoordenOpslaan', { versie: 3, data: GELDIG }).fout, 'gewijzigd');
});

test('FRM-9: na de deadline en vanaf de stap Overzicht is opslaan gesloten en meldt het scherm de reden', () => {
  const laat = omgeving({ nu: new Date('2027-03-02T10:00:00Z') });
  assert.equal(laat.vraag(laat.tokenA, 'antwoordenOpslaan', { versie: 0, data: GELDIG }).fout, 'gesloten');
  assert.equal(laat.vraag(laat.tokenA, 'scherm', { naam: 'formulier' }).data.alleenLezen, 'deadline');
  const stap = omgeving({ stap: 'overzicht' });
  assert.equal(stap.vraag(stap.tokenA, 'antwoordenOpslaan', { versie: 0, data: GELDIG }).fout, 'gesloten');
  assert.equal(stap.vraag(stap.tokenA, 'scherm', { naam: 'formulier' }).data.alleenLezen, 'stap');
  const open = omgeving();
  assert.equal(open.vraag(open.tokenA, 'scherm', { naam: 'formulier' }).data.alleenLezen, null);
});

test('FRM-2 FRM-3: budgetten, reistijd en woonplaats volgen de schijven en grenzen van 7.4', () => {
  const { tokenA, vraag } = omgeving();
  const slecht = (data) => vraag(tokenA, 'antwoordenOpslaan', { versie: 0, data }).fout;
  assert.equal(slecht({ budgetVerblijf: 7500 }), 'ongeldig');
  assert.equal(slecht({ budgetVerblijf: 105000 }), 'ongeldig');
  assert.equal(slecht({ budgetWeekend: 15000 }), 'ongeldig');
  assert.equal(slecht({ maxReistijdUur: 0 }), 'ongeldig');
  assert.equal(slecht({ maxReistijdUur: 13 }), 'ongeldig');
  assert.equal(slecht({ woonplaats: 'U' }), 'ongeldig');
  assert.equal(slecht({ woonplaats: 'x'.repeat(61) }), 'ongeldig');
  assert.equal(slecht({ beschikbaarheid: { '2027-04-10': 'ja' } }), 'ongeldig'); // een zaterdag
  assert.equal(slecht({ beschikbaarheid: { '2028-04-07': 'ja' } }), 'ongeldig'); // buiten de periode
  assert.equal(slecht({ verblijf: { sauna: 'lieverWel' } }), 'ongeldig'); // lieverWel hoort alleen bij eigenKamer
  assert.equal(slecht({ programmaEigen: 'x'.repeat(501) }), 'ongeldig');
  assert.equal(vraag(tokenA, 'antwoordenOpslaan', { versie: 0, data: { budgetVerblijf: 5000, budgetWeekend: 100000, maxReistijdUur: 12, woonplaats: ' Utrecht ' } }).ok, true);
  assert.equal(vraag(tokenA, 'scherm', { naam: 'formulier' }).data.antwoorden.data.woonplaats, 'Utrecht');
});

test('FRM-2: schijftekst en bovengrens volgen 7.4.3', () => {
  assert.equal(schijfTekst(BUDGET_VERBLIJF, 0), 'tot €50');
  assert.equal(schijfTekst(BUDGET_VERBLIJF, 1), '€50 tot €100');
  assert.equal(schijfTekst(BUDGET_VERBLIJF, 19), '€950 tot €1000');
  assert.equal(schijfTekst(BUDGET_WEEKEND, 0), 'tot €100');
  assert.equal(schijfTekst(BUDGET_WEEKEND, 9), '€900 tot €1000');
  assert.equal(bovengrens(BUDGET_VERBLIJF, 2), 15000); // €100 tot €150
});

test('FRM-4 FRM-1: de acht verblijfswensen worden bewaard en het scherm geeft de instellingen en standaardwoonplaats', () => {
  const { tokenA, vraag } = omgeving();
  const verblijf = { eigenKamer: 'lieverWel', eigenBadkamer: 'maaktNietUit', sauna: 'ja', bubbelbad: 'nee', barbecue: 'ja', buitenruimte: 'ja', schoonmaak: 'ja', linnengoed: 'ja' };
  assert.equal(vraag(tokenA, 'antwoordenOpslaan', { versie: 0, data: { ...GELDIG, verblijf } }).ok, true);
  const scherm = vraag(tokenA, 'scherm', { naam: 'formulier' }).data;
  assert.deepEqual(scherm.antwoorden.data.verblijf, verblijf);
  assert.equal(scherm.standaardWoonplaats, 'Zwolle');
  assert.equal(scherm.editie.periodeVan, '2027-01-01');
  assert.deepEqual(scherm.editie.voorkeursmaanden, [4, 5]);
});

test('FRM-8: ieder ziet en wijzigt alleen zijn eigen antwoorden', () => {
  const { tokenA, tokenB, vraag } = omgeving();
  vraag(tokenA, 'antwoordenOpslaan', { versie: 0, data: GELDIG });
  const bram = vraag(tokenB, 'scherm', { naam: 'formulier' }).data;
  assert.equal(bram.antwoorden.versie, 0);
  assert.deepEqual(bram.antwoorden.data, {});
  assert.equal(vraag(tokenB, 'antwoordenOpslaan', { versie: 0, data: { budgetVerblijf: 5000 } }).data.versie, 1);
  assert.equal(vraag(tokenA, 'scherm', { naam: 'formulier' }).data.antwoorden.data.budgetVerblijf, 15000);
});

test('AAN-52: de acht verblijfswensen hebben een label en alleen eigen kamer kent liever wel', () => {
  assert.deepEqual(VERBLIJF_WENSEN.map((w) => w.sleutel), ['eigenKamer', 'eigenBadkamer', 'sauna', 'bubbelbad', 'barbecue', 'buitenruimte', 'schoonmaak', 'linnengoed']);
  assert.ok(VERBLIJF_WENSEN.every((w) => w.label && w.opties.length === 3));
  assert.deepEqual(VERBLIJF_WENSEN.filter((w) => w.opties.some(([k]) => k === 'lieverWel')).map((w) => w.sleutel), ['eigenKamer']);
});
