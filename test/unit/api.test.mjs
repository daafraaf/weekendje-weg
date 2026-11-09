import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maakApi, ACTIES, API_VERSIE } from '../../src/server/api.js';
import { TABS } from '../../src/server/store.js';
import { v } from '../../src/server/validatie.js';
import { hashToken, maakToken } from '../../src/server/crypto.js';
import { maakNepApi, startServer } from '../mock-backend/server.mjs';
import { maakMemoryStore, maakMemoryLock, nodeSha256, nodeRandom } from '../mock-backend/memorystore.mjs';

const E1 = 'editie0000000001';
const E2 = 'editie0000000002';
const NU = new Date('2027-02-01T12:00:00Z');
const toek = () => maakToken(nodeRandom);

function demo() {
  const sDeelnemer = toek(), sBeheer = toek(), sOud = toek(), sAnders = toek();
  const seed = {
    Groep: [{ naam: 'Studievrienden', apiVersie: 1, opgezet: true, aangemaakt: '2027-01-01T00:00:00Z' }],
    Leden: [{ id: 'lid0000000000001', voornaam: 'Anna', actief: true }, { id: 'lid0000000000002', voornaam: 'Bram', actief: true }],
    Edities: [
      { id: E1, jaar: 2027, titel: 'Ardennen', stap: 'invullen', deadline: '2027-03-01T23:59:00+01:00', versie: 1, bijgewerkt: '2027-01-01T00:00:00Z' },
      { id: E2, jaar: 2026, titel: 'Veluwe', stap: 'afgerond', versie: 1, bijgewerkt: '2026-01-01T00:00:00Z' },
    ],
    Deelnemers: [
      { id: 'dln0000000000001', editieId: E1, lidId: 'lid0000000000001', rol: 'organisator' },
      { id: 'dln0000000000002', editieId: E1, lidId: 'lid0000000000002', rol: 'deelnemer' },
    ],
    Beheerlinks: [{ id: 'bhl0000000000001', lidId: 'lid0000000000001', actief: true }],
    Sessies: [
      { id: 'ses0000000000001', tokenHash: hashToken(nodeSha256, sDeelnemer), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2027-03-01T00:00:00Z' },
      { id: 'ses0000000000002', tokenHash: hashToken(nodeSha256, sBeheer), soort: 'beheer', subjectId: 'bhl0000000000001', verloopt: '2027-02-01T23:00:00Z' },
      { id: 'ses0000000000003', tokenHash: hashToken(nodeSha256, sOud), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2027-01-01T00:00:00Z' },
      { id: 'ses0000000000004', tokenHash: hashToken(nodeSha256, sAnders), soort: 'deelnemer', subjectId: 'dln0000000000001', verloopt: '2027-03-01T00:00:00Z' },
    ],
  };
  return { seed, sDeelnemer, sBeheer, sOud, sAnders };
}

const editieBijwerken = {
  schema: v.object({ titel: v.tekst({ min: 1, max: 80 }), versie: v.getal({ min: 1 }) }),
  uitvoeren: ({ store, editieId, data }) => ({ versie: store.werkBij('Edities', editieId, { titel: data.titel }, data.versie).versie }),
};

function nep(handlers = {}) {
  const d = demo();
  return { ...d, ...maakNepApi({ seed: d.seed, handlers, nu: () => NU }) };
}
const vraag = (api, verzoek) => api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, ...verzoek }));

test('status zonder sessie geeft apiVersie en opgezet', () => {
  const { api } = maakNepApi();
  assert.deepEqual(api.verwerk('{"actie":"status"}'), { ok: true, data: { apiVersie: API_VERSIE, opgezet: false } });
  assert.deepEqual(api.verwerkGet(), { ok: true, data: { apiVersie: API_VERSIE, opgezet: false } });
  assert.equal(nep().api.verwerk('{"actie":"status"}').data.opgezet, true);
});

