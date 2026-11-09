import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { eigenKamerLabel } from '../../src/shared/kamers.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const EVA = 'dln0000000000001';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';
const CHRIS = 'dln0000000000004';

function opzet() {
  const demo = maakDemo({ antwoorden: true, stap: 'voorbereiding' });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  for (const [naam, id] of [['anna', ANNA], ['bram', BRAM], ['chris', CHRIS]]) {
    nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, naam), soort: 'deelnemer', subjectId: id, verloopt: '2099-01-01T00:00:00.000Z' });
  }
  nep.store.flush();
  const als = (sessie) => (actie, data) => vraag({ actie, sessie, data });
  const scherm = (sessie, naam) => vraag({ actie: 'scherm', sessie, data: { naam } }).data;
  return { nep, org: als(beheer), anna: als('anna'), bram: als('bram'), chris: als('chris'), beheer, scherm };
}

test('KMR-1 AAN-23: de organisator maakt kamers en deelt in, een volle kamer weigert een extra persoon', () => {
  const { org, anna, scherm, nep } = opzet();
  assert.equal(anna('kamersOpslaan', { naam: 'Zolder', slaapplaatsen: 2 }).fout, 'geen_toegang');
  const zolder = org('kamersOpslaan', { naam: ' Zolder ', slaapplaatsen: 2 }).data.id;
  const tuin = org('kamersOpslaan', { naam: 'Tuinhuis', slaapplaatsen: 1 }).data.id;
  assert.equal(org('kamersOpslaan', { naam: '', slaapplaatsen: 2 }).fout, 'ongeldig');
  assert.equal(anna('kamerIndelen', { deelnemerId: ANNA, kamerId: zolder }).fout, 'geen_toegang');
  assert.equal(org('kamerIndelen', { deelnemerId: ANNA, kamerId: zolder }).ok, true);
  assert.equal(org('kamerIndelen', { deelnemerId: BRAM, kamerId: zolder }).ok, true);
  const vol = org('kamerIndelen', { deelnemerId: CHRIS, kamerId: zolder });
  assert.equal(vol.fout, 'ongeldig');
  assert.match(vol.melding || '', /vol/);
  // Verplaatsen telt: Anna naar het tuinhuis maakt plek in de zolder; opnieuw in dezelfde kamer is geen fout.
  assert.equal(org('kamerIndelen', { deelnemerId: ANNA, kamerId: tuin }).ok, true);
  assert.equal(org('kamerIndelen', { deelnemerId: CHRIS, kamerId: zolder }).ok, true);
  assert.equal(org('kamerIndelen', { deelnemerId: CHRIS, kamerId: zolder }).ok, true);
  assert.equal(org('kamerIndelen', { deelnemerId: ANNA, kamerId: zolder }).fout, 'ongeldig');
  // Minder slaapplaatsen dan bewoners kan niet.
  assert.equal(org('kamersOpslaan', { id: zolder, naam: 'Zolder', slaapplaatsen: 1 }).fout, 'ongeldig');
  // Deelnemers zien de indeling met de wens voor een eigen kamer, zonder ID's; wie geen kamer heeft staat apart.
  const s = scherm('anna', 'kamers');
  assert.deepEqual(s.kamers.map((k) => [k.naam, k.bewoners.length, k.vrij]), [['Tuinhuis', 1, 0], ['Zolder', 2, 0]]);
  assert.deepEqual(s.zonderKamer.map((p) => p.naam), ['Eva']);
  assert.equal(s.zonderKamer[0].eigenKamer, 'lieverWel');
  assert.equal(eigenKamerLabel('lieverWel'), 'Liever wel');
  assert.equal(JSON.stringify(s).includes(EVA), false);
  nep.store.nieuwVerzoek();
});

