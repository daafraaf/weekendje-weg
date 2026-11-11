// Fase 33: teksten, onderdelen en details (EDI-10, EDI-11, GRP-5, ACC-10, MEE-10, GELD-12, AAN-89, AAN-90;
// BV-09, BV-10, BV-11, BV-15, BV-27, BV-28, BV-29, BV-30, BV-31, BV-34).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { mag, reden } from '../../src/server/rechten.js';
import { stapTekst, herinneringTekst } from '../../src/shared/whatsapp.js';
import { STAPPEN, stapWaarschuwingen, losmakenGevolgen } from '../../src/shared/stappen.js';
import { nieuweEditieVoorstel } from '../../src/shared/editie.js';
import { bedragenVan } from '../../src/shared/verdeling.js';
import { zelfdeNaam } from '../../src/shared/leden.js';
import { ONDERDELEN } from '../../src/shared/onderdelen.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';

function opzet({ stap = 'voorbereiding' } = {}) {
  const demo = maakDemo({ antwoorden: true, stap, items: true });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const org = (actie, data) => vraag({ actie, sessie: beheer, data });
  const anna = (actie, data) => vraag({ actie, sessie: 'anna', data });
  return { demo, nep, org, anna };
}

const UIT_WOORDEN = ['kook', 'maaltijd', 'programma', 'rijd', 'carpool', 'kamer', 'boodschap'];
const alleUit = Object.fromEntries(Object.keys(ONDERDELEN).map((k) => [k, false]));
const alleAan = Object.fromEntries(Object.keys(ONDERDELEN).map((k) => [k, true]));

test('OND-2 §7.12.4 BV-27: de WhatsApp-teksten per stap noemen geen uitgezet onderdeel', () => {
  for (const stap of STAPPEN) {
    const t = stapTekst({ editieTitel: 'W', stap, deadline: '2026-12-01T23:59:00+01:00', aantalOpties: 2, onderdelen: alleUit }).toLowerCase();
    for (const woord of UIT_WOORDEN) assert.ok(!t.includes(woord), `${stap}: ${woord}`);
  }
  // Met de standaardvlaggen (alles uit, AAN-80) ook niet.
  const mee = stapTekst({ editieTitel: 'W', stap: 'voorbereiding' }).toLowerCase();
  for (const woord of UIT_WOORDEN) assert.ok(!mee.includes(woord), woord);
  // Staan ze aan, dan noemt het bericht ze wel.
  assert.match(stapTekst({ editieTitel: 'W', stap: 'voorbereiding', onderdelen: alleAan }), /wanneer je kookt en met wie je rijdt/);
  assert.match(stapTekst({ editieTitel: 'W', stap: 'weekend', onderdelen: alleAan }), /Het programma staat in de app/);
});

test('OND-2 BV-27: de bevestiging bij Ander weekend kiezen noemt geen uitgezet onderdeel', () => {
  const uit = losmakenGevolgen({ aftellen: true, onderdelen: alleUit }).join(' ').toLowerCase();
  for (const woord of UIT_WOORDEN) assert.ok(!uit.includes(woord), woord);
  assert.match(uit, /aftelteller/);
  const standaard = losmakenGevolgen({ aftellen: false }).join(' ').toLowerCase();
  assert.ok(!/maaltijd|programma/.test(standaard));
  const aan = losmakenGevolgen({ aftellen: false, onderdelen: alleAan, geboektNaam: 'Hoeve', weekendTekst: '4 juni' });
  assert.ok(aan.some((t) => t.includes('De datums bij de maaltijden en het programma verdwijnen')));
  assert.ok(aan.some((t) => t.startsWith('Hoeve blijft op geboekt staan')));
});

test('§7.12.4 BV-28: zonder opties vraagt het bericht bij Accommodatie geen top 3 en waarschuwt Stappen', () => {
  const zonder = stapTekst({ editieTitel: 'W', stap: 'accommodatie', deelvorm: 'samen', aantalOpties: 0 });
  assert.ok(!/top 3/.test(zonder));
  assert.match(zonder, /binnenkort opties/);
  assert.match(stapTekst({ editieTitel: 'W', stap: 'accommodatie', deelvorm: 'samen', aantalOpties: 2 }), /geef je top 3/);
  const w = stapWaarschuwingen({ van: 'overzicht', naar: 'accommodatie', aantalOpties: 0, deelvorm: 'samen' });
  assert.equal(w.length, 1);
  assert.match(w[0], /nog geen accommodaties/);
  assert.deepEqual(stapWaarschuwingen({ van: 'overzicht', naar: 'accommodatie', aantalOpties: 3, deelvorm: 'samen' }), []);
  assert.deepEqual(stapWaarschuwingen({ van: 'overzicht', naar: 'accommodatie', deelvorm: 'samen' }), []); // onbekend: geen vraag
});

test('EDI-10 DDL-1 BV-10: de herinnering en het bericht bij Invullen zeggen "Graag ingevuld vóór", nooit dat invullen sluit', () => {
  const dl = '2026-12-01T23:59:00+01:00';
  for (const t of [herinneringTekst({ editieTitel: 'W', namen: ['Anna'], deadline: dl }), stapTekst({ editieTitel: 'W', stap: 'invullen', deadline: dl })]) {
    assert.match(t, /Graag ingevuld vóór dinsdag 1 december\./);
    assert.ok(!/kan tot|kan nu tot/i.test(t), t);
  }
});