test('npm run mock: de nepbackend beantwoordt een text/plain POST op localhost', async () => {
  const { server, url } = await startServer({ port: 0 });
  try {
    const r = await fetch(`${url}/macros/s/demo/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{"actie":"status"}' });
    const j = await r.json();
    assert.equal(j.ok, true);
    assert.equal(j.data.apiVersie, API_VERSIE);
  } finally {
    server.close();
  }
});

test('TOE-6: elke actie met gegevens zonder geldige sessie geeft geen_toegang', () => {
  const { api } = nep();
  const open = ['status', 'inloggenDeelnemer', 'inloggenBeheer', 'wachtwoordInstellen', 'groepOpzetten'];
  for (const actie of Object.keys(ACTIES)) {
    if (open.includes(actie)) continue;
    const data = actie === 'scherm' ? { naam: 'start' } : {};
    assert.equal(vraag(api, { actie, editieId: E1, data }).fout, 'geen_toegang', `${actie} zonder sessie`);
    assert.equal(vraag(api, { actie, sessie: toek(), editieId: E1, data }).fout, 'geen_toegang', `${actie} met onbekende sessie`);
  }
});

test('TOE-6: een verlopen sessie geeft verlopen, status blijft werken', () => {
  const { api, sOud } = nep();
  assert.equal(vraag(api, { actie: 'scherm', sessie: sOud, data: { naam: 'start' } }).fout, 'verlopen');
  assert.equal(vraag(api, { actie: 'status', sessie: sOud }).ok, true);
});

test('TOE-6: een deelnemerssessie hoort bij één editie', () => {
  const { api, sDeelnemer } = nep({ editieBijwerken });
  assert.equal(vraag(api, { actie: 'afvinken', sessie: sDeelnemer, editieId: E2 }).fout, 'geen_toegang');
});

test('TOE-7: een deelnemerssessie kan via de API geen beheeractie uitvoeren', () => {
  const { api, sDeelnemer, sAnders } = nep({ editieBijwerken });
  const r = vraag(api, { actie: 'editieBijwerken', sessie: sDeelnemer, data: { titel: 'X', versie: 1 } });
  assert.equal(r.fout, 'geen_toegang');
  // Ook niet als de deelnemer in deze editie de rol organisator heeft: beheer vraagt een beheersessie.
  assert.equal(vraag(api, { actie: 'editieBijwerken', sessie: sAnders, data: { titel: 'X', versie: 1 } }).fout, 'geen_toegang');
  assert.equal(vraag(api, { actie: 'scherm', sessie: sDeelnemer, data: { naam: 'beheer' } }).fout, 'geen_toegang');
});

test('TOE-7: de beheersessie van de organisator mag beheren in zijn editie', () => {
  const { api, sBeheer } = nep({ editieBijwerken });
  const r = vraag(api, { actie: 'editieBijwerken', sessie: sBeheer, editieId: E1, data: { titel: 'Ardennen 2027', versie: 1 } });
  assert.deepEqual(r, { ok: true, data: { versie: 2 } });
  assert.equal(vraag(api, { actie: 'editieBijwerken', sessie: sBeheer, editieId: E2, data: { titel: 'X', versie: 1 } }).fout, 'geen_toegang');
});

test('NFR-6: onbekende velden, verkeerde typen en te lange tekst worden geweigerd', () => {
  const { api, sBeheer } = nep({ editieBijwerken });
  const basis = { actie: 'editieBijwerken', sessie: sBeheer, editieId: E1 };
  assert.equal(vraag(api, { ...basis, data: { titel: 'A', versie: 1, extra: 1 } }).fout, 'ongeldig');
  assert.equal(vraag(api, { ...basis, data: { titel: 5, versie: 1 } }).fout, 'ongeldig');
  assert.equal(vraag(api, { ...basis, data: { titel: 'x'.repeat(81), versie: 1 } }).fout, 'ongeldig');
  assert.equal(vraag(api, { ...basis, data: { titel: 'A', versie: 1.5 } }).fout, 'ongeldig');
  assert.equal(vraag(api, { ...basis, onbekend: true, data: { titel: 'A', versie: 1 } }).fout, 'ongeldig');
  assert.equal(vraag(api, { actie: 'bestaatNiet' }).fout, 'ongeldig');
  assert.equal(vraag(api, { actie: 'status', data: { x: 1 } }).fout, 'ongeldig');
  assert.equal(api.verwerk('geen json').fout, 'ongeldig');
  assert.equal(api.verwerk('[1,2]').fout, 'ongeldig');
  assert.equal(api.verwerk('').fout, 'ongeldig');
  assert.equal(vraag(api, { actie: 'scherm', sessie: sBeheer, editieId: E1, data: { naam: 'geheim' } }).fout, 'ongeldig');
});

test('NFR-6: validatie van datum, tijd, keuze en map', async () => {
  const { valideer } = await import('../../src/server/validatie.js');
  const ok = (s, w) => assert.doesNotThrow(() => valideer(s, w));
  const nee = (s, w) => assert.throws(() => valideer(s, w), (f) => f.code === 'ongeldig');
  ok(v.datum(), '2027-02-28'); nee(v.datum(), '2027-02-30'); nee(v.datum(), '27-2-1');
  ok(v.tijd(), '09:30'); nee(v.tijd(), '24:00');
  ok(v.isoTijd(), '2027-03-01T23:59:00+01:00'); nee(v.isoTijd(), '2027-03-01 23:59');
  ok(v.keuze(['ja', 'nee']), 'ja'); nee(v.keuze(['ja', 'nee']), 'misschien');
  ok(v.map(v.datum(), v.keuze(['ja'])), { '2027-04-09': 'ja' });
  nee(v.map(v.datum(), v.keuze(['ja'])), { 'morgen': 'ja' });
  nee(v.map(v.tekst(), v.getal()), JSON.parse('{"__proto__": 1}'));
  nee(v.lijst(v.getal(), { max: 2 }), [1, 2, 3]);
  nee(v.object({ a: v.getal() }), {});
  ok(v.object({ a: v.optioneel(v.getal()) }), {});
});

test('NFR-7: geen kolom voor e-mail, telefoon, adres of rekeningnummer van deelnemers', () => {
  for (const [tab, { kolommen }] of Object.entries(TABS)) {
    for (const k of Object.keys(kolommen)) {
      if (tab === 'Programma' && k === 'adres') continue; // adres van een activiteit, niet van een deelnemer
      assert.doesNotMatch(k, /mail|telefoon|phone|adres|iban|rekening/i, `${tab}.${k}`);
    }
  }
});

test('NFR-14: twee parallelle schrijfacties op dezelfde rij geven één gewijzigd', async () => {
  const d = demo();
  const { server, url, store } = await startServer({ port: 0, seed: d.seed, handlers: { editieBijwerken }, nu: () => NU });
  try {
    const body = (titel) => JSON.stringify({ actie: 'editieBijwerken', apiVersie: API_VERSIE, sessie: d.sBeheer, editieId: E1, data: { titel, versie: 1 } });
    const post = (titel) => fetch(`${url}/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body(titel) }).then((r) => r.json());
    const antwoorden = await Promise.all([post('Eerste'), post('Tweede')]);
    assert.equal(antwoorden.filter((a) => a.ok).length, 1);
    assert.deepEqual(antwoorden.filter((a) => !a.ok).map((a) => a.fout), ['gewijzigd']);
    store.nieuwVerzoek();
    assert.equal(store.vind('Edities', E1).versie, 2);
  } finally {
    server.close();
  }
});

