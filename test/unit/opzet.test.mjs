import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { SETUPCODE_GELDIG_MS, SETUPCODE_LENGTE, beheerlinkVoorLid, wachtwoordResetten, setupcodeMaken } from '../../src/server/acties/opzet.js';
import { SESSIE_BEHEER_MS } from '../../src/server/acties/beheertoegang.js';
import { MAX_FOUT, BLOKKADE_MS } from '../../src/server/acties/toegang.js';
import { hashToken } from '../../src/server/crypto.js';
import { leesScriptUrl, beheerlinkVan, leesLink, leesOpzetlink, isOpzetPad, OPZETLINK_FOUT } from '../../src/web/sessie.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const START = Date.parse('2027-01-10T12:00:00Z');
const WACHTWOORD = 'duinpan-kraanvogel';
const LEDEN = [{ voornaam: 'Eva', woonplaats: 'Nijmegen' }, { voornaam: 'Anne', woonplaats: 'Utrecht' }, { voornaam: 'Bas', woonplaats: 'Groningen' }];

function opzet(seed = {}) {
  const klok = { ms: START };
  const nep = maakNepApi({ seed, nu: () => new Date(klok.ms) });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, ...verzoek }));
  const opzetten = (code, extra = {}) => vraag({ actie: 'groepOpzetten', data: { setupcode: code, groepsnaam: 'Studievrienden', leden: LEDEN, eigenaar: 0, wachtwoord: WACHTWOORD, ...extra } });
  return { klok, nep, vraag, opzetten };
}

test('AAN-28: de setupcode heeft acht tekens, is 30 minuten geldig en werkt één keer', () => {
  const { nep, klok, opzetten } = opzet();
  const code = nep.setupcode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(SETUPCODE_LENGTE, 8);
  assert.equal(SETUPCODE_GELDIG_MS, 30 * 60 * 1000);
  assert.ok(!nep.eigenschappen.lees('setupcode').includes(code), 'alleen de hash wordt bewaard');
  klok.ms = START + SETUPCODE_GELDIG_MS + 1000;
  assert.equal(opzetten(code).fout, 'geen_toegang'); // verlopen
  klok.ms = START;
  const nieuw = nep.setupcode();
  assert.equal(opzetten(code).fout, 'geen_toegang'); // een nieuwe code maakt de vorige ongeldig
  assert.equal(opzetten(nieuw).ok, true);
  nep.store.nieuwVerzoek();
  assert.equal(nep.eigenschappen.lees('setupcode'), null); // eenmalig
});

test('GRP-2: een foute of ontbrekende setupcode zet niets op', () => {
  const { nep, opzetten, vraag } = opzet();
  assert.equal(opzetten('ABCD2345').fout, 'geen_toegang'); // er is nog geen code
  nep.setupcode();
  assert.equal(opzetten('ZZZZZZZZ').fout, 'geen_toegang');
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Leden').length, 0);
  assert.deepEqual(vraag({ actie: 'status' }).data, { apiVersie: API_VERSIE, opgezet: false });
});

test('GRP-2 GRP-4 TOE-8: opzetten maakt groep, leden en een beheerlink met het gekozen wachtwoord', () => {
  const { nep, opzetten, vraag } = opzet();
  const r = opzetten(nep.setupcode().toLowerCase().replace(/^(.{4})/, '$1-')); // spaties en streepjes worden genegeerd
  assert.equal(r.ok, true);
  assert.match(r.data.beheertoken, /^[A-Za-z0-9_-]{22}$/);
  nep.store.nieuwVerzoek();
  const groep = nep.store.lees('Groep')[0];
  assert.deepEqual([groep.naam, groep.opgezet, groep.apiVersie], ['Studievrienden', true, API_VERSIE]);
  const leden = nep.store.lees('Leden');
  assert.deepEqual(leden.map((l) => l.voornaam), ['Eva', 'Anne', 'Bas']);
  const bl = nep.store.lees('Beheerlinks');
  assert.equal(bl.length, 1);
  assert.equal(bl[0].lidId, leden[0].id); // de eigenaar is het gekozen lid
  assert.equal(bl[0].tokenHash, hashToken(nodeSha256, r.data.beheertoken));
  assert.ok(!JSON.stringify(nep.store.lees('Beheerlinks')).includes(WACHTWOORD));
  assert.ok(!JSON.stringify(nep.store.lees('Log')).includes(r.data.beheertoken)); // NFR-16
  assert.equal(vraag({ actie: 'status' }).data.opgezet, true);
});

