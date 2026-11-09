import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { MAX_FOUT, BLOKKADE_MS, SESSIE_DEELNEMER_MS, resetPogingen } from '../../src/server/acties/toegang.js';
import { hashToken } from '../../src/server/crypto.js';
import { leesLink, scriptUrl, scriptIdGeldig, leesSessie, bewaarSessie, wisSessie } from '../../src/web/sessie.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const START = Date.parse('2027-01-10T12:00:00Z');

function opzet(opties) {
  const demo = maakDemo(opties);
  const klok = { ms: START };
  const nep = maakNepApi({ seed: demo.seed, nu: () => new Date(klok.ms) });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, ...verzoek }));
  const login = (i, pin) => vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[i], pin } });
  // Het scherm heeft nog geen handler: 'ongeldig' betekent dat sessie en rechten zijn geslaagd.
  const status = (sessie) => vraag({ actie: 'scherm', sessie, data: { naam: 'start' } }).fout;
  return { demo, klok, nep, vraag, login, status };
}

test('TOE-1: een onbekend token en een foute pincode geven geen naam, editie of voortgang', () => {
  const { vraag, demo } = opzet();
  const onbekend = vraag({ actie: 'inloggenDeelnemer', data: { token: 'A'.repeat(22), pin: '123456' } });
  assert.deepEqual(onbekend, { ok: false, fout: 'geen_toegang', melding: 'Je hebt hier geen toegang toe.' });
  const fout = vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[1], pin: '000000' } });
  assert.equal(fout.ok, false);
  const tekst = JSON.stringify(fout);
  for (const naam of demo.namen) assert.ok(!tekst.includes(naam), naam);
  assert.ok(!tekst.includes('Weekendje weg 2027'));
  assert.ok(!tekst.includes('demo-editie'));
});

test('TOE-1: een pincode of token met de verkeerde vorm wordt geweigerd', () => {
  const { vraag, demo } = opzet();
  assert.equal(vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[0], pin: '12345' } }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[0], pin: '12345a' } }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'inloggenDeelnemer', data: { token: 'kort', pin: '123456' } }).fout, 'ongeldig');
});

test('TOE-2: juiste link en pincode geven een sessie die 60 dagen werkt (AAN-02)', () => {
  const { status, login, klok, demo, nep } = opzet();
  const r = login(1, demo.pin);
  assert.equal(r.ok, true);
  assert.equal(r.data.soort, 'deelnemer');
  assert.equal(Date.parse(r.data.verloopt), START + SESSIE_DEELNEMER_MS);
  assert.equal(SESSIE_DEELNEMER_MS, 60 * 24 * 3600 * 1000);
  assert.equal(status(r.data.sessie), 'ongeldig');
  nep.store.nieuwVerzoek();
  const rij = nep.store.lees('Sessies')[0];
  assert.equal(rij.tokenHash, hashToken(nodeSha256, r.data.sessie)); // alleen de hash staat in de Sheet
  assert.ok(!JSON.stringify(nep.store.lees('Sessies')).includes(r.data.sessie));
  klok.ms = START + SESSIE_DEELNEMER_MS - 1000;
  assert.equal(status(r.data.sessie), 'ongeldig');
  klok.ms = START + SESSIE_DEELNEMER_MS + 1000;
  assert.equal(status(r.data.sessie), 'verlopen');
});

test('AAN-02: een login ruimt verlopen sessies op', () => {
  const { login, klok, demo, nep } = opzet();
  login(1, demo.pin);
  klok.ms = START + SESSIE_DEELNEMER_MS + 1000;
  login(2, demo.pin);
  nep.store.nieuwVerzoek();
  const sessies = nep.store.lees('Sessies');
  assert.equal(sessies.length, 1);
  assert.equal(sessies[0].subjectId, 'dln0000000000003');
});

