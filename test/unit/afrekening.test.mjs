import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afrekening } from '../../src/shared/afrekening.js';
import { saldi } from '../../src/shared/saldo.js';
import { betaalverzoekTekst, heeftLinkEnPincode } from '../../src/shared/whatsapp.js';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const EVA = 'dln0000000000001';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';
const CHRIS = 'dln0000000000004';
const WACHTWOORD = 'duinpan-kraanvogel';

// Past de betalingen toe op de saldi: de betaler gaat omhoog, de ontvanger omlaag.
function naBetalen(s, betalingen) {
  const uit = { ...s };
  for (const b of betalingen) { uit[b.vanId] += b.bedrag; uit[b.naarId] -= b.bedrag; }
  return uit;
}
const nietNul = (s) => Object.values(s).filter((x) => x !== 0).length;

function lcg(zaad) {
  let x = zaad >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; };
}

test('GELD-8 AAN-35: eerst gelijke bedragen koppelen, daarna de grootste schuldenaar aan de grootste schuldeiser', () => {
  const namen = { a: 'Anne', b: 'Bas', c: 'Daan', d: 'Eva', e: 'Joris' };
  // Bas en Joris hebben precies hetzelfde bedrag als Daan respectievelijk een deel van Eva.
  const s = { a: -5000, b: -3000, c: 3000, d: 7000, e: -2000 };
  const uit = afrekening(s, (id) => namen[id]);
  assert.deepEqual(uit[0], { vanId: 'b', naarId: 'c', bedrag: 3000 });
  assert.deepEqual(uit.slice(1), [{ vanId: 'a', naarId: 'd', bedrag: 5000 }, { vanId: 'e', naarId: 'd', bedrag: 2000 }]);
});

test('GELD-8 AAN-35: bij gelijke bedragen beslist de voornaam, daarna het id', () => {
  const namen = { x1: 'Piet', x2: 'Anna', x3: 'Anna', y: 'Eva' };
  const uit = afrekening({ x1: -100, x2: -100, x3: -100, y: 300 }, (id) => namen[id]);
  assert.deepEqual(uit.map((b) => b.vanId), ['x2', 'x3', 'x1']);
});

test('GELD-8: eigenschapstest, hooguit (saldi ongelijk aan nul) − 1 betalingen en daarna alle saldi nul', () => {
  const r = lcg(20271002);
  const voornamen = ['Eva', 'Anna', 'Bram', 'Chris', 'Anna', 'Daan'];
  for (let ronde = 0; ronde < 2000; ronde += 1) {
    const n = 1 + Math.floor(r() * 20);
    const ids = Array.from({ length: n }, (_, i) => `d${String(i).padStart(2, '0')}`);
    const s = Object.fromEntries(ids.map((id) => [id, r() < 0.2 ? 0 : Math.floor((r() - 0.5) * 200000)]));
    if (r() < 0.3) s[ids[0]] = -(s[ids[1]] || 0); // af en toe exact gelijke bedragen
    const som = Object.values(s).reduce((a, b) => a + b, 0);
    s[ids[n - 1]] -= som; // som van de saldi is nul (§7.13.6)
    const uit = afrekening(s, (id) => voornamen[Number(id.slice(1)) % voornamen.length]);
    const k = nietNul(s);
    assert.ok(uit.length <= Math.max(0, k - 1), `ronde ${ronde}: ${uit.length} betalingen bij ${k} saldi`);
    for (const b of uit) {
      assert.ok(Number.isInteger(b.bedrag) && b.bedrag > 0);
      assert.ok(s[b.vanId] < 0 && s[b.naarId] > 0, 'van een schuldenaar naar een schuldeiser');
    }
    assert.ok(Object.values(naBetalen(s, uit)).every((x) => x === 0), `ronde ${ronde}: saldi niet nul`);
  }
});

test('GELD-8 GELD-9: afrekenen in rondes, na een deel van de betalingen geeft de rest weer nul', () => {
  const r = lcg(7);
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const posten = Array.from({ length: 40 }, () => ({
    soort: r() < 0.1 ? 'ontvangst' : 'uitgave', bedrag: 1 + Math.floor(r() * 50000), betalerId: ids[Math.floor(r() * ids.length)],
    verdeling: { wijze: 'gelijk', deelnemers: ['a', ...ids.slice(1).filter(() => r() < 0.7)] },
  }));
  const naamVan = (id) => id.toUpperCase();
  const s0 = saldi(posten, [], { deelnemers: ids, naamVan });
  const ronde1 = afrekening(s0, naamVan).filter((_, i) => i % 2 === 0);
  const s1 = saldi(posten, ronde1, { deelnemers: ids, naamVan });
  const ronde2 = afrekening(s1, naamVan);
  assert.ok(Object.values(saldi(posten, [...ronde1, ...ronde2], { deelnemers: ids, naamVan })).every((x) => x === 0));
});