test('AAN-43: de eigenaar is na opzetten ingelogd met een beheersessie van 12 uur', () => {
  const { nep, opzetten, vraag } = opzet();
  const r = opzetten(nep.setupcode()).data;
  assert.equal(r.soort, 'beheer');
  assert.equal(Date.parse(r.verloopt), START + SESSIE_BEHEER_MS);
  assert.equal(SESSIE_BEHEER_MS, 12 * 3600 * 1000);
  const scherm = vraag({ actie: 'scherm', sessie: r.sessie, data: { naam: 'beheer' } });
  assert.equal(scherm.ok, true);
  assert.equal(scherm.data.groep.naam, 'Studievrienden');
  assert.equal(scherm.data.leden.length, 3);
});

test('GRP-3: een tweede groepOpzetten op een opgezette groep wordt geweigerd', () => {
  const { nep, opzetten } = opzet();
  assert.equal(opzetten(nep.setupcode()).ok, true);
  const tweede = opzetten(nep.setupcode(), { groepsnaam: 'Overnemen' }); // ook met een geldige nieuwe code
  assert.equal(tweede.ok, false);
  assert.equal(tweede.fout, 'gesloten');
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Groep')[0].naam, 'Studievrienden');
  assert.equal(nep.store.lees('Leden').length, 3);
  assert.equal(nep.store.lees('Beheerlinks').length, 1);
});

test('GRP-3: de demogroep (al opgezet) weigert ook een nieuwe opzet', () => {
  const { nep, opzetten } = opzet(maakDemo().seed);
  assert.equal(opzetten(nep.setupcode()).fout, 'gesloten');
});

test('AAN-20: een groep heeft 2 tot en met 20 leden en de eigenaar is een van hen', () => {
  const { nep, opzetten } = opzet();
  const code = nep.setupcode();
  const lid = (i) => ({ voornaam: `Lid${i}`, woonplaats: '' });
  assert.equal(opzetten(code, { leden: [lid(1)], eigenaar: 0 }).fout, 'ongeldig');
  assert.equal(opzetten(code, { leden: Array.from({ length: 21 }, (_, i) => lid(i)) }).fout, 'ongeldig');
  assert.equal(opzetten(code, { eigenaar: 3 }).fout, 'ongeldig');
  assert.equal(opzetten(code, { leden: [lid(1), { voornaam: '  ', woonplaats: '' }] }).fout, 'ongeldig');
  assert.equal(opzetten(code, { wachtwoord: 'kort' }).fout, 'ongeldig'); // TOE-5: minimaal 10 tekens
  assert.equal(opzetten(code, { leden: Array.from({ length: 20 }, (_, i) => lid(i)), eigenaar: 19 }).ok, true);
});

test('AAN-20 GRP-5: leden toevoegen tot 20 actieve leden', () => {
  const { nep, opzetten, vraag } = opzet();
  const { sessie } = opzetten(nep.setupcode(), { leden: Array.from({ length: 19 }, (_, i) => ({ voornaam: `L${i}`, woonplaats: '' })) }).data;
  assert.equal(vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'toevoegen', voornaam: 'Twintig', woonplaats: 'Delft' } }).ok, true);
  const vol = vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'toevoegen', voornaam: 'Eenentwintig' } });
  assert.equal(vol.fout, 'gesloten');
});

