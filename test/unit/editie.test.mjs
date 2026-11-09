import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { MAX_FOUT } from '../../src/server/acties/toegang.js';
import { amsterdamOffset, deadlineIso, stapDatums, datumPlus, BLOKKEN_STANDAARD, MAANDEN_STANDAARD } from '../../src/shared/editie.js';
import { persoonlijkeLinkVan, leesLink } from '../../src/web/sessie.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';

function opzet() {
  const demo = maakDemo();
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, ...verzoek }));
  const leden = demo.seed.Leden.map((l) => l.id);
  // Eva (lid 1) is organisator van de demo-editie; Anna (lid 2) is daar deelnemer.
  const beheer = (lid = leden[0]) => vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(lid, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  const maak = (sessie, extra = {}) => vraag({
    actie: 'editieAanmaken', sessie,
    data: { titel: 'Weekendje weg 2028', jaar: 2028, periodeVan: '2028-04-01', periodeTot: '2028-10-31', deadline: '2027-12-01T23:59:00+01:00', deelnemers: leden, organisatoren: [], ...extra },
  });
  const links = (sessie, editieId) => vraag({ actie: 'linksMaken', sessie, editieId, data: {} });
  const rijen = (tab) => { nep.store.nieuwVerzoek(); return nep.store.lees(tab); };
  return { demo, nep, vraag, leden, beheer, maak, links, rijen };
}

test('EDI-1: een organisator maakt een editie met periode, voorkeursmaanden, deadline, blokken en deelnemers', () => {
  const { beheer, maak, rijen, leden } = opzet();
  const r = maak(beheer(), { organisatoren: [leden[1]], blokken: { samenwerken: true, programma: false } });
  assert.equal(r.ok, true);
  const e = rijen('Edities').find((x) => x.id === r.data.editie.id);
  assert.equal(e.titel, 'Weekendje weg 2028');
  assert.equal(e.stap, 'invullen');
  assert.deepEqual(e.voorkeursmaanden, MAANDEN_STANDAARD); // 4, 5, 9, 10
  assert.deepEqual(e.blokken, { ...BLOKKEN_STANDAARD, samenwerken: true, programma: false });
  assert.deepEqual(e.stapData, { invullen: '2027-12-01', overzicht: '2027-12-03', accommodatie: '2027-12-15' }); // §7.2.4
  const d = rijen('Deelnemers').filter((x) => x.editieId === e.id);
  assert.equal(d.length, 4);
  assert.deepEqual(d.filter((x) => x.rol === 'organisator').map((x) => x.lidId).sort(), [leden[0], leden[1]].sort());
  assert.ok(d.every((x) => x.tokenHash === '' && x.pinHash === ''), 'links komen pas bij Links maken');
});

test('EDI-1 AAN-46: de maker is altijd deelnemer en organisator, en een editie heeft minstens twee deelnemers', () => {
  const { beheer, maak, rijen, leden } = opzet();
  const r = maak(beheer(leden[1]), { deelnemers: [leden[2]], organisatoren: [] });
  assert.equal(r.ok, true);
  const d = rijen('Deelnemers').filter((x) => x.editieId === r.data.editie.id);
  assert.deepEqual(d.map((x) => [x.lidId, x.rol]).sort(), [[leden[1], 'organisator'], [leden[2], 'deelnemer']].sort());
  assert.equal(maak(beheer(), { deelnemers: [], organisatoren: [] }).fout, 'ongeldig');
});

test('EDI-1: ongeldige invoer wordt geweigerd', () => {
  const { beheer, maak, leden, rijen } = opzet();
  const s = beheer();
  assert.equal(maak(s, { periodeTot: '2028-03-01' }).fout, 'ongeldig');
  assert.equal(maak(s, { deelnemers: [leden[0], 'onbekend-lid-0000'] }).fout, 'ongeldig');
  assert.equal(maak(s, { deadline: '2027-12-01' }).fout, 'ongeldig');
  assert.equal(maak(s, { voorkeursmaanden: [13] }).fout, 'ongeldig');
  assert.equal(maak(s, { onbekend: 1 }).fout, 'ongeldig');
  assert.equal(rijen('Edities').length, 1); // alleen de demo-editie
});

test('EDI-1 TOE-7: een deelnemerssessie maakt geen editie en maakt geen links', () => {
  const { demo, vraag, maak, links } = opzet();
  const sessie = vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[1], pin: demo.pin } }).data.sessie;
  assert.equal(maak(sessie).fout, 'geen_toegang');
  assert.equal(links(sessie, 'demo-editie-2027').fout, 'geen_toegang');
});