test('GELD-10 AAN-22: het betaalverzoek noemt bedrag en editie, zonder rekeningnummer of link', () => {
  const tekst = betaalverzoekTekst({ bedrag: 1240, editieTitel: 'Weekendje weg 2027' });
  assert.equal(tekst, 'Wil je € 12,40 overmaken voor Weekendje weg 2027?');
  assert.ok(!/[A-Z]{2}\d{2}[A-Z0-9]{4}\d{6,}/.test(tekst.replace(/\s/g, '')), 'geen IBAN');
  assert.ok(!/https?:|www\.|tikkie|bunq/i.test(tekst), 'geen betaallink');
  assert.equal(heeftLinkEnPincode(tekst), false);
});

function opzet(opties = {}) {
  const demo = maakDemo({ posten: true, afrekening: true, stap: 'afrekenen', ...opties });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  for (const [token, id] of [['anna', ANNA], ['bram', BRAM]]) {
    nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, token), soort: 'deelnemer', subjectId: id, verloopt: '2099-01-01T00:00:00.000Z' });
  }
  nep.store.flush();
  const scherm = (sessie) => vraag({ actie: 'scherm', sessie, data: { naam: 'afrekening' } });
  return { nep, vraag, beheer, scherm };
}

test('GELD-8: het scherm afrekening geeft de open betalingen uit de saldi na de betaalde', () => {
  const { scherm } = opzet();
  const r = scherm('anna');
  assert.equal(r.ok, true);
  // Saldi: Eva +499,80, Anna −166,60, Bram −106,60, Chris −226,60; Bram betaalde Eva al 106,60.
  assert.deepEqual(r.data.open.map(({ vanId, naarId, bedrag }) => ({ vanId, naarId, bedrag })),
    [{ vanId: CHRIS, naarId: EVA, bedrag: 22660 }, { vanId: ANNA, naarId: EVA, bedrag: 16660 }]);
  assert.deepEqual(r.data.open.map((b) => b.magMarkeren), [false, true]);
  assert.equal(r.data.betaald.length, 1);
  assert.equal(r.data.betaald[0].magTerugdraaien, false);
  assert.equal(r.data.saldi.reduce((a, s) => a + s.saldo, 0), 0);
});

test('GELD-9: markeren voegt een rij in Betalingen toe en de afrekening herberekent; terugdraaien verwijdert hem', () => {
  const { scherm, vraag, nep } = opzet();
  const m = vraag({ actie: 'betalingMarkeren', sessie: 'anna', data: { vanId: ANNA, naarId: EVA, bedrag: 16660 } });
  assert.equal(m.ok, true, JSON.stringify(m));
  let r = scherm('anna').data;
  assert.equal(r.open.length, 1);
  assert.equal(r.betaald.length, 2);
  assert.equal(r.saldi.find((s) => s.id === ANNA).saldo, 0);
  nep.store.nieuwVerzoek();
  assert.ok(nep.store.vind('Betalingen', m.data.id).betaaldOp);

  const t = vraag({ actie: 'betalingTerugdraaien', sessie: 'anna', data: { id: m.data.id } });
  assert.equal(t.ok, true);
  r = scherm('anna').data;
  assert.equal(r.open.length, 2);
  assert.equal(r.saldi.find((s) => s.id === ANNA).saldo, -16660);
  // Nog eens terugdraaien: de rij is weg.
  assert.equal(vraag({ actie: 'betalingTerugdraaien', sessie: 'anna', data: { id: m.data.id } }).fout, 'gewijzigd');
});

