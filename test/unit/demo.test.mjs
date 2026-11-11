// De demodata uit spec §11 (test/fixtures/demo.json): per stap de inhoud die de spec noemt, gelezen via de API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakVolledigeDemo, DEMO_2026_ID, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { STAPPEN } from '../../src/shared/stappen.js';

const NU = new Date('2026-12-01T12:00:00Z');

function demo(stap) {
  const d = maakVolledigeDemo({ stap });
  const nep = maakNepApi({ seed: d.seed, nu: () => NU });
  const vraag = (v) => nep.api.verwerk(JSON.stringify({ apiVersie: 2, ...v }));
  const sessie = (naam, jaar = 2027) => {
    const r = vraag({ actie: 'inloggenDeelnemer', data: { token: d.tokens[jaar][naam], pin: d.pin } });
    assert.equal(r.ok, true, JSON.stringify(r));
    return r.data.sessie;
  };
  const scherm = (naam, wie = 'Bas', jaar = 2027) => {
    const r = vraag({ actie: 'scherm', sessie: sessie(wie, jaar), data: { naam } });
    assert.equal(r.ok, true, JSON.stringify(r));
    return r.data;
  };
  return { d, nep, vraag, sessie, scherm };
}

test('§11: groep Studievrienden met zes leden verspreid over Nederland en twee edities', () => {
  const { d } = demo('invullen');
  assert.equal(d.seed.Groep[0].naam, 'Studievrienden');
  assert.deepEqual(d.seed.Leden.map((l) => l.voornaam), ['Anne', 'Bas', 'Daan', 'Eva', 'Joris', 'Sanne']);
  assert.equal(new Set(d.seed.Leden.map((l) => l.woonplaats)).size, 6);
  assert.deepEqual(d.seed.Edities.map((e) => [e.jaar, e.stap]), [[2026, 'afgerond'], [2027, 'invullen']]);
  // Elke deelnemer heeft een vaste link en pincode 123456; de nepbackend toont de links.
  assert.equal(d.pin, '123456');
  assert.equal(d.links[2027].length, 6);
  for (const l of d.links[2027]) assert.match(l.fragment, /^#b=demo-weekendje-weg-0001&t=[A-Za-z0-9_-]{22}$/);
});

test('§11: editie 2026 is afgerond met weekend 2 tot en met 4 oktober, geboekte accommodatie en alles betaald', () => {
  const { d, scherm } = demo('invullen');
  const e = d.seed.Edities.find((x) => x.id === DEMO_2026_ID);
  assert.equal(e.vastgelegdWeekend, '2026-10-02');
  assert.equal(e.deelvorm, 'samen');
  assert.equal(e.geboektAccommodatieId, 'accDemo202600001');
  const posten = d.seed.Posten.filter((p) => p.editieId === DEMO_2026_ID);
  assert.deepEqual([...new Set(posten.map((p) => p.verdeling.wijze))].sort(), ['aandeel', 'bedrag', 'gelijk']);
  assert.equal(posten.filter((p) => p.soort === 'ontvangst').length, 1);
  const af = scherm('afrekening', 'Bas', 2026);
  assert.equal(af.open.length, 0);
  assert.ok(af.betaald.length >= 3);
  assert.deepEqual(af.saldi.map((s) => s.saldo), [0, 0, 0, 0, 0, 0]);
  const archief = scherm('archief', 'Bas', 2026).edities.find((x) => x.jaar === 2026);
  assert.equal(archief.accommodatie.naam, 'Boshuis De Veldhoek');
  assert.deepEqual(archief.organisatoren, ['Eva']);
});

test('§11 stap invullen: vier van de zes hebben ingevuld', () => {
  const { scherm } = demo('invullen');
  const v = scherm('voortgang');
  assert.equal(v.deelnemers.length, 6);
  assert.equal(v.deelnemers.filter((x) => x.ingevuld).length, 4);
});

test('§11 stap overzicht: alle zes ingevuld, een duidelijke voorkeursdatum en een gelijkspel op de tweede plek', () => {
  const { scherm } = demo('overzicht');
  const o = scherm('overzicht');
  assert.equal(o.ingevuld, 6);
  assert.equal(o.top[0].vrijdag, '2027-05-21');
  assert.equal(o.top[0].gelijk, false);
  assert.deepEqual(o.top.slice(1, 3).map((t) => [t.vrijdag, t.gelijk]), [['2027-04-16', true], ['2027-10-01', true]]);
  assert.ok(o.top[0].ja > o.top[1].ja);
});

test('§11 ACC-11 ACC-14 stap accommodatie: drie accommodaties met een top 3 van vijf van de zes, bedden en eigen kamers', () => {
  const { scherm } = demo('accommodatie');
  const a = scherm('accommodaties');
  assert.equal(a.deelvorm, 'samen');
  assert.equal(a.vastgelegdWeekend, '2027-05-21');
  assert.deepEqual(a.accommodaties.map((x) => [x.punten, x.mensen]), [[13, 5], [9, 4], [5, 3]]);
  assert.equal(a.gaven, 5);
  assert.deepEqual(a.accommodaties.map((x) => [x.bedden, x.eigenKamers]), [[8, 4], [10, 1], [6, null]]);
});

test('§11 stap voorbereiding: claims met een dubbele claim, definitieve boodschappen, twee kookbeurten, kamers en twee ritten', () => {
  const { scherm } = demo('voorbereiding');
  const m = scherm('meenemen');
  assert.equal(m.definitief, true);
  assert.ok(m.items.some((i) => i.claims.length >= 2), 'dubbele claim');
  assert.ok(m.items.filter((i) => i.claims.length).length >= 4);
  assert.ok(m.items.some((i) => i.maaltijd), 'ingrediënt van een kok');
  const k = scherm('kookbeurten');
  assert.equal(k.maaltijden.filter((x) => x.koks.length).length, 2);
  const kamers = scherm('kamers');
  assert.ok(kamers.kamers.length >= 2);
  assert.equal(kamers.zonderKamer.length, 0);
  assert.equal(scherm('carpool').ritten.length, 2);
  assert.equal(scherm('accommodaties').geboektId, 'accDemo202700001');
});

test('§11 stap weekend: een programma', () => {
  const { scherm } = demo('weekend');
  assert.ok(scherm('programma').punten.length >= 3);
  assert.ok(scherm('posten').posten.length >= 2);
});

test('§11 stap afrekenen: open en betaalde betalingen en één afgehaakte deelnemer met gedeelde kosten', () => {
  const { d, scherm } = demo('afrekenen');
  const af = scherm('afrekening');
  assert.ok(af.open.length >= 1);
  assert.equal(af.betaald.length, 2);
  const joris = d.deelnemerIds[2027].Joris;
  const rij = d.seed.Deelnemers.find((x) => x.id === joris);
  assert.equal(rij.afgehaakt, true);
  assert.ok(af.open.some((b) => b.vanId === joris), 'de afgehaakte betaalt zijn aandeel');
  assert.equal(d.seed.Kamerindeling.some((k) => k.deelnemerId === joris), false);
});

test('§11: de demo bouwt in elke stap en elk scherm leest zonder fout', () => {
  for (const stap of STAPPEN) {
    const { scherm } = demo(stap);
    for (const naam of ['start', 'formulier', 'voortgang', 'meenemen', 'kookbeurten', 'programma', 'kamers', 'carpool', 'posten', 'afrekening', 'archief']) scherm(naam);
  }
});

test('AAN-31: elke editie heeft eigen links en pincodes; de link van een afgeronde editie leest alleen', () => {
  const { d, vraag, sessie } = demo('voorbereiding');
  for (const naam of d.namen) assert.notEqual(d.tokens[2026][naam], d.tokens[2027][naam]);
  const oud = sessie('Bas', 2026);
  const archief = vraag({ actie: 'scherm', sessie: oud, data: { naam: 'archief' } });
  assert.equal(archief.ok, true);
  assert.equal(archief.data.edities.length, 2); // AAN-30: het archief van de groep
  const start = vraag({ actie: 'scherm', sessie: oud, data: { naam: 'start' } });
  assert.equal(start.data.editie.id, DEMO_2026_ID);
  // Schrijven met de oude link: alleen-lezen (AAN-29), en nooit in de editie van dit jaar.
  const item = d.seed.Items.find((i) => i.editieId === DEMO_EDITIE_ID);
  assert.equal(vraag({ actie: 'claimen', sessie: oud, editieId: DEMO_EDITIE_ID, data: { itemId: item.id } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'postOpslaan', sessie: oud, data: { soort: 'uitgave', omschrijving: 'Te laat', bedrag: 100, betalerId: d.deelnemerIds[2026].Bas, datum: '2026-10-03', categorie: 'overig', verdeling: { wijze: 'gelijk', deelnemers: [d.deelnemerIds[2026].Bas] } } }).fout, 'gesloten');
});
