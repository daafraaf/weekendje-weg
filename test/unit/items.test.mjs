import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { CATEGORIEEN, stelCategorieVoor } from '../../src/shared/categorieen.js';
import { maakNepApi, startServer } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const EVA = 'dln0000000000001';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';
const CHRIS = 'dln0000000000004';

function sessies(store) {
  store.nieuwVerzoek();
  store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'bram'), soort: 'deelnemer', subjectId: BRAM, verloopt: '2099-01-01T00:00:00.000Z' });
  store.flush();
}

function opzet({ stap = 'voorbereiding' } = {}) {
  const demo = maakDemo({ antwoorden: true, stap, items: true });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  sessies(nep.store);
  const als = (sessie) => (actie, data) => vraag({ actie, sessie, data });
  const org = als(beheer);
  const anna = als('anna');
  const bram = als('bram');
  const scherm = (sessie) => vraag({ actie: 'scherm', sessie, data: { naam: 'meenemen' } }).data;
  const item = (naam) => { nep.store.nieuwVerzoek(); return nep.store.lees('Items').find((i) => i.naam === naam); };
  const claims = (naam) => { nep.store.nieuwVerzoek(); const i = item(naam); return nep.store.lees('Claims').filter((c) => c.itemId === i.id); };
  return { demo, nep, vraag, beheer, org, anna, bram, scherm, item, claims };
}

const namen = (s, naam) => s.items.find((i) => i.naam === naam).claims.map((c) => c.naam);

test('MEE-4 AAN-19: de categorie wordt voorgesteld uit een vaste woordenlijst, standaard Overig', () => {
  assert.equal(CATEGORIEEN.length, 13);
  assert.equal(stelCategorieVoor('Tomaten'), 'Groente en fruit');
  assert.equal(stelCategorieVoor('Pindakaas'), 'Ontbijt en beleg');
  assert.equal(stelCategorieVoor('Rode wijn'), 'Frisdrank, bier en wijn');
  assert.equal(stelCategorieVoor('Stroopwafels'), 'Koek, snoep en chips');
  assert.equal(stelCategorieVoor('Keukenrol'), 'Huishouden');
  assert.equal(stelCategorieVoor('Iets onbekends'), 'Overig');
  assert.equal(stelCategorieVoor(''), 'Overig');
});

test('MEE-1 §7.7.2: een nieuwe editie krijgt de startlijst keuken en spullen als items', () => {
  const demo = maakDemo();
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (v) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, ...v }));
  const sessie = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  const leden = demo.seed.Leden.map((l) => l.id);
  const r = vraag({ actie: 'editieAanmaken', sessie, data: { titel: 'Weekendje weg 2028', jaar: 2028, periodeVan: '2028-04-01', periodeTot: '2028-10-31', deadline: '2027-12-01T23:59:00+01:00', deelnemers: leden, organisatoren: [] } });
  assert.equal(r.ok, true);
  nep.store.nieuwVerzoek();
  const items = nep.store.lees('Items').filter((i) => i.editieId === r.data.editie.id);
  assert.deepEqual(items.filter((i) => i.soort === 'keuken').map((i) => i.naam),
    ['Olijfolie', 'Zout en peper', 'Kruiden', 'Mayonaise', 'Pindakaas', 'Ketchup', 'Suiker', 'Koffie', 'Thee']);
  assert.deepEqual(items.filter((i) => i.soort === 'spullen').map((i) => i.naam), ['Bordspellen', 'Speaker', 'Kaartspel']);
  assert.ok(items.every((i) => CATEGORIEEN.includes(i.categorie) && i.toegevoegdDoor === ''));
  assert.equal(items.find((i) => i.naam === 'Koffie').categorie, 'Ontbijt en beleg');
  // De organisator ziet de lijst in het scherm, ook zonder claims.
  const s = vraag({ actie: 'scherm', sessie, editieId: r.data.editie.id, data: { naam: 'meenemen' } }).data;
  assert.equal(s.items.length, 12);
  assert.ok(s.items.every((i) => i.claims.length === 0));
});

