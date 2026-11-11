import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UITLEG, ROUTE_STAPPEN, uitlegVoor, routeGezien, zetRouteGezien, ROUTE_SLEUTEL } from '../../src/web/uitleg.js';
import { STAPPEN } from '../../src/shared/stappen.js';

test('UIT-2: elke stap heeft uitleg met gebeurt, oplevert en een tekst per rol', () => {
  for (const s of STAPPEN) {
    for (const veld of ['gebeurt', 'oplevert', 'deelnemer', 'organisator']) assert.ok(UITLEG[s][veld].length > 0, `${s}.${veld}`);
    assert.notEqual(uitlegVoor(s, true).jij, uitlegVoor(s, false).jij, `${s}: de rollen verschillen`);
  }
  assert.equal(ROUTE_STAPPEN.length, 6);
  assert.equal(uitlegVoor('bestaatniet', false), null);
});

test('UIT-2: de teksten noemen geen uitgezette onderdelen en gebruiken geen gedachtestreepjes', () => {
  const alles = JSON.stringify(UITLEG).toLowerCase();
  for (const woord of ['boodschap', 'kookbeurt', 'programma', 'kamerindeling', 'carpool', 'rijden', 'koken']) assert.ok(!alles.includes(woord), woord);
  assert.ok(!/[–—]/.test(alles));
});

test('UIT-2: de deadline staat alleen bij Invullen en is informatief', () => {
  for (const s of STAPPEN.filter((x) => x !== 'invullen')) assert.ok(!JSON.stringify(UITLEG[s]).toLowerCase().includes('deadline'), s);
});

test('UIT-2 §7.14 BV-18: de uitleg zegt dat Meenemen en Afrekening in elke stap open zijn', () => {
  for (const [s, naam] of [['voorbereiding', 'Meenemen'], ['afrekenen', 'Afrekening']]) {
    assert.ok(UITLEG[s].gebeurt.includes(`${naam} staat in elke stap open`), s);
  }
  // In de eerste stap, waar de deelnemer begint, staat het ook.
  assert.ok(UITLEG.invullen.deelnemer.includes('Meenemen en Afrekening'), 'invullen');
});

test('AAN-85: de vlag ww-route-gezien overleeft een opslag die faalt', () => {
  const opslag = new Map();
  const goed = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, v) };
  assert.equal(routeGezien(goed), false);
  zetRouteGezien(goed);
  assert.equal(opslag.get(ROUTE_SLEUTEL), '1');
  assert.equal(ROUTE_SLEUTEL, 'ww-route-gezien');
  assert.equal(routeGezien(goed), true);
  const kapot = { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('vol'); } };
  assert.equal(routeGezien(kapot), false);
  assert.doesNotThrow(() => zetRouteGezien(kapot));
});