test('AAN-48: de deadline eindigt om 23:59 in de tijd van Amsterdam, met winter- of zomertijd', () => {
  assert.equal(deadlineIso('2027-12-01'), '2027-12-01T23:59:00+01:00');
  assert.equal(deadlineIso('2027-04-10'), '2027-04-10T23:59:00+02:00');
  assert.equal(amsterdamOffset('2027-03-27'), '+01:00'); // dag voor de omschakeling
  assert.equal(amsterdamOffset('2027-03-28'), '+02:00');
  assert.equal(amsterdamOffset('2027-10-30'), '+02:00');
  assert.equal(amsterdamOffset('2027-10-31'), '+01:00');
  assert.deepEqual(stapDatums('2027-02-27T23:59:00+01:00'), { invullen: '2027-02-27', overzicht: '2027-03-01', accommodatie: '2027-03-13' });
  assert.equal(datumPlus('2027-12-30', 3), '2028-01-02');
});

test('EDI-4 TOE-8 AAN-47: Links maken geeft eenmalig link en pincode per deelnemer; de Sheet bewaart alleen hashes', () => {
  const { beheer, maak, links, rijen, nep, vraag } = opzet();
  const s = beheer();
  const editieId = maak(s).data.editie.id;
  const r = links(s, editieId);
  assert.equal(r.ok, true);
  assert.equal(r.data.links.length, 4);
  for (const l of r.data.links) {
    assert.match(l.token, /^[A-Za-z0-9_-]{22}$/);
    assert.match(l.pin, /^[0-9]{6}$/);
    assert.ok(l.voornaam);
  }
  assert.equal(new Set(r.data.links.map((l) => l.token)).size, 4);
  // AAN-47: een tweede keer maakt geen nieuwe links voor wie er al een heeft.
  assert.deepEqual(links(s, editieId).data.links, []);
  // TOE-8: niets van de klare tekst staat in de Sheet of in het beheerscherm.
  nep.store.nieuwVerzoek();
  const opslag = JSON.stringify(['Deelnemers', 'Sessies', 'Log'].map((t) => nep.adapter.ruw(t)));
  const scherm = JSON.stringify(vraag({ actie: 'scherm', sessie: s, data: { naam: 'beheer' } }));
  for (const l of r.data.links) for (const geheim of [l.token, l.pin]) { assert.ok(!opslag.includes(geheim)); assert.ok(!scherm.includes(geheim)); }
  assert.ok(JSON.parse(scherm).data.edities.find((e) => e.id === editieId).deelnemers.every((d) => d.heeftLink));
  assert.ok(rijen('Deelnemers').find((d) => d.id === r.data.links[0].deelnemerId).pinHash.length > 20);
  // De link werkt: inloggen met token en pincode.
  const l = r.data.links[1];
  const login = vraag({ actie: 'inloggenDeelnemer', data: { token: l.token, pin: l.pin } });
  assert.equal(login.ok, true);
  assert.equal(login.data.editieId, editieId);
  // En de persoonlijke link heeft de vorm uit §7.1.1.
  const link = persoonlijkeLinkVan('https://x.github.io/ww/', 'demo-weekendje-weg-0001', l.token);
  assert.deepEqual(leesLink(link), { scriptId: 'demo-weekendje-weg-0001', soort: 'deelnemer', token: l.token });
});

test('EDI-5 TOE-4: een nieuwe pincode laat de oude direct falen, houdt de link en zet de teller op nul', () => {
  const { beheer, maak, links, vraag } = opzet();
  const s = beheer();
  const editieId = maak(s).data.editie.id;
  const l = links(s, editieId).data.links[1];
  const inloggen = (pin) => vraag({ actie: 'inloggenDeelnemer', data: { token: l.token, pin } });
  for (let i = 0; i < MAX_FOUT; i++) inloggen('000000'); // eerste blokkade
  assert.equal(inloggen(l.pin).fout, 'geblokkeerd');
  const nieuw = vraag({ actie: 'pincodeVernieuwen', sessie: s, editieId, data: { deelnemerId: l.deelnemerId } });
  assert.equal(nieuw.ok, true);
  assert.notEqual(nieuw.data.pin, l.pin);
  assert.equal(inloggen(l.pin).fout, 'geen_toegang'); // oude pincode, en geen blokkade meer
  assert.equal(inloggen(nieuw.data.pin).ok, true); // dezelfde link met de nieuwe pincode
  assert.equal(nieuw.data.token, undefined);
});

test('EDI-5: een nieuwe pincode voor een deelnemer zonder link of van een andere editie wordt geweigerd', () => {
  const { beheer, maak, vraag, rijen } = opzet();
  const s = beheer();
  const editieId = maak(s).data.editie.id;
  const d = rijen('Deelnemers').find((x) => x.editieId === editieId);
  assert.equal(vraag({ actie: 'pincodeVernieuwen', sessie: s, editieId, data: { deelnemerId: d.id } }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'pincodeVernieuwen', sessie: s, editieId, data: { deelnemerId: 'dln0000000000002' } }).fout, 'ongeldig');
});

