import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tellWeekenden, topWeekenden, voorkeursdatum, vergelijk, TOP } from '../../src/shared/rangorde.js';
import { STAPPEN, stapMogelijk, vorigeStap, volgendeStap } from '../../src/shared/stappen.js';

const W = ['2027-04-02', '2027-04-09', '2027-04-16', '2027-05-07', '2027-06-04', '2027-06-11'];

test('OVZ-4: telling per weekend over ja, misschien, nee en niet ingevuld', () => {
  const t = tellWeekenden(W.slice(0, 2), [{ '2027-04-02': 'ja' }, { '2027-04-02': 'nee', '2027-04-09': 'misschien' }, {}], [4]);
  assert.deepEqual(t[0], { vrijdag: '2027-04-02', ja: 1, misschien: 0, nee: 1, leeg: 1, voorkeursmaand: true });
  assert.deepEqual(t[1], { vrijdag: '2027-04-09', ja: 0, misschien: 1, nee: 0, leeg: 2, voorkeursmaand: true });
});

test('AAN-06: minste nee gaat voor meeste ja', () => {
  const t = tellWeekenden(W.slice(0, 2), [{ '2027-04-02': 'ja' }, { '2027-04-02': 'ja' }, { '2027-04-02': 'nee', '2027-04-09': 'misschien' }]);
  assert.equal(voorkeursdatum(t).vrijdag, '2027-04-09'); // 0 nee wint van 2 ja met 1 nee
});

test('AAN-06: dan meeste ja, dan meeste misschien, dan voorkeursmaand, dan de vroegste', () => {
  const r = (o) => ({ vrijdag: '2027-01-01', ja: 0, misschien: 0, nee: 0, leeg: 0, voorkeursmaand: false, ...o });
  assert.ok(vergelijk(r({ ja: 3 }), r({ ja: 2, misschien: 5 })) < 0);
  assert.ok(vergelijk(r({ ja: 2, misschien: 2 }), r({ ja: 2, misschien: 1 })) < 0);
  assert.ok(vergelijk(r({ voorkeursmaand: true, vrijdag: '2027-09-03' }), r({ vrijdag: '2027-01-01' })) < 0);
  assert.ok(vergelijk(r({ vrijdag: '2027-01-08' }), r({ vrijdag: '2027-01-15' })) < 0);
});

test('OVZ-5 AAN-06: de top 5 in rangorde met gelijke stand gemarkeerd', () => {
  const ant = [
    { '2027-06-11': 'ja', '2027-05-07': 'ja', '2027-06-04': 'ja', '2027-04-16': 'nee' },
    { '2027-06-11': 'ja', '2027-05-07': 'misschien', '2027-06-04': 'misschien', '2027-04-02': 'nee' },
  ];
  const top = topWeekenden(tellWeekenden(W, ant, [5]));
  assert.equal(top.length, TOP);
  assert.deepEqual(top.map((t) => t.vrijdag), ['2027-06-11', '2027-05-07', '2027-06-04', '2027-04-09', '2027-04-02']);
  assert.deepEqual(top.map((t) => t.plek), [1, 2, 3, 4, 5]);
  assert.equal(top[0].gelijk, false);
  assert.equal(top[1].gelijk, true); // 7 mei en 4 juni hebben dezelfde aantallen; mei is voorkeursmaand
  assert.equal(top[2].gelijk, true);
  assert.equal(topWeekenden([]).length, 0);
  assert.equal(voorkeursdatum([]), null);
});

test('AAN-05: één stap vooruit of terug, ook van Afgerond naar Afrekening, niet terug naar Invullen vanaf Accommodatie', () => {
  assert.ok(stapMogelijk('afgerond', 'afrekenen'));
  assert.ok(stapMogelijk('invullen', 'overzicht'));
  assert.ok(stapMogelijk('overzicht', 'invullen'));
  assert.ok(stapMogelijk('accommodatie', 'overzicht'));
  assert.ok(!stapMogelijk('accommodatie', 'invullen'));
  assert.ok(!stapMogelijk('invullen', 'accommodatie'));
  assert.ok(!stapMogelijk('weekend', 'weekend'));
  assert.equal(vorigeStap('invullen'), null);
  assert.equal(vorigeStap('overzicht'), 'invullen');
  assert.equal(volgendeStap('afgerond'), null);
  for (let i = 0; i + 1 < STAPPEN.length; i += 1) assert.ok(stapMogelijk(STAPPEN[i], STAPPEN[i + 1]));
});