test('GRP-5: leden toevoegen, woonplaats wijzigen en inactief maken; nooit verwijderen', () => {
  const { nep, opzetten, vraag } = opzet();
  const { sessie } = opzetten(nep.setupcode()).data;
  const toe = vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'toevoegen', voornaam: 'Sanne', woonplaats: 'Eindhoven' } });
  assert.equal(toe.data.lid.voornaam, 'Sanne');
  const id = toe.data.lid.id;
  assert.equal(vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'woonplaats', id, woonplaats: 'Tilburg' } }).data.lid.woonplaats, 'Tilburg');
  assert.equal(vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'inactief', id } }).data.lid.actief, false);
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Leden').length, 4); // het lid blijft staan
  assert.equal(vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'verwijderen', id } }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'woonplaats', id: 'bestaat-niet', woonplaats: 'X' } }).fout, 'ongeldig');
  // Er blijven minstens twee actieve leden.
  const leden = vraag({ actie: 'scherm', sessie, data: { naam: 'beheer' } }).data.leden.filter((l) => l.actief);
  assert.equal(leden.length, 3);
  vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'inactief', id: leden[1].id } });
  assert.equal(vraag({ actie: 'ledenBeheren', sessie, data: { soort: 'inactief', id: leden[2].id } }).fout, 'gesloten');
});

test('GRP-5 TOE-7: zonder beheersessie kan niemand leden beheren of het beheerscherm lezen', () => {
  const demo = maakDemo();
  const { vraag } = opzet(demo.seed);
  const data = { soort: 'toevoegen', voornaam: 'Indringer' };
  assert.equal(vraag({ actie: 'ledenBeheren', data }).fout, 'geen_toegang');
  const dn = vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[1], pin: demo.pin } }).data.sessie;
  assert.equal(vraag({ actie: 'ledenBeheren', sessie: dn, data }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'scherm', sessie: dn, data: { naam: 'beheer' } }).fout, 'geen_toegang');
});

// Een opgezette groep met één beheerlink die nog geen eigen wachtwoord heeft (zoals na het Sheet-menu).
function metBeheerlink() {
  const o = opzet(maakDemo().seed);
  const lid = o.nep.store.lees('Leden')[1];
  const token = beheerlinkVoorLid({ store: o.nep.store, deps: { sha256: nodeSha256, random: { bytes: (n) => Array.from({ length: n }, (_, i) => (i * 7 + 3) & 255) }, nu: () => new Date(START) } }, lid.id);
  o.nep.store.flush();
  return { ...o, token, lid };
}

test('TOE-5: een beheerlink vraagt bij eerste gebruik een wachtwoord van minimaal 10 tekens', () => {
  const { vraag, token } = metBeheerlink();
  const probe = vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: '' } });
  assert.equal(probe.fout, 'geen_toegang');
  assert.deepEqual(probe.data, { wachtwoordInstellen: true });
  assert.equal(vraag({ actie: 'wachtwoordInstellen', data: { token, nieuw: 'kort' } }).fout, 'ongeldig');
  const r = vraag({ actie: 'wachtwoordInstellen', data: { token, nieuw: WACHTWOORD } });
  assert.equal(r.ok, true);
  assert.equal(r.data.soort, 'beheer');
  // Het wachtwoord kan niet nog eens worden ingesteld door wie de link heeft.
  assert.equal(vraag({ actie: 'wachtwoordInstellen', data: { token, nieuw: 'een-ander-wachtwoord' } }).fout, 'geen_toegang');
});

test('TOE-5: daarna vraagt elke login het wachtwoord en een beheersessie verloopt na 12 uur', () => {
  const { vraag, token, klok } = metBeheerlink();
  vraag({ actie: 'wachtwoordInstellen', data: { token, nieuw: WACHTWOORD } });
  const fout = vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: 'niet-het-wachtwoord' } });
  assert.equal(fout.fout, 'geen_toegang');
  assert.equal(fout.data.resterend, MAX_FOUT - 1);
  assert.equal(vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: '' } }).data, undefined); // een lege poging telt niet
  const r = vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: WACHTWOORD } });
  assert.equal(r.ok, true);
  assert.equal(Date.parse(r.data.verloopt), START + 12 * 3600 * 1000);
  const lees = () => vraag({ actie: 'scherm', sessie: r.data.sessie, data: { naam: 'beheer' } });
  klok.ms = START + 12 * 3600 * 1000 - 1000;
  assert.equal(lees().ok, true);
  klok.ms = START + 12 * 3600 * 1000 + 1000;
  assert.equal(lees().fout, 'verlopen');
});