test('NFR-14: zonder slot geeft een schrijfactie druk en raakt de Store niet', () => {
  const d = demo();
  const { store, adapter } = maakMemoryStore(d.seed);
  const lock = maakMemoryLock();
  let uitgevoerd = false;
  const api = maakApi({ store, lock, sha256: nodeSha256, random: nodeRandom, nu: () => NU, handlers: { afvinken: { uitvoeren: () => { uitgevoerd = true; } } } });
  lock.tryLock(10000); // een ander verzoek heeft het slot
  const voor = adapter.leesTellers.size;
  assert.equal(vraag(api, { actie: 'afvinken', sessie: d.sDeelnemer }).fout, 'druk');
  assert.equal(uitgevoerd, false);
  assert.equal(adapter.leesTellers.size, voor);
  lock.releaseLock();
  assert.equal(vraag(api, { actie: 'afvinken', sessie: d.sDeelnemer }).ok, true);
  assert.equal(lock.bezet, false); // slot vrijgegeven in finally
});

test('NFR-14: het slot wordt ook na een fout vrijgegeven', () => {
  const { api, lock, sDeelnemer } = nep({ afvinken: { uitvoeren: () => { throw new Error('kapot'); } } });
  assert.equal(vraag(api, { actie: 'afvinken', sessie: sDeelnemer }).fout, 'fout');
  assert.equal(lock.bezet, false);
});