test('EDI-11 AAN-89 BV-11: nieuweEditieVoorstel kiest het eerste vrije jaar vanaf nu, de titel met dat jaar en het kalenderjaar', () => {
  const nu = new Date('2026-11-11T12:00:00Z');
  assert.deepEqual(nieuweEditieVoorstel({ jaren: [2026, 2027], nu }), { jaar: 2028, titel: 'Weekendje weg 2028', periodeVan: '2028-01-01', periodeTot: '2028-12-31' });
  assert.equal(nieuweEditieVoorstel({ jaren: [], nu }).jaar, 2026);
  assert.equal(nieuweEditieVoorstel({ jaren: [2025, 2027], nu }).jaar, 2026);
  assert.equal(nieuweEditieVoorstel({ jaren: [2026, 2028], nu }).jaar, 2027);
});

test('EDI-11 AAN-89: het beheerscherm geeft de bezette jaren van de groep mee', () => {
  const { org } = opzet({ stap: 'invullen' });
  assert.deepEqual(org('scherm', { naam: 'beheer' }).data.jaren, [2027]);
});

test('GRP-5 AAN-90 BV-15: zichzelf inactief maken geeft ongeldig, een ander lid kan wel', () => {
  const { demo, org } = opzet({ stap: 'invullen' });
  const zelf = demo.seed.Leden[0].id;
  const r = org('ledenBeheren', { soort: 'inactief', id: zelf });
  assert.equal(r.fout, 'ongeldig');
  assert.match(r.melding, /jezelf/);
  const ander = demo.seed.Leden.find((l) => l.id !== zelf && l.actief);
  // Een ander lid inactief maken blijft mogelijk (of geeft de grens van het minimum, niet ongeldig).
  assert.notEqual(org('ledenBeheren', { soort: 'inactief', id: ander.id }).fout, 'ongeldig');
});

test('GRP-5 AAN-90: een dubbele voornaam geeft een waarschuwing, zonder hoofdletters en spaties', () => {
  const leden = [{ id: 'a', voornaam: 'Rick' }, { id: 'b', voornaam: 'Anna' }];
  assert.equal(zelfdeNaam(leden, ' rick '), true);
  assert.equal(zelfdeNaam(leden, 'Rik'), false);
  assert.equal(zelfdeNaam(leden, 'Rick', 'a'), false); // het lid zelf telt niet
});

test('TOE-7 §6 MEE-10 BV-30: item toewijzen aan een deelnemer kan alleen de organisator', () => {
  assert.ok(mag('organisator', 'claimToewijzen', { editieId: 'e', organisatorVanEditie: true, stap: 'voorbereiding' }));
  assert.equal(reden('deelnemer', 'claimToewijzen', { editieId: 'e', stap: 'voorbereiding', eigen: true }), 'geen_toegang');
  const { org, anna, nep } = opzet();
  const item = org('itemOpslaan', { soort: 'spullen', naam: 'Petanqueset' }).data;
  assert.equal(anna('claimToewijzen', { itemId: item.id, deelnemerId: BRAM }).fout, 'geen_toegang');
  assert.equal(org('claimToewijzen', { itemId: item.id, deelnemerId: ANNA }).ok, true);
  assert.equal(org('claimToewijzen', { itemId: item.id, deelnemerId: ANNA }).ok, true); // tweede keer genegeerd
  nep.store.nieuwVerzoek();
  assert.deepEqual(nep.store.lees('Claims').filter((c) => c.itemId === item.id).map((c) => c.deelnemerId), [ANNA]);
  const s = anna('scherm', { naam: 'meenemen' }).data;
  assert.deepEqual(s.items.find((i) => i.id === item.id).claims.map((c) => c.ik), [true]);
  // De organisator krijgt de deelnemers voor de keuzelijst, een deelnemer niet.
  assert.ok(org('scherm', { naam: 'meenemen' }).data.deelnemers.some((d) => d.id === BRAM));
  assert.equal(s.deelnemers, undefined);
  // Een afgehaakte deelnemer of iemand van buiten de editie kan geen claim krijgen.
  assert.equal(org('afhakenMarkeren', { deelnemerId: BRAM, afgehaakt: true }).ok, true);
  assert.equal(org('claimToewijzen', { itemId: item.id, deelnemerId: BRAM }).fout, 'gesloten');
  assert.equal(org('claimToewijzen', { itemId: item.id, deelnemerId: 'dln9999999999999' }).fout, 'ongeldig');
});

test('GELD-12 BV-34: wisselen naar Bedrag neemt de bedragen van de vorige verdeling over', () => {
  const delen = bedragenVan(10000, { wijze: 'gelijk', deelnemers: ['jan', 'klaas', 'piet'] }, { betalerId: 'jan' });
  assert.deepEqual(delen, { jan: 3334, klaas: 3333, piet: 3333 });
  assert.deepEqual(bedragenVan(9000, { wijze: 'aandeel', aandelen: { jan: 1, klaas: 2 } }), { jan: 3000, klaas: 6000 });
  assert.deepEqual(bedragenVan(0, { wijze: 'gelijk', deelnemers: ['jan'] }), {});
});
