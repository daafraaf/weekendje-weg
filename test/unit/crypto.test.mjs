import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { hashGeheim, hashToken, maakToken, maakPincode, maakId, base64url, utf8, gelijk, ITERATIES } from '../../src/server/crypto.js';
import { maakGasSha256, maakGasRandom } from '../../src/server/gas/random.js';
import { nodeSha256, nodeRandom } from '../mock-backend/memorystore.mjs';
import { nepUtilities } from './nep-gas.mjs';

// Vaste testvector (spec §7.1.4): zelfde uitkomst in Node en in de GAS-code.
const VECTOR = { geheim: '123456', salt: 'zout-vast-01', iteraties: 1000, hash: '2TZS1uDOme0uox-wR6hcCtnYDmWtONyTG4CD23hKz1E' };

function referentie(geheim, salt, iteraties) {
  let h = createHash('sha256').update(`${salt}:${geheim}`, 'utf8').digest();
  for (let i = 1; i < iteraties; i++) h = createHash('sha256').update(Buffer.concat([h, Buffer.from(salt, 'utf8')])).digest();
  return h.toString('base64url');
}

test('NFR-1: de hashtestvector is gelijk in Node, in de GAS-adapter en in de referentie', () => {
  const gas = maakGasSha256(nepUtilities());
  assert.equal(hashGeheim(nodeSha256, VECTOR.geheim, VECTOR.salt, VECTOR.iteraties), VECTOR.hash);
  assert.equal(hashGeheim(gas, VECTOR.geheim, VECTOR.salt, VECTOR.iteraties), VECTOR.hash);
  assert.equal(referentie(VECTOR.geheim, VECTOR.salt, VECTOR.iteraties), VECTOR.hash);
  assert.equal(hashGeheim(gas, 'wachtwoord €😀', 'z', 3), referentie('wachtwoord €😀', 'z', 3));
});

test('NFR-1: computeDigest krijgt signed bytes, de adapter geeft unsigned terug', () => {
  const gas = maakGasSha256(nepUtilities());
  const bytes = Array.from({ length: 256 }, (_, i) => i);
  const uit = gas(bytes);
  assert.deepEqual(uit, nodeSha256(bytes));
  assert.ok(uit.every((b) => b >= 0 && b <= 255));
});

test('NFR-1: tokens staan als SHA-256 zonder salt', () => {
  const t = 'abcdefghijklmnopqrstuv';
  assert.equal(hashToken(nodeSha256, t), createHash('sha256').update(t).digest('base64url'));
});

test('AAN-32: pincode en wachtwoord gebruiken iteraties en een salt', () => {
  assert.ok(ITERATIES >= 1000);
  assert.notEqual(hashGeheim(nodeSha256, 'x', 'a'), hashGeheim(nodeSha256, 'x', 'b'));
  assert.notEqual(hashGeheim(nodeSha256, 'x', 'a', 1), hashGeheim(nodeSha256, 'x', 'a', 2));
});

test('base64url en utf8 kloppen met Node', () => {
  for (const n of [0, 1, 2, 3, 16, 31, 32]) {
    const b = nodeRandom.bytes(n);
    assert.equal(base64url(b), Buffer.from(b).toString('base64url'));
  }
  assert.deepEqual(utf8('é€😀a'), [...Buffer.from('é€😀a', 'utf8')]);
  assert.ok(gelijk('abc', 'abc'));
  assert.ok(!gelijk('abc', 'abd'));
  assert.ok(!gelijk('abc', 'abcd'));
});

test('§7.1.3: tokens zijn 22 tekens base64url, ids 16 tekens, ook met de GAS-willekeur', () => {
  for (const random of [nodeRandom, maakGasRandom(nepUtilities())]) {
    const t = maakToken(random);
    assert.match(t, /^[A-Za-z0-9_-]{22}$/);
    assert.match(maakId(random), /^[A-Za-z0-9_-]{16}$/);
    assert.notEqual(maakToken(random), t);
  }
  assert.equal(maakGasRandom(nepUtilities()).bytes(40).length, 40);
});

test('AAN-36: het script kiest een pincode van zes cijfers met rejection sampling', () => {
  for (let i = 0; i < 200; i++) assert.match(maakPincode(nodeRandom), /^\d{6}$/);
  // 0xFFFFFFFF ligt boven de grens en wordt weggegooid; daarna 0x00000007 geeft 000007.
  const reeks = [[255, 255, 255, 255], [0, 0, 0, 7]];
  assert.equal(maakPincode({ bytes: () => reeks.shift() }), '000007');
});