test('een onverwachte fout geeft JSON met code fout zonder details', () => {
  const { api, sDeelnemer } = nep({ afvinken: { uitvoeren: () => { throw new Error('geheime stacktrace'); } } });
  const orig = console.error; console.error = () => {};
  try {
    const r = vraag(api, { actie: 'afvinken', sessie: sDeelnemer });
    assert.deepEqual(Object.keys(r).sort(), ['fout', 'melding', 'ok']);
    assert.equal(r.fout, 'fout');
    assert.doesNotMatch(r.melding, /stacktrace/);
  } finally {
    console.error = orig;
  }
});

test('api_versie: een afwijkende versie wordt geweigerd', () => {
  const { api } = nep();
  assert.equal(api.verwerk(JSON.stringify({ actie: 'status', apiVersie: API_VERSIE + 1 })).fout, 'api_versie');
});

test('NFR-16: een schrijfactie komt in het Log zonder vrije tekst of geheimen', () => {
  const { api, store, sBeheer } = nep({ editieBijwerken });
  const geheimeTitel = 'Mijn vrije tekst';
  assert.equal(vraag(api, { actie: 'editieBijwerken', sessie: sBeheer, editieId: E1, data: { titel: geheimeTitel, versie: 1 } }).ok, true);
  store.nieuwVerzoek();
  const log = store.lees('Log');
  assert.equal(log.length, 1);
  assert.deepEqual({ ...log[0], tijd: undefined }, { tijd: undefined, actie: 'editieBijwerken', wie: 'bhl0000000000001', editieId: E1, detail: '' });
  const tekst = JSON.stringify(log);
  assert.ok(!tekst.includes(geheimeTitel));
  assert.ok(!tekst.includes(sBeheer));
  assert.ok(!tekst.includes(hashToken(nodeSha256, sBeheer)));
});

test('NFR-15: een leesactie leest alleen de tabs die ze nodig heeft', () => {
  const { api, adapter } = nep();
  adapter.leesTellers.clear();
  api.verwerk('{"actie":"status"}');
  assert.deepEqual([...adapter.leesTellers.keys()], ['Groep']);
});

test('AAN-39: de beheersessie gebruikt de deelnemersrij van het eigen lid', () => {
  let gezien;
  const { api, sBeheer } = nep({ antwoordenOpslaan: { uitvoeren: ({ sessie }) => { gezien = sessie.deelnemerId; } } });
  assert.equal(vraag(api, { actie: 'antwoordenOpslaan', sessie: sBeheer, editieId: E1 }).ok, true);
  assert.equal(gezien, 'dln0000000000001');
});

test('AAN-29: na Afgerond weigert de API schrijfacties met gesloten', () => {
  const d = demo();
  d.seed.Deelnemers.push({ id: 'dln0000000000003', editieId: E2, lidId: 'lid0000000000001', rol: 'organisator' });
  const { api } = maakNepApi({ seed: d.seed, handlers: { editieBijwerken }, nu: () => NU });
  assert.equal(vraag(api, { actie: 'editieBijwerken', sessie: d.sBeheer, editieId: E2, data: { titel: 'X', versie: 1 } }).fout, 'gesloten');
});

test('een bekende actie zonder handler geeft ongeldig na de rechtencontrole', () => {
  const { api, sDeelnemer } = nep();
  assert.equal(vraag(api, { actie: 'afvinken', sessie: sDeelnemer }).fout, 'ongeldig');
  assert.equal(vraag(api, { actie: 'linksMaken', sessie: sDeelnemer }).fout, 'geen_toegang');
});