test('MEE-2: claimen voegt je naam toe, een tweede claim wordt genegeerd, intrekken haalt hem weg', () => {
  const { anna, bram, scherm, item, claims } = opzet();
  const p = item('Pindakaas').id;
  assert.equal(anna('claimen', { itemId: p }).ok, true);
  assert.equal(anna('claimen', { itemId: p }).ok, true); // genegeerd, geen tweede rij
  assert.equal(claims('Pindakaas').length, 1);
  assert.equal(bram('claimen', { itemId: p }).ok, true);
  const s = scherm('anna');
  assert.deepEqual(namen(s, 'Pindakaas'), ['Anna', 'Bram']);
  assert.deepEqual(s.items.find((i) => i.naam === 'Pindakaas').claims.map((c) => c.ik), [true, false]);
  assert.equal(s.items.find((i) => i.naam === 'Pindakaas').claims.some((c) => 'deelnemerId' in c), false); // ids alleen voor de organisator
  assert.equal(anna('claimIntrekken', { itemId: p }).ok, true);
  assert.deepEqual(namen(scherm('anna'), 'Pindakaas'), ['Bram']);
  assert.equal(anna('claimIntrekken', { itemId: p }).ok, true); // al ingetrokken is geen fout
  assert.equal(anna('claimen', { itemId: '0000000000000000' }).fout, 'gewijzigd');
});

test('MEE-2 §7.7.4: alleen de organisator trekt de claim van een ander in', () => {
  const { anna, bram, org, vraag, beheer, item, claims } = opzet();
  const p = item('Thee').id;
  bram('claimen', { itemId: p });
  assert.equal(anna('claimIntrekken', { itemId: p, deelnemerId: BRAM }).fout, 'geen_toegang');
  assert.equal(claims('Thee').length, 1);
  const zicht = vraag({ actie: 'scherm', sessie: beheer, data: { naam: 'meenemen' } }).data;
  assert.equal(zicht.items.find((i) => i.naam === 'Thee').claims[0].deelnemerId, BRAM); // alleen de organisator krijgt het id
  assert.equal(org('claimIntrekken', { itemId: p, deelnemerId: BRAM }).ok, true);
  assert.equal(claims('Thee').length, 0);
});

test('MEE-3: twee gelijktijdige claims op pindakaas geven "Pindakaas: Anna, Bram"', async () => {
  const demo = maakDemo({ antwoorden: true, stap: 'voorbereiding', items: true });
  const nep = await startServer({ port: 0, seed: demo.seed });
  try {
    sessies(nep.store);
    const post = (sessie, actie, data) => fetch(`${nep.url}/macros/s/x/exec`, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, actie, sessie, data }),
    }).then((r) => r.json());
    nep.store.nieuwVerzoek();
    const p = nep.store.lees('Items').find((i) => i.naam === 'Pindakaas').id;
    const [a, b] = await Promise.all([post('anna', 'claimen', { itemId: p }), post('bram', 'claimen', { itemId: p })]);
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    const s = (await post('anna', 'scherm', { naam: 'meenemen' })).data;
    const regel = s.items.find((i) => i.naam === 'Pindakaas');
    assert.equal(`Pindakaas: ${regel.claims.map((c) => c.naam).sort().join(', ')}`, 'Pindakaas: Anna, Bram');
    assert.equal(regel.claims.length, 2);
  } finally {
    nep.server.close();
  }
});

test('MEE-4 AAN-66: iedereen voegt een item toe met naam, soort en categorie; zonder categorie volgt het voorstel', () => {
  const { anna, scherm, nep } = opzet();
  const r = anna('itemOpslaan', { soort: 'boodschap', naam: '  Rode   wijn ' });
  assert.equal(r.ok, true);
  assert.equal(r.data.categorie, 'Frisdrank, bier en wijn');
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: 'Tomaten', categorie: 'Overig' }).data.categorie, 'Overig'); // eigen keuze wint
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: '   ' }).fout, 'ongeldig');
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: 'x'.repeat(61) }).fout, 'ongeldig');
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: 'Iets', categorie: 'Onbekend' }).fout, 'ongeldig');
  assert.equal(anna('itemOpslaan', { soort: 'snack', naam: 'Iets' }).fout, 'ongeldig');
  const s = scherm('anna');
  const wijn = s.items.find((i) => i.naam === 'Rode wijn');
  assert.equal(wijn.soort, 'boodschap');
  assert.equal(wijn.eigen, true);
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Items').find((i) => i.naam === 'Rode wijn').toegevoegdDoor, ANNA);
  // AAN-66: hooguit 200 items per editie.
  for (let n = nep.store.lees('Items').length; n < 200; n += 1) assert.equal(anna('itemOpslaan', { soort: 'spullen', naam: `Ding ${n}` }).ok, true);
  assert.equal(anna('itemOpslaan', { soort: 'spullen', naam: 'Eén te veel' }).fout, 'ongeldig');
});