test('GELD-9: een deelnemer markeert alleen een betaling waar hij bij betrokken is; de organisator alle', () => {
  const { vraag, beheer } = opzet();
  assert.equal(vraag({ actie: 'betalingMarkeren', sessie: 'bram', data: { vanId: ANNA, naarId: EVA, bedrag: 16660 } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'betalingTerugdraaien', sessie: 'anna', data: { id: 'bet0000000000001' } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'betalingMarkeren', sessie: beheer, data: { vanId: CHRIS, naarId: EVA, bedrag: 22660 } }).ok, true);
  assert.equal(vraag({ actie: 'betalingTerugdraaien', sessie: beheer, data: { id: 'bet0000000000001' } }).ok, true);
});

test('AAN-62: alleen een betaling die nu open staat kan op betaald; een ander bedrag geeft gewijzigd', () => {
  const { vraag } = opzet();
  assert.equal(vraag({ actie: 'betalingMarkeren', sessie: 'anna', data: { vanId: ANNA, naarId: EVA, bedrag: 100 } }).fout, 'gewijzigd');
  assert.equal(vraag({ actie: 'betalingMarkeren', sessie: 'anna', data: { vanId: ANNA, naarId: BRAM, bedrag: 16660 } }).fout, 'gewijzigd');
  assert.equal(vraag({ actie: 'betalingMarkeren', sessie: 'anna', data: { vanId: ANNA, naarId: EVA, bedrag: 16660 } }).ok, true);
  // Dezelfde betaling twee keer markeren lukt niet: hij staat niet meer open.
  assert.equal(vraag({ actie: 'betalingMarkeren', sessie: 'anna', data: { vanId: ANNA, naarId: EVA, bedrag: 16660 } }).fout, 'gewijzigd');
});

test('EDI-9 GELD-11: de organisator markeert afhaken en draait het terug; bestaande aandelen blijven', () => {
  const { vraag, beheer, scherm, nep } = opzet();
  const voor = scherm(beheer).data.saldi.find((s) => s.id === BRAM).saldo;
  nep.store.nieuwVerzoek();
  const postenVoor = nep.store.lees('Posten');
  assert.equal(vraag({ actie: 'afhakenMarkeren', sessie: 'anna', data: { deelnemerId: BRAM, afgehaakt: true } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'afhakenMarkeren', sessie: beheer, data: { deelnemerId: BRAM, afgehaakt: true } }).ok, true);
  const na = scherm(beheer).data;
  assert.equal(na.deelnemers.find((d) => d.id === BRAM).afgehaakt, true);
  assert.equal(na.saldi.find((s) => s.id === BRAM).saldo, voor, '§7.13.9: bestaande posten veranderen niet');
  nep.store.nieuwVerzoek();
  assert.deepEqual(nep.store.lees('Posten'), postenVoor);
  assert.equal(vraag({ actie: 'afhakenMarkeren', sessie: beheer, data: { deelnemerId: BRAM, afgehaakt: false } }).ok, true);
  assert.equal(scherm(beheer).data.deelnemers.find((d) => d.id === BRAM).afgehaakt, false);
  assert.equal(vraag({ actie: 'afhakenMarkeren', sessie: beheer, data: { deelnemerId: 'dln9999999999999', afgehaakt: true } }).fout, 'ongeldig');
});

test('GELD-11: de afgehaakte Chris houdt zijn aandeel in het huisje en het posten-scherm laat hem weg uit "Iedereen"', () => {
  const { scherm, vraag } = opzet();
  const chris = scherm('anna').data.saldi.find((s) => s.id === CHRIS);
  assert.equal(chris.saldo, -22660); // 120,00 huisje + 46,60 boodschappen + 60,00 kano
  const posten = vraag({ actie: 'scherm', sessie: 'anna', data: { naam: 'posten' } }).data;
  assert.equal(posten.deelnemers.find((d) => d.id === CHRIS).afgehaakt, true);
});

test('GELD-9 AAN-29: na Afgerond kan een betrokkene nog markeren en terugdraaien (BV-25)', () => {
  const { vraag, beheer, scherm } = opzet({ stap: 'afgerond' });
  assert.equal(vraag({ actie: 'betalingMarkeren', sessie: beheer, data: { vanId: ANNA, naarId: EVA, bedrag: 16660 } }).ok, true);
  assert.equal(vraag({ actie: 'betalingTerugdraaien', sessie: beheer, data: { id: 'bet0000000000001' } }).ok, true);
  const r = scherm('anna').data;
  assert.equal(r.alleenLezen, true);
  assert.ok(r.open.filter((b) => b.vanId === ANNA || b.naarId === ANNA).every((b) => b.magMarkeren));
});