test('KMR-1: de organisator krijgt deelnemer-ID\'s om in te delen, uitdelen en een kamer verwijderen kan', () => {
  const { org, beheer, scherm, nep } = opzet();
  const k = org('kamersOpslaan', { naam: 'Zolder', slaapplaatsen: 2 }).data.id;
  org('kamerIndelen', { deelnemerId: ANNA, kamerId: k });
  const s = scherm(beheer, 'kamers');
  assert.equal(s.kamers[0].bewoners[0].deelnemerId, ANNA);
  assert.equal(org('kamerIndelen', { deelnemerId: ANNA }).ok, true);
  assert.equal(scherm(beheer, 'kamers').kamers[0].bewoners.length, 0);
  org('kamerIndelen', { deelnemerId: ANNA, kamerId: k });
  assert.equal(org('kamersOpslaan', { id: k, verwijderen: true }).ok, true);
  const na = scherm(beheer, 'kamers');
  assert.equal(na.kamers.length, 0);
  assert.equal(na.zonderKamer.length, 4);
  assert.equal(nep.store.lees('Kamerindeling').length, 0);
});

test('KMR-1 CAR-1 AAN-70: een afgehaakte deelnemer verdwijnt uit kamers en ritten en komt niet terug', () => {
  const { org, anna, bram, scherm, beheer, nep } = opzet();
  const k = org('kamersOpslaan', { naam: 'Zolder', slaapplaatsen: 2 }).data.id;
  org('kamerIndelen', { deelnemerId: ANNA, kamerId: k });
  org('kamerIndelen', { deelnemerId: BRAM, kamerId: k });
  const rit = anna('ritOpslaan', { vertrekplaats: 'Zwolle', vrijePlaatsen: 2 }).data.id;
  assert.equal(bram('meerijden', { ritId: rit }).ok, true);
  assert.equal(org('afhakenMarkeren', { deelnemerId: ANNA, afgehaakt: true }).ok, true);
  // Anna staat niet meer in de kamer en haar rit is weg, dus ook Brams plek erin.
  let s = scherm(beheer, 'kamers');
  assert.deepEqual(s.kamers[0].bewoners.map((p) => p.naam), ['Bram']);
  assert.equal(s.zonderKamer.some((p) => p.naam === 'Anna'), false);
  let c = scherm(beheer, 'carpool');
  assert.equal(c.ritten.length, 0);
  assert.deepEqual(c.zonderRit.map((p) => p.naam), ['Bram', 'Chris', 'Eva']);
  // Een afgehaakte deelnemer deel je niet in en hij rijdt niet mee.
  assert.equal(org('kamerIndelen', { deelnemerId: ANNA, kamerId: k }).fout, 'ongeldig');
  const rit2 = bram('ritOpslaan', { vertrekplaats: 'Arnhem', vrijePlaatsen: 1 }).data.id;
  assert.equal(org('meerijden', { ritId: rit2, deelnemerId: ANNA }).fout, 'ongeldig');
  // Terugdraaien brengt hem niet terug.
  org('afhakenMarkeren', { deelnemerId: ANNA, afgehaakt: false });
  s = scherm(beheer, 'kamers');
  c = scherm(beheer, 'carpool');
  assert.deepEqual(s.kamers[0].bewoners.map((p) => p.naam), ['Bram']);
  assert.equal(c.ritten.length, 1);
  nep.store.nieuwVerzoek();
});