test('AAN-26: een eigen item tot definitief, de organisator elk item', () => {
  const { anna, bram, org, scherm, item, claims, nep } = opzet();
  const eigen = anna('itemOpslaan', { soort: 'spullen', naam: 'Parasol' }).data;
  anna('claimen', { itemId: eigen.id });
  assert.equal(bram('itemVerwijderen', { id: eigen.id, versie: eigen.versie }).fout, 'geen_toegang');
  assert.equal(bram('itemOpslaan', { id: eigen.id, versie: eigen.versie, soort: 'spullen', naam: 'Anders' }).fout, 'geen_toegang');
  const gewijzigd = anna('itemOpslaan', { id: eigen.id, versie: eigen.versie, soort: 'spullen', naam: 'Grote parasol' });
  assert.equal(gewijzigd.ok, true);
  assert.equal(anna('itemOpslaan', { id: eigen.id, versie: eigen.versie, soort: 'spullen', naam: 'Oude versie' }).fout, 'gewijzigd');
  assert.equal(anna('itemVerwijderen', { id: eigen.id, versie: gewijzigd.data.versie }).ok, true);
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Claims').length, 0); // de claims gaan mee
  // Een item van de startlijst is van niemand: een deelnemer kan het niet verwijderen, de organisator wel.
  const olie = item('Olijfolie');
  assert.equal(anna('itemVerwijderen', { id: olie.id, versie: olie.versie }).fout, 'geen_toegang');
  assert.equal(org('itemVerwijderen', { id: olie.id, versie: olie.versie }).ok, true);
  assert.equal(scherm('anna').items.some((i) => i.naam === 'Olijfolie'), false);
  // Na definitief kan niemand meer toevoegen of verwijderen (§7.8.5).
  const eigen2 = anna('itemOpslaan', { soort: 'keuken', naam: 'Azijn' }).data;
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', DEMO_EDITIE_ID, { boodschappenDefinitief: true }, 1);
  nep.store.flush();
  assert.equal(anna('itemOpslaan', { soort: 'keuken', naam: 'Nieuw' }).fout, 'gesloten');
  assert.equal(anna('itemVerwijderen', { id: eigen2.id, versie: eigen2.versie }).fout, 'gesloten');
});

test('§7.8.5: na definitief geen claims op keuken en boodschap, op spullen wel', () => {
  const { anna, bram, item, claims, nep } = opzet();
  anna('claimen', { itemId: item('Koffie').id });
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', DEMO_EDITIE_ID, { boodschappenDefinitief: true }, 1);
  nep.store.flush();
  assert.equal(bram('claimen', { itemId: item('Thee').id }).fout, 'gesloten');
  assert.equal(anna('claimIntrekken', { itemId: item('Koffie').id }).fout, 'gesloten');
  assert.equal(claims('Koffie').length, 1);
  assert.equal(bram('claimen', { itemId: item('Speaker').id }).ok, true);
  assert.equal(bram('claimIntrekken', { itemId: item('Speaker').id }).ok, true);
});

test('AAN-11: afhaken laat alle claims van die persoon vervallen; een afgehaakte claimt niet meer', () => {
  const { org, anna, bram, scherm, item, nep } = opzet();
  for (const naam of ['Koffie', 'Speaker', 'Thee']) { anna('claimen', { itemId: item(naam).id }); }
  bram('claimen', { itemId: item('Koffie').id });
  assert.deepEqual(namen(scherm('anna'), 'Koffie'), ['Anna', 'Bram']);
  assert.equal(org('afhakenMarkeren', { deelnemerId: ANNA, afgehaakt: true }).ok, true);
  const s = scherm('bram');
  assert.deepEqual(namen(s, 'Koffie'), ['Bram']); // Bram houdt zijn claim
  assert.deepEqual(namen(s, 'Speaker'), []); // het item staat weer open
  assert.deepEqual(namen(s, 'Thee'), []);
  assert.equal(anna('claimen', { itemId: item('Thee').id }).fout, 'gesloten');
  assert.equal(org('afhakenMarkeren', { deelnemerId: ANNA, afgehaakt: false }).ok, true);
  assert.deepEqual(namen(scherm('bram'), 'Speaker'), []); // terugdraaien brengt de claims niet terug
  assert.equal(anna('claimen', { itemId: item('Thee').id }).ok, true);
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Claims').filter((c) => c.deelnemerId === CHRIS || c.deelnemerId === EVA).length, 0);
});
