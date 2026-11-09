import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { feestdagTabel } from '../../src/shared/feestdagen.js';
import { maandNotities, schooljaarBekend, vanOpenData, weekendKenmerken } from '../../src/shared/vakanties.js';
import { datumKort, standaardPeriode, vrijdagen, weekdag } from '../../src/shared/datums.js';
import { maandVullen, tel, volgendeWaarde, zetWaarde } from '../../src/shared/beschikbaarheid.js';

const DATA = {
  schooljaren: ['2026-2027'],
  vakanties: ['noord', 'midden', 'zuid'].map((regio) => ({ naam: 'Meivakantie', regio, van: '2027-04-24', tot: '2027-05-02' }))
    .concat([{ naam: 'Voorjaarsvakantie', regio: 'noord', van: '2027-02-20', tot: '2027-02-28' }]),
};
const FEEST = feestdagTabel(2027, 2028);

test('KAL-1: een weekend is een vrijdag, in het hele kalenderjaar', () => {
  const v = vrijdagen('2027-01-01', '2027-12-31');
  assert.equal(v[0], '2027-01-01');
  assert.equal(v.length, 53); // 1 januari en 31 december 2027 zijn beide een vrijdag
  assert.ok(v.every((d) => weekdag(d) === 4));
  assert.equal(vrijdagen('2027-01-02', '2027-01-08').join(), '2027-01-08');
});

test('AAN-15: het standaardvenster is het kalenderjaar van de editie', () => {
  assert.deepEqual(standaardPeriode(2027), { periodeVan: '2027-01-01', periodeTot: '2027-12-31' });
});

test('AAN-17: tikken doorloopt leeg, ja, misschien, nee, leeg', () => {
  const rij = [undefined];
  for (let i = 0; i < 4; i += 1) rij.push(volgendeWaarde(rij[i]));
  assert.deepEqual(rij, [undefined, 'ja', 'misschien', 'nee', undefined]);
  assert.deepEqual(zetWaarde({ a: 'ja' }, 'a', undefined), {});
});

test('KAL-7: hele maand zet alleen lege weekenden en laat ingevulde staan', () => {
  const nieuw = maandVullen({ '2027-04-09': 'nee' }, ['2027-04-02', '2027-04-09', '2027-04-16'], 'ja');
  assert.deepEqual(nieuw, { '2027-04-02': 'ja', '2027-04-09': 'nee', '2027-04-16': 'ja' });
  assert.deepEqual(tel(nieuw, ['2027-04-02', '2027-04-09', '2027-04-23']), { ja: 1, misschien: 0, nee: 1, leeg: 1 });
});

test('KAL-4: meivakantie geldt voor het weekend dat erin valt, met alle drie de regio\'s', () => {
  assert.deepEqual(weekendKenmerken('2027-04-23', FEEST, DATA).regios, ['noord', 'midden', 'zuid']); // zaterdag 24 april valt erin
  assert.deepEqual(weekendKenmerken('2027-05-07', FEEST, DATA).regios, []);
  assert.deepEqual(weekendKenmerken('2027-02-19', FEEST, DATA).regios, ['noord']);
});

test('KAL-4: feestdag en lang weekend volgens §7.3.4', () => {
  const goede = weekendKenmerken('2027-03-26', FEEST, DATA);
  assert.deepEqual(goede.feestdagen, ['Goede Vrijdag', 'Eerste Paasdag', 'Tweede Paasdag']);
  assert.equal(goede.langWeekend, true);
  const kerst = weekendKenmerken('2027-12-24', FEEST, DATA); // zaterdag en zondag, maandag is gewoon
  assert.deepEqual(kerst.feestdagen, ['Eerste Kerstdag', 'Tweede Kerstdag']);
  assert.equal(kerst.langWeekend, false);
  const nieuwjaar = weekendKenmerken('2027-12-31', FEEST, DATA); // 1 januari 2028 valt op zaterdag
  assert.deepEqual(nieuwjaar.feestdagen, ['Nieuwjaarsdag']);
  const pinksteren = weekendKenmerken('2027-05-14', FEEST, DATA); // maandag 17 mei is tweede Pinksterdag
  assert.deepEqual(pinksteren.feestdagen, ['Eerste Pinksterdag', 'Tweede Pinksterdag']);
  assert.equal(pinksteren.langWeekend, true);
  assert.equal(weekendKenmerken('2027-05-21', FEEST, DATA).langWeekend, false);
});

test('KAL-4: Koningsdag op dinsdag staat onder de maand, niet in een weekend', () => {
  assert.equal(weekendKenmerken('2027-04-23', FEEST, DATA).feestdagen.length, 0);
  const regels = maandNotities(2027, 4, new Map([...FEEST].filter(([d]) => d.startsWith('2027-04'))), DATA).map((r) => r.tekst);
  assert.ok(regels.includes('Koningsdag: 27 apr'));
  assert.ok(regels.includes('Meivakantie, regio noord, midden, zuid: 24 apr tot en met 2 mei'));
  assert.equal(datumKort('2027-04-27'), '27 apr');
});

test('KAL-6 AAN-49: buiten de bekende schooljaren staat er "vakanties nog niet bekend"', () => {
  assert.equal(schooljaarBekend('2027-04-23', DATA), true);
  assert.equal(schooljaarBekend('2027-09-03', DATA), false);
  const sept = maandNotities(2027, 9, new Map(), DATA).map((r) => r.tekst);
  assert.deepEqual(sept, ['Schoolvakanties nog niet bekend.']);
  assert.ok(!maandNotities(2027, 4, new Map(), DATA).some((r) => r.soort === 'onbekend'));
  assert.equal(weekendKenmerken('2027-09-03', FEEST, DATA).bekend, false);
});

test('AAN-13 en KAL-6: de open data wordt omgezet naar vakanties per regio', () => {
  const uit = vanOpenData([{ content: [{ title: 'Schoolvakanties 2026-2027', vacations: [
    { type: 'Kerstvakantie ', regions: [{ region: 'heel Nederland', startdate: '2026-12-19T00:00:00.000Z', enddate: '2027-01-03T00:00:00.000Z' }] },
    { type: 'Zomervakantie', regions: [{ region: 'noord', startdate: '2027-07-03', enddate: '2027-08-15' }, { region: 'kapot', startdate: 'x', enddate: 'y' }] },
  ] }] }, { content: [] }]);
  assert.deepEqual(uit.schooljaren, ['2026-2027']);
  assert.equal(uit.vakanties.length, 4);
  assert.deepEqual(uit.vakanties[0], { naam: 'Kerstvakantie', regio: 'noord', van: '2026-12-19', tot: '2027-01-03' });
  assert.deepEqual(uit.vakanties[3], { naam: 'Zomervakantie', regio: 'noord', van: '2027-07-03', tot: '2027-08-15' });
});

test('AAN-13: het meegeleverde data/vakanties.json heeft de vorm die de kalender leest', async () => {
  const data = JSON.parse(await readFile(new URL('../../data/vakanties.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(data.schooljaren));
  for (const v of data.vakanties) {
    assert.match(v.van, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(v.tot >= v.van);
    assert.ok(['noord', 'midden', 'zuid'].includes(v.regio));
  }
  assert.deepEqual(weekendKenmerken('2027-04-23', FEEST, data).regios, ['noord', 'midden', 'zuid']);
});