test('TOE-3 AAN-01: vijf foute pincodes blokkeren het token 15 minuten en tonen tot wanneer', () => {
  const { login, klok, demo } = opzet();
  for (let i = 1; i < MAX_FOUT; i++) {
    const r = login(1, '000000');
    assert.equal(r.fout, 'geen_toegang');
    assert.equal(r.data.resterend, MAX_FOUT - i);
  }
  const vijfde = login(1, '000000');
  assert.equal(vijfde.fout, 'geblokkeerd');
  assert.equal(vijfde.data.tot, new Date(START + BLOKKADE_MS).toISOString());
  assert.equal(BLOKKADE_MS, 15 * 60 * 1000);
  // tijdens de blokkade helpt ook de juiste pincode niet, en raden telt niet mee
  klok.ms = START + 5 * 60 * 1000;
  const juist = login(1, demo.pin);
  assert.equal(juist.fout, 'geblokkeerd');
  assert.equal(juist.data.tot, vijfde.data.tot);
  // een ander token is niet geblokkeerd
  assert.equal(login(2, demo.pin).ok, true);
  klok.ms = START + BLOKKADE_MS + 1000;
  assert.equal(login(1, demo.pin).ok, true);
});

test('TOE-3: een geslaagde login zet de teller van foute pogingen op nul', () => {
  const { login, demo } = opzet();
  for (let i = 0; i < MAX_FOUT - 1; i++) login(1, '000000');
  assert.equal(login(1, demo.pin).ok, true);
  assert.equal(login(1, '000000').data.resterend, MAX_FOUT - 1);
});

test('TOE-4 AAN-01: na drie blokkades werkt de pincode niet meer tot er een nieuwe is', () => {
  const { login, klok, demo, nep } = opzet();
  for (let ronde = 1; ronde <= 3; ronde++) {
    for (let i = 0; i < MAX_FOUT; i++) login(1, '000000');
    klok.ms += BLOKKADE_MS + 1000;
  }
  const dicht = login(1, demo.pin);
  assert.equal(dicht.fout, 'geblokkeerd');
  assert.equal(dicht.data.nieuwePincodeNodig, true);
  assert.match(dicht.melding, /nieuwe pincode/);
  klok.ms += 24 * 3600 * 1000;
  assert.equal(login(1, demo.pin).fout, 'geblokkeerd');
  // de derde blokkade zelf meldt al dat de organisator een nieuwe pincode moet maken
  const verse = opzet();
  for (let ronde = 1; ronde <= 2; ronde++) {
    for (let i = 0; i < MAX_FOUT; i++) verse.login(1, '000000');
    verse.klok.ms += BLOKKADE_MS + 1000;
  }
  for (let i = 0; i < MAX_FOUT - 1; i++) verse.login(1, '000000');
  assert.equal(verse.login(1, '000000').data.nieuwePincodeNodig, true);
  // een nieuwe pincode of link zet de teller op nul
  nep.store.nieuwVerzoek();
  resetPogingen(nep.store, demo.tokenHash[1]);
  assert.equal(login(1, demo.pin).ok, true);
});

test('TOE-4: de teller overleeft verzoeken (fouten worden bewaard)', () => {
  const { login, nep, demo } = opzet();
  login(1, '000000');
  login(1, '000000');
  nep.store.nieuwVerzoek();
  const rij = nep.store.vind('Pogingen', demo.tokenHash[1]);
  assert.equal(rij.fout, 2);
});

test('TOE-9: uitloggen verwijdert de sessie in de Sheet', () => {
  const { vraag, status, login, demo, nep } = opzet();
  const { sessie } = login(1, demo.pin).data;
  const andere = login(2, demo.pin).data.sessie;
  assert.deepEqual(vraag({ actie: 'uitloggen', sessie }), { ok: true, data: {} });
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Sessies').length, 1);
  assert.equal(vraag({ actie: 'scherm', sessie, data: { naam: 'start' } }).fout, 'geen_toegang');
  assert.equal(status(andere), 'ongeldig');
  assert.equal(vraag({ actie: 'uitloggen' }).fout, 'geen_toegang');
});

