import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feestdagen, feestdagTabel, koningsdag, pasen } from '../../src/shared/feestdagen.js';

// KAL-5: vaste testtabel, per jaar: Pasen, Goede Vrijdag, Koningsdag, Hemelvaart, eerste Pinksterdag.
const TABEL = {
  2026: { pasen: '2026-04-05', goedeVrijdag: '2026-04-03', koning: '2026-04-27', hemelvaart: '2026-05-14', pinksteren: '2026-05-24' },
  2027: { pasen: '2027-03-28', goedeVrijdag: '2027-03-26', koning: '2027-04-27', hemelvaart: '2027-05-06', pinksteren: '2027-05-16' },
  2028: { pasen: '2028-04-16', goedeVrijdag: '2028-04-14', koning: '2028-04-27', hemelvaart: '2028-05-25', pinksteren: '2028-06-04' },
  2029: { pasen: '2029-04-01', goedeVrijdag: '2029-03-30', koning: '2029-04-27', hemelvaart: '2029-05-10', pinksteren: '2029-05-20' },
  2030: { pasen: '2030-04-21', goedeVrijdag: '2030-04-19', koning: '2030-04-27', hemelvaart: '2030-05-30', pinksteren: '2030-06-09' },
};

for (const [jaar, w] of Object.entries(TABEL)) {
  test(`KAL-5: feestdagen ${jaar} kloppen met de testtabel`, () => {
    const per = Object.fromEntries(feestdagen(+jaar).map((f) => [f.naam, f.datum]));
    assert.equal(pasen(+jaar), w.pasen);
    assert.equal(per['Eerste Paasdag'], w.pasen);
    assert.equal(per['Goede Vrijdag'], w.goedeVrijdag);
    assert.equal(per.Koningsdag, w.koning);
    assert.equal(per.Hemelvaartsdag, w.hemelvaart);
    assert.equal(per['Eerste Pinksterdag'], w.pinksteren);
    assert.equal(per.Nieuwjaarsdag, `${jaar}-01-01`);
    assert.equal(per.Bevrijdingsdag, `${jaar}-05-05`);
    assert.equal(per['Eerste Kerstdag'], `${jaar}-12-25`);
    assert.equal(per['Tweede Kerstdag'], `${jaar}-12-26`);
    assert.equal(feestdagen(+jaar).length, 11);
  });
}

test('KAL-5: Koningsdag is 26 april als 27 april op zondag valt', () => {
  assert.equal(koningsdag(2025), '2025-04-26');
  assert.equal(koningsdag(2031), '2031-04-26');
  assert.equal(koningsdag(2027), '2027-04-27');
});

test('KAL-5: tweede Paasdag en tweede Pinksterdag zijn de maandag erna', () => {
  const per = Object.fromEntries(feestdagen(2027).map((f) => [f.naam, f.datum]));
  assert.equal(per['Tweede Paasdag'], '2027-03-29');
  assert.equal(per['Tweede Pinksterdag'], '2027-05-17');
});

test('KAL-5: de tabel over meerdere jaren heeft elke datum met zijn naam', () => {
  const t = feestdagTabel(2027, 2028);
  assert.equal(t.get('2028-01-01'), 'Nieuwjaarsdag');
  assert.equal(t.get('2027-04-27'), 'Koningsdag');
});