test('TOE-12: een nieuwe link maakt de oude link en de sessies van die deelnemer ongeldig', () => {
  const { beheer, maak, links, vraag } = opzet();
  const s = beheer();
  const editieId = maak(s).data.editie.id;
  const [a, b] = links(s, editieId).data.links.slice(1, 3);
  const inloggen = (l) => vraag({ actie: 'inloggenDeelnemer', data: { token: l.token, pin: l.pin } });
  const sessieA = inloggen(a).data.sessie;
  const sessieB = inloggen(b).data.sessie;
  const nieuw = vraag({ actie: 'linkVernieuwen', sessie: s, editieId, data: { deelnemerId: a.deelnemerId } });
  assert.equal(nieuw.ok, true);
  assert.notEqual(nieuw.data.token, a.token);
  assert.equal(inloggen(a).fout, 'geen_toegang'); // oude link met oude pincode
  assert.equal(vraag({ actie: 'inloggenDeelnemer', data: { token: a.token, pin: nieuw.data.pin } }).fout, 'geen_toegang'); // oude link met nieuwe pincode
  assert.equal(vraag({ actie: 'uitloggen', sessie: sessieA }).fout, 'geen_toegang'); // bestaande sessie is weg
  assert.equal(vraag({ actie: 'uitloggen', sessie: sessieB }).ok, true); // anderen blijven ingelogd
  assert.equal(vraag({ actie: 'inloggenDeelnemer', data: { token: nieuw.data.token, pin: nieuw.data.pin } }).ok, true);
});

test('EDI-5 TOE-12: een organisator van een andere editie vernieuwt niets in deze editie', () => {
  const { beheer, maak, links, vraag, leden } = opzet();
  const eva = beheer();
  const editieId = maak(eva).data.editie.id;
  const l = links(eva, editieId).data.links[2];
  const anna = beheer(leden[1]); // lid zonder organisatorrol in deze editie
  assert.equal(vraag({ actie: 'linkVernieuwen', sessie: anna, editieId, data: { deelnemerId: l.deelnemerId } }).fout, 'geen_toegang');
  assert.equal(links(anna, editieId).fout, 'geen_toegang');
});

test('EDI-6: een beheerlink voor een lid vraagt bij eerste gebruik een eigen wachtwoord', () => {
  const { beheer, vraag, leden, nep } = opzet();
  const s = beheer();
  const r = vraag({ actie: 'beheerlinkMaken', sessie: s, data: { lidId: leden[2] } });
  assert.equal(r.ok, true);
  assert.match(r.data.token, /^[A-Za-z0-9_-]{22}$/);
  const eerste = vraag({ actie: 'inloggenBeheer', data: { token: r.data.token, wachtwoord: 'x' } });
  assert.equal(eerste.data.wachtwoordInstellen, true);
  assert.equal(vraag({ actie: 'wachtwoordInstellen', data: { token: r.data.token, nieuw: 'kort' } }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'wachtwoordInstellen', data: { token: r.data.token, nieuw: 'eigen-wachtwoord-1' } }).ok, true);
  assert.equal(vraag({ actie: 'inloggenBeheer', data: { token: r.data.token, wachtwoord: 'eigen-wachtwoord-1' } }).ok, true);
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Beheerlinks').filter((b) => b.lidId === leden[2]).length, 1);
});

test('EDI-6 TOE-7: een deelnemer maakt geen beheerlink, en een onbekend lid kan er geen krijgen', () => {
  const { beheer, demo, vraag, leden } = opzet();
  const deelnemer = vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[1], pin: demo.pin } }).data.sessie;
  assert.equal(vraag({ actie: 'beheerlinkMaken', sessie: deelnemer, data: { lidId: leden[2] } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'beheerlinkMaken', sessie: beheer(), data: { lidId: 'onbekend-lid-0000' } }).fout, 'ongeldig');
});

test('EDI-4: het beheerscherm toont alleen de edities waarvan het lid organisator is', () => {
  const { beheer, maak, vraag, leden } = opzet();
  const eva = beheer();
  const nieuw = maak(eva, { deelnemers: [leden[0], leden[1]] }).data.editie.id;
  const lijst = (s) => vraag({ actie: 'scherm', sessie: s, data: { naam: 'beheer' } }).data.edities.map((e) => e.id).sort();
  assert.deepEqual(lijst(eva), ['demo-editie-2027', nieuw].sort());
  assert.deepEqual(lijst(beheer(leden[1])), []); // Anna is alleen deelnemer
});