test('NFR-16: inloggen schrijft geen pincode, token of sessie in het Log', () => {
  const { login, demo, nep } = opzet();
  const { sessie } = login(1, demo.pin).data;
  nep.store.nieuwVerzoek();
  const tekst = JSON.stringify(nep.store.lees('Log'));
  assert.ok(tekst.includes('inloggenDeelnemer'));
  for (const geheim of [demo.pin, demo.tokens[1], sessie, demo.tokenHash[1]]) assert.ok(!tekst.includes(geheim));
});

test('TOE-10: de voorkant weigert een scriptId dat niet aan het patroon voldoet', () => {
  assert.equal(scriptIdGeldig('AKfycbx_demo-weekendje-0001'), true);
  for (const slecht of ['kort', 'evil.com/x', 'a'.repeat(19), 'a'.repeat(121), 'abc def ghi jkl mno pq', 'abc/../def/ghi/jkl/mnop', '', null, undefined]) {
    assert.equal(scriptIdGeldig(slecht), false, String(slecht));
    assert.throws(() => scriptUrl(slecht));
  }
  assert.equal(scriptUrl('A'.repeat(20)), `https://script.google.com/macros/s/${'A'.repeat(20)}/exec`);
  const token = 'T'.repeat(22);
  assert.equal(leesLink(`#b=evil.com%2Fx&t=${token}`), null);
  assert.equal(leesLink(`#b=${'a'.repeat(19)}&t=${token}`), null);
});

test('TOE-11: een geplakte link, fragment of beheerlink wordt herkend', () => {
  const b = 'AKfycbx_demo-weekendje-0001';
  const token = 'abc'.padEnd(22, 'x');
  const verwacht = { scriptId: b, soort: 'deelnemer', token };
  assert.deepEqual(leesLink(`https://studievrienden.github.io/weekendje-weg/#b=${b}&t=${token}`), verwacht);
  assert.deepEqual(leesLink(`  #b=${b}&t=${token}\n`), verwacht);
  assert.deepEqual(leesLink(`b=${b}&t=${token}`), verwacht);
  assert.deepEqual(leesLink(`https://x.nl/#b=${b}&beheer=${token}`), { scriptId: b, soort: 'beheer', token });
  for (const slecht of ['', '   ', 'hallo', `#b=${b}`, `#b=${b}&t=kort`, `#b=${b}&t=${token}&beheer=${token}`, '#/start?stap=weekend', '<img src=x onerror=alert(1)>']) {
    assert.equal(leesLink(slecht), null, slecht);
  }
});

test('TOE-2: de voorkant bewaart de sessie en vergeet ze als ze verlopen of kapot is', () => {
  const opslag = new Map();
  const mock = { getItem: (k) => (opslag.has(k) ? opslag.get(k) : null), setItem: (k, v) => opslag.set(k, v), removeItem: (k) => opslag.delete(k) };
  const s = { scriptId: 'AKfycbx_demo-weekendje-0001', sessie: 'abc', soort: 'deelnemer', verloopt: '2027-03-11T12:00:00.000Z', editieId: 'demo-editie-2027' };
  assert.equal(leesSessie(mock, START), null);
  bewaarSessie(mock, s);
  assert.deepEqual(leesSessie(mock, START), s);
  assert.equal(leesSessie(mock, Date.parse('2027-03-12T00:00:00Z')), null);
  mock.setItem('ww-sessie', '{kapot');
  assert.equal(leesSessie(mock, START), null);
  bewaarSessie(mock, { ...s, scriptId: 'evil.com/x' });
  assert.equal(leesSessie(mock, START), null);
  bewaarSessie(mock, s);
  wisSessie(mock);
  assert.equal(leesSessie(mock, START), null);
});