test('TOE-5 AAN-44: vijf foute wachtwoorden blokkeren de beheerlink 15 minuten', () => {
  const { vraag, token, klok } = metBeheerlink();
  vraag({ actie: 'wachtwoordInstellen', data: { token, nieuw: WACHTWOORD } });
  let laatste;
  for (let i = 0; i < MAX_FOUT; i++) laatste = vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: `fout-wachtwoord-${i}` } });
  assert.equal(laatste.fout, 'geblokkeerd');
  assert.equal(Date.parse(laatste.data.tot), START + BLOKKADE_MS);
  assert.equal(vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: WACHTWOORD } }).fout, 'geblokkeerd'); // ook het juiste wachtwoord
  klok.ms = START + BLOKKADE_MS + 1000;
  assert.equal(vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: WACHTWOORD } }).ok, true);
});

test('TOE-5: een onbekende of ingetrokken beheerlink geeft geen toegang en geen details', () => {
  const { vraag, nep, token, lid } = metBeheerlink();
  const onbekend = vraag({ actie: 'inloggenBeheer', data: { token: 'A'.repeat(22), wachtwoord: WACHTWOORD } });
  assert.deepEqual(onbekend, { ok: false, fout: 'geen_toegang', melding: 'Je hebt hier geen toegang toe.' });
  assert.equal(vraag({ actie: 'wachtwoordInstellen', data: { token: 'A'.repeat(22), nieuw: WACHTWOORD } }).fout, 'geen_toegang');
  nep.store.nieuwVerzoek();
  const bl = nep.store.lees('Beheerlinks').find((b) => b.lidId === lid.id);
  nep.store.werkBij('Beheerlinks', bl.id, { actief: false });
  assert.equal(vraag({ actie: 'wachtwoordInstellen', data: { token, nieuw: WACHTWOORD } }).fout, 'geen_toegang');
});

test('GRP-1: het wachtwoord resetten maakt het veld leeg, beëindigt sessies en zet de teller op nul', () => {
  const { vraag, nep, token } = metBeheerlink();
  const sessie = vraag({ actie: 'wachtwoordInstellen', data: { token, nieuw: WACHTWOORD } }).data.sessie;
  vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: 'verkeerd-wachtwoord' } });
  nep.store.nieuwVerzoek();
  const bl = nep.store.lees('Beheerlinks').find((b) => b.tokenHash === hashToken(nodeSha256, token));
  wachtwoordResetten({ store: nep.store }, bl.id);
  nep.store.flush();
  assert.equal(nep.store.vind('Beheerlinks', bl.id).wachtwoordHash, '');
  assert.equal(nep.store.vind('Pogingen', bl.tokenHash).fout, 0);
  assert.equal(vraag({ actie: 'scherm', sessie, data: { naam: 'beheer' } }).fout, 'geen_toegang');
  assert.deepEqual(vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: '' } }).data, { wachtwoordInstellen: true });
});

test('GRP-1: de beheerlink van het Sheet-menu is alleen te maken voor een actief lid', () => {
  const { nep } = opzet(maakDemo().seed);
  const deps = { sha256: nodeSha256, random: { bytes: (n) => Array.from({ length: n }, () => 5) }, nu: () => new Date(START), eigenschappen: nep.eigenschappen };
  assert.throws(() => beheerlinkVoorLid({ store: nep.store, deps }, 'bestaat-niet'), (e) => e.code === 'ongeldig');
  assert.match(setupcodeMaken({ ...deps, random: { bytes: (n) => Array.from({ length: n }, (_, i) => i) } }), /^[A-Z2-9]{8}$/);
});

test('AAN-14 §7.17: een afwijkende apiVersie krijgt api_versie, status zonder apiVersie blijft werken', () => {
  const { nep } = opzet();
  const oud = nep.api.verwerk(JSON.stringify({ actie: 'status', apiVersie: API_VERSIE + 1 }));
  assert.equal(oud.fout, 'api_versie');
  assert.match(oud.melding, /verouderd/);
  assert.equal(nep.api.verwerk(JSON.stringify({ actie: 'status' })).data.apiVersie, API_VERSIE);
});

