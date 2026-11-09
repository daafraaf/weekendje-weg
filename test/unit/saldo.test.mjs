import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saldi, totalen } from '../../src/shared/saldo.js';
import { AANDEEL_MAX } from '../../src/shared/verdeling.js';
import { CATEGORIE_SLEUTELS } from '../../src/shared/geld.js';

const NAMEN = { jan: 'Jan', klaas: 'Klaas', piet: 'Piet', bas: 'Bas' };
const naamVan = (id) => NAMEN[id] || '';

test('GELD-7 §7.13.6: saldo is betaald min aandeel, min ontvangen plus aandeel, plus gedane min gekregen betalingen', () => {
  const posten = [
    { soort: 'uitgave', bedrag: 10000, betalerId: 'jan', categorie: 'verblijf', verdeling: { wijze: 'gelijk', deelnemers: ['jan', 'klaas', 'piet'] } },
    { soort: 'ontvangst', bedrag: 3000, betalerId: 'klaas', categorie: 'verblijf', verdeling: { wijze: 'gelijk', deelnemers: ['jan', 'klaas', 'piet'] } },
  ];
  const s = saldi(posten, [{ vanId: 'piet', naarId: 'jan', bedrag: 1000 }], { deelnemers: ['jan', 'klaas', 'piet', 'bas'], naamVan });
  // jan betaalde 10000, deelt 3334 (restcent), krijgt 1000 uit de ontvangst en kreeg 1000 van Piet
  assert.deepEqual(s, { jan: 10000 - 3334 + 1000 - 1000, klaas: -3333 - 3000 + 1000, piet: -3333 + 1000 + 1000, bas: 0 });
  assert.equal(Object.values(s).reduce((a, b) => a + b, 0), 0);
});

// Kleine vaste generator, zodat een fout reproduceerbaar is.
function lcg(zaad) {
  let x = zaad >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; };
}

test('GELD-7: eigenschapstest, bij 1000 willekeurige posten is de som van de saldi altijd nul', () => {
  const r = lcg(20270611);
  const getal = (n) => Math.floor(r() * n);
  const ids = Array.from({ length: 12 }, (_, i) => `d${String(i).padStart(2, '0')}`);
  const namen = Object.fromEntries(ids.map((id, i) => [id, ['Eva', 'Anna', 'Bram', 'Chris', 'Anna'][i % 5]]));
  const kies = () => ids.filter(() => r() < 0.5);
  const posten = [];
  while (posten.length < 1000) {
    const bedrag = 1 + getal(500000);
    const wijze = ['gelijk', 'aandeel', 'bedrag'][getal(3)];
    const wie = kies();
    if (!wie.length) continue;
    let verdeling;
    if (wijze === 'gelijk') verdeling = { wijze, deelnemers: wie };
    else if (wijze === 'aandeel') verdeling = { wijze, aandelen: Object.fromEntries(wie.map((id, i) => [id, i === 0 ? 1 + getal(AANDEEL_MAX) : getal(AANDEEL_MAX + 1)])) };
    else {
      const bedragen = {};
      let rest = bedrag;
      wie.forEach((id, i) => { const c = i === wie.length - 1 ? rest : getal(rest + 1); bedragen[id] = c; rest -= c; });
      verdeling = { wijze, bedragen };
    }
    posten.push({ soort: r() < 0.2 ? 'ontvangst' : 'uitgave', bedrag, betalerId: ids[getal(ids.length)], categorie: CATEGORIE_SLEUTELS[getal(6)], verdeling });
  }
  const betalingen = Array.from({ length: 50 }, () => ({ vanId: ids[getal(12)], naarId: ids[getal(12)], bedrag: 1 + getal(10000) }));
  const naamVan2 = (id) => namen[id];
  for (const n of [1, 10, 100, 1000]) {
    const s = saldi(posten.slice(0, n), betalingen, { deelnemers: ids, naamVan: naamVan2 });
    assert.equal(Object.values(s).reduce((a, b) => a + b, 0), 0, `${n} posten`);
    assert.ok(Object.values(s).every(Number.isInteger));
  }
});

test('AAN-60: totalen per categorie zijn netto en jouw deel trekt je aandeel in ontvangsten af', () => {
  const posten = [
    { soort: 'uitgave', bedrag: 9000, betalerId: 'jan', categorie: 'activiteit', verdeling: { wijze: 'aandeel', aandelen: { jan: 1, klaas: 2 } } },
    { soort: 'uitgave', bedrag: 4000, betalerId: 'jan', categorie: 'verblijf', verdeling: { wijze: 'gelijk', deelnemers: ['jan', 'klaas'] } },
    { soort: 'ontvangst', bedrag: 1000, betalerId: 'klaas', categorie: 'verblijf', verdeling: { wijze: 'gelijk', deelnemers: ['jan', 'klaas'] } },
  ];
  const t = totalen(posten, { ikId: 'klaas', naamVan });
  assert.equal(t.totaal, 12000);
  assert.equal(t.mijnDeel, 6000 + 2000 - 500);
  assert.deepEqual(t.categorieen.map((c) => [c.label, c.bedrag]), [['Verblijf', 3000], ['Activiteit', 9000]]);
});
