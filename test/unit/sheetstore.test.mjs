import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maakSheetStore } from '../../src/server/gas/sheetstore.js';
import { nodeRandom } from '../mock-backend/memorystore.mjs';
import { nepSpreadsheet } from './nep-gas.mjs';

const maak = (ss = nepSpreadsheet()) => ({ ss, store: maakSheetStore(ss, { flush: () => {}, random: nodeRandom, nu: () => new Date('2027-03-01T10:00:00Z') }) });

const LASTIG = ['=IMPORTXML("https://x.example","//a")', '+31612345678', '-1', '@iemand', '2027-04-09', '09:30', '1/2', '0012', 'true'];

test('NFR-19: lastige invoer komt ongewijzigd als tekst terug', () => {
  const { ss, store } = maak();
  store.nieuwVerzoek();
  const ids = LASTIG.map((t) => store.voegToe('Programma', { editieId: 'e1', dag: 'za', begin: t, titel: t, notitie: t }).id);
  store.nieuwVerzoek();
  const rijen = store.lees('Programma');
  assert.deepEqual(rijen.map((r) => r.id), ids);
  rijen.forEach((r, i) => {
    assert.equal(r.titel, LASTIG[i]);
    assert.equal(r.begin, LASTIG[i]);
    assert.equal(r.notitie, LASTIG[i]);
  });
  for (const rij of ss.getSheetByName('Programma').cellen) {
    for (const c of rij) {
      assert.equal(c.formaat, '@');
      assert.equal(typeof c.waarde, 'string');
    }
  }
});

test('NFR-19: elk bereik krijgt tekstopmaak vóór setValues', () => {
  const { ss, store } = maak();
  store.nieuwVerzoek();
  const lid = store.voegToe('Leden', { voornaam: '=1+1', woonplaats: '2027-04-09', actief: true });
  store.werkBij('Leden', lid.id, { voornaam: '@x' });
  const g = ss.gebeurtenissen;
  assert.ok(g.length >= 4);
  for (let i = 0; i < g.length; i += 2) {
    assert.match(g[i], /^formaat /);
    assert.equal(g[i + 1], g[i].replace('formaat', 'waarden'));
  }
});

test('NFR-19: zonder tekstopmaak zou de nagebootste Sheet omzetten (controle op de nabootsing)', () => {
  const ss = nepSpreadsheet();
  const blad = ss.insertSheet('X');
  blad.getRange(1, 1, 1, 2).setValues([['2027-04-09', '=1+1']]);
  assert.ok(blad.cellen[0][0].waarde instanceof Date);
  assert.equal(typeof blad.cellen[0][1].waarde, 'object');
});

test('NFR-19: getallen, booleans en JSON krijgen bij lezen hun type terug', () => {
  const { store } = maak();
  store.nieuwVerzoek();
  const e = store.voegToe('Edities', { jaar: 2027, titel: 'Ardennen', stap: 'invullen', voorkeursmaanden: [4, 5], boodschappenDefinitief: false, deadline: '2027-03-01T23:59:00+01:00' });
  store.nieuwVerzoek();
  const terug = store.vind('Edities', e.id);
  assert.equal(terug.jaar, 2027);
  assert.deepEqual(terug.voorkeursmaanden, [4, 5]);
  assert.equal(terug.boodschappenDefinitief, false);
  assert.equal(terug.versie, 1);
  assert.equal(terug.deadline, '2027-03-01T23:59:00+01:00');
  assert.equal(terug.bijgewerkt, '2027-03-01T10:00:00.000Z');
  assert.equal(terug.periodeVan, '');
  assert.equal(terug.stapData, null);
});

test('NFR-15: elke tab wordt per verzoek hooguit één keer gelezen', () => {
  const { ss, store } = maak();
  store.nieuwVerzoek();
  store.voegToe('Leden', { voornaam: 'Anna', woonplaats: 'Utrecht', actief: true });
  store.nieuwVerzoek();
  store.lees('Leden');
  store.lees('Leden');
  store.vind('Leden', 'bestaat-niet');
  assert.equal(ss.tellers.getValues.get('Leden'), 2); // één keer per verzoek
  assert.equal(ss.tellers.getValues.get('Edities'), undefined);
});

test('NFR-14: werkBij met een oude versie geeft gewijzigd en verandert niets', () => {
  const { store } = maak();
  store.nieuwVerzoek();
  const e = store.voegToe('Edities', { titel: 'A', stap: 'invullen' });
  const na = store.werkBij('Edities', e.id, { titel: 'B' }, 1);
  assert.equal(na.versie, 2);
  assert.throws(() => store.werkBij('Edities', e.id, { titel: 'C' }, 1), (f) => f.code === 'gewijzigd');
  store.nieuwVerzoek();
  assert.equal(store.vind('Edities', e.id).titel, 'B');
});

test('Store: verwijderen en leegmaken houden de rijen kloppend', () => {
  const { store } = maak();
  store.nieuwVerzoek();
  const a = store.voegToe('Leden', { voornaam: 'A', actief: true });
  const b = store.voegToe('Leden', { voornaam: 'B', actief: true });
  store.voegToe('Leden', { voornaam: 'C', actief: true });
  store.verwijder('Leden', a.id);
  store.werkBij('Leden', b.id, { woonplaats: 'Zwolle' });
  store.nieuwVerzoek();
  assert.deepEqual(store.lees('Leden').map((l) => [l.voornaam, l.woonplaats]), [['B', 'Zwolle'], ['C', '']]);
  store.leeg('Leden');
  store.nieuwVerzoek();
  assert.deepEqual(store.lees('Leden'), []);
});

test('Store: een onbekende kolom is een programmeerfout', () => {
  const { store } = maak();
  store.nieuwVerzoek();
  assert.throws(() => store.voegToe('Leden', { email: 'x@y.nl' }), /onbekende kolom/);
});