test('GRP-2: alleen een /exec-URL wordt geaccepteerd, een /dev-URL wordt geweigerd met uitleg', () => {
  const id = 'AKfycbx1234567890abcdefghij';
  assert.deepEqual(leesScriptUrl(`https://script.google.com/macros/s/${id}/exec`), { scriptId: id });
  assert.deepEqual(leesScriptUrl(`  https://script.google.com/macros/s/${id}/exec  `), { scriptId: id });
  assert.match(leesScriptUrl(`https://script.google.com/macros/s/${id}/dev`).fout, /\/dev.*\/exec/);
  assert.ok(leesScriptUrl(`https://script.google.com/macros/s/${id}/exec?x=1`).fout);
  assert.ok(leesScriptUrl(`http://script.google.com/macros/s/${id}/exec`).fout);
  assert.ok(leesScriptUrl(`https://evil.example/macros/s/${id}/exec`).fout);
  assert.ok(leesScriptUrl(`https://script.google.com/macros/s/kort/exec`).fout);
  assert.ok(leesScriptUrl('').fout);
});

test('GRP-4: de beheerlink die de wizard toont wordt door de voorkant als beheerlink herkend', () => {
  const id = 'AKfycbx1234567890abcdefghij';
  const link = beheerlinkVan('https://dwiering.github.io/weekendje-weg/', id, 'B'.repeat(22));
  assert.equal(link, `https://dwiering.github.io/weekendje-weg/#b=${id}&beheer=${'B'.repeat(22)}`);
  assert.deepEqual(leesLink(link), { scriptId: id, soort: 'beheer', token: 'B'.repeat(22) });
});

test('AAN-78 GRP-7: leesOpzetlink leest b en code uit #/opzetten?b=...&code=...', () => {
  const id = 'AKfycbx1234567890abcdefghij';
  assert.deepEqual(leesOpzetlink(`#/opzetten?b=${id}&code=ABCD2345`), { scriptId: id, code: 'ABCD2345' });
  assert.deepEqual(leesOpzetlink(`#/opzetten?code=abcd2345&b=${id}`), { scriptId: id, code: 'ABCD2345' });
  // Een gewoon #/opzetten of een ander scherm is geen opzetlink.
  for (const hash of ['#/opzetten', '#/opzetten?', '', '#/start', `#b=${id}&code=ABCD2345`, '#/opzettenx?b=1', null, undefined]) assert.equal(leesOpzetlink(hash), null, String(hash));
  // Een fout ID of een code die geen acht tekens heeft, geeft de melding uit GRP-7.
  for (const hash of ['#/opzetten?b=kort&code=ABCD2345', `#/opzetten?b=${id}&code=ABCD234`, `#/opzetten?b=${id}&code=ABCD23456`, `#/opzetten?b=${id}`, '#/opzetten?code=ABCD2345', `#/opzetten?b=${id}&code=ABCD 234`, `#/opzetten?b=${id}/../x&code=ABCD2345`, '#/opzetten?x=1']) {
    assert.deepEqual(leesOpzetlink(hash), { fout: OPZETLINK_FOUT }, hash);
  }
  assert.match(OPZETLINK_FOUT, /^Deze opzetlink klopt niet. Kies in de Sheet opnieuw Weekendje weg en Groep opzetten.$/);
  assert.ok(isOpzetPad('#/opzetten') && isOpzetPad('#/opzetten?b=x') && !isOpzetPad('#/opzettenx') && !isOpzetPad('#/start'));
});

test('AAN-78 §7.18.3: leesLink herkent een opzetlink nooit als persoonlijke link of beheerlink', () => {
  const id = 'AKfycbx1234567890abcdefghij';
  const sleutel = 'A'.repeat(22);
  for (const link of [
    `#/opzetten?b=${id}&code=ABCD2345`,
    `https://voorbeeld.github.io/app/#/opzetten?b=${id}&code=ABCD2345`,
    `#/opzetten?x=1&b=${id}&t=${sleutel}`,
    `#/opzetten?x=1&b=${id}&beheer=${sleutel}`,
    `#/opzetten&b=${id}&t=${sleutel}`,
  ]) assert.equal(leesLink(link), null, link);
  assert.equal(leesLink(`#b=${id}&t=${sleutel}`).soort, 'deelnemer');
});