test('CAR-1 AAN-24: een volle rit weigert een extra persoon, wie geen rit heeft staat in een aparte lijst', () => {
  const { anna, bram, chris, scherm, nep } = opzet();
  assert.equal(anna('ritOpslaan', { vertrekplaats: '', vrijePlaatsen: 2 }).fout, 'ongeldig');
  assert.equal(anna('ritOpslaan', { vertrekplaats: 'Zwolle', vrijePlaatsen: 0 }).fout, 'ongeldig');
  const rit = anna('ritOpslaan', { vertrekplaats: ' Zwolle ', vrijePlaatsen: 1 }).data.id;
  // Nog een keer aanbieden past dezelfde rit aan.
  assert.equal(anna('ritOpslaan', { vertrekplaats: 'Zwolle Centraal', vrijePlaatsen: 1 }).data.id, rit);
  assert.equal(bram('meerijden', { ritId: rit }).ok, true);
  assert.equal(bram('meerijden', { ritId: rit }).ok, true); // twee keer is geen fout
  const vol = chris('meerijden', { ritId: rit });
  assert.equal(vol.fout, 'ongeldig');
  assert.match(vol.melding || '', /vol/);
  // Een bestuurder rijdt niet mee; minder plaatsen dan meerijders kan niet.
  assert.equal(anna('meerijden', { ritId: rit }).fout, 'ongeldig');
  assert.equal(anna('ritOpslaan', { id: rit, vertrekplaats: 'Zwolle', vrijePlaatsen: 1 }).ok, true);
  const c = scherm('chris', 'carpool');
  assert.equal(c.ritten.length, 1);
  assert.deepEqual([c.ritten[0].bestuurder.naam, c.ritten[0].bestuurder.woonplaats, c.ritten[0].vertrekplaats, c.ritten[0].vrij], ['Anna', 'Zwolle', 'Zwolle', 0]);
  assert.deepEqual(c.ritten[0].meerijders.map((p) => [p.naam, p.woonplaats]), [['Bram', 'Arnhem']]);
  assert.deepEqual(c.zonderRit.map((p) => [p.naam, p.woonplaats]), [['Chris', 'Breda'], ['Eva', 'Utrecht']]);
  assert.equal(c.ikBestuurder, false);
  assert.equal(JSON.stringify(c).includes(ANNA), false); // deelnemers krijgen geen ID's
  // Uitstappen maakt de plek vrij.
  assert.equal(bram('meerijdenStoppen', {}).ok, true);
  assert.equal(bram('meerijdenStoppen', {}).ok, true);
  assert.equal(chris('meerijden', { ritId: rit }).ok, true);
  nep.store.nieuwVerzoek();
});

test('CAR-2: een deelnemer beheert alleen zijn eigen plek en rit, de organisator deelt iedereen in en uit', () => {
  const { org, anna, bram, chris, scherm, beheer, nep } = opzet();
  const rit = anna('ritOpslaan', { vertrekplaats: 'Zwolle', vrijePlaatsen: 2 }).data.id;
  assert.equal(bram('meerijden', { ritId: rit, deelnemerId: CHRIS }).fout, 'geen_toegang');
  assert.equal(bram('meerijdenStoppen', { deelnemerId: CHRIS }).fout, 'geen_toegang');
  assert.equal(bram('ritOpslaan', { id: rit, vertrekplaats: 'Weg', vrijePlaatsen: 2 }).fout, 'geen_toegang');
  assert.equal(bram('ritOpslaan', { bestuurderId: CHRIS, vertrekplaats: 'Breda', vrijePlaatsen: 2 }).fout, 'geen_toegang');
  assert.equal(bram('ritOpslaan', { id: rit, verwijderen: true }).fout, 'geen_toegang');
  assert.equal(org('meerijden', { ritId: rit, deelnemerId: CHRIS }).ok, true);
  assert.equal(org('meerijden', { ritId: rit, deelnemerId: BRAM }).ok, true);
  assert.equal(org('meerijden', { ritId: rit, deelnemerId: ANNA }).fout, 'ongeldig'); // de bestuurder zelf
  const s = scherm(beheer, 'carpool');
  assert.equal(s.ritten[0].bestuurder.deelnemerId, ANNA);
  assert.deepEqual(s.zonderRit.map((p) => p.naam), ['Eva']);
  assert.equal(org('meerijdenStoppen', { deelnemerId: CHRIS }).ok, true);
  assert.equal(scherm(beheer, 'carpool').ritten[0].vrij, 1);
  // De organisator biedt een rit aan namens een ander; wie een rit aanbiedt, stapt uit een andere rit.
  const rit2 = org('ritOpslaan', { bestuurderId: BRAM, vertrekplaats: 'Arnhem', vrijePlaatsen: 3 }).data.id;
  assert.ok(rit2);
  assert.equal(scherm(beheer, 'carpool').ritten.find((r) => r.id === rit).meerijders.length, 0);
  // Een rit annuleren haalt zijn meerijders weg.
  org('meerijden', { ritId: rit2, deelnemerId: CHRIS });
  assert.equal(chris('ritOpslaan', { id: rit2, verwijderen: true }).fout, 'geen_toegang');
  assert.equal(bram('ritOpslaan', { id: rit2, verwijderen: true }).ok, true);
  assert.equal(nep.store.lees('Meerijders').length, 0);
  assert.equal(scherm(beheer, 'carpool').ritten.length, 1);
});
