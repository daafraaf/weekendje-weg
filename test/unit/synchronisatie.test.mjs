import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';
import { maakWachtrij, WACHTRIJ_SLEUTEL, SYNC_TEKST, TERUG_TEKST } from '../../src/web/wachtrij.js';
import { maakStand, pasItemsToe, pasAntwoordToe, pasTop3Toe } from '../../src/web/stand.js';
import { BUNDEL_ACTIES, BUNDEL_MAX, DEBOUNCE_MS, WACHTTIJDEN_MS } from '../../src/shared/synchronisatie.js';

const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';

function opzet({ stap = 'voorbereiding' } = {}) {
  const demo = maakDemo({ stap, items: true });
  const nep = maakNepApi({ seed: demo.seed });
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'bram'), soort: 'deelnemer', subjectId: BRAM, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const vraag = (sessie, actie, data) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, sessie, actie, data }));
  const bundel = (sessie, acties) => vraag(sessie, 'bundel', { acties });
  const lees = (tab) => { nep.store.nieuwVerzoek(); return nep.store.lees(tab); };
  const keuken = () => lees('Items').filter((i) => i.soort === 'keuken');
  return { nep, vraag, bundel, lees, keuken };
}

// Klok voor de wachtrij: timers lopen alleen als de test de tijd vooruitzet.
function nepKlok() {
  let nu = 0;
  let volgende = 1;
  const wacht = new Map();
  const rust = () => new Promise((r) => setImmediate(r));
  return {
    timers: {
      setTimeout: (f, ms) => { const id = volgende++; wacht.set(id, { op: nu + ms, f }); return id; },
      clearTimeout: (id) => { wacht.delete(id); },
    },
    async verder(ms) {
      const eind = nu + ms;
      for (;;) {
        await rust();
        const [id, t] = [...wacht.entries()].sort((a, b) => a[1].op - b[1].op)[0] || [];
        if (!t || t.op > eind) break;
        nu = t.op;
        wacht.delete(id);
        t.f();
      }
      nu = eind;
      await rust();
    },
  };
}

function nepOpslag(start = {}) {
  const m = new Map(Object.entries(start));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('SYNC-2 SYNC-7: een bundel voert elke actie uit met een eigen uitslag; een fout stopt de rest niet', () => {
  const { bundel, lees, keuken } = opzet();
  const [a, b] = keuken();
  const r = bundel('anna', [
    { actie: 'claimen', data: { itemId: a.id } },
    { actie: 'afvinken', data: { itemId: 'onbekend0000000x' } },
    { actie: 'afvinken', data: { itemId: b.id, afgevinkt: true } },
  ]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.data.uitslagen.map((u) => u.ok), [true, false, true]);
  assert.equal(r.data.uitslagen[1].fout, 'ongeldig');
  assert.ok(lees('Claims').some((c) => c.itemId === a.id && c.deelnemerId === ANNA));
  assert.equal(lees('Items').find((i) => i.id === b.id).afgevinkt, true);
  // NFR-16: elke geslaagde actie staat in het Log, de bundel zelf niet.
  const log = lees('Log').map((l) => l.actie);
  assert.deepEqual(log.filter((x) => x !== 'bundel'), log);
  assert.ok(log.includes('claimen') && log.includes('afvinken'));
});

test('SYNC-2 AAN-82 AAN-83: alleen de vaste lijst en hooguit 25 acties in één bundel', () => {
  const { bundel, keuken } = opzet();
  assert.deepEqual(BUNDEL_ACTIES, ['claimen', 'claimIntrekken', 'afvinken', 'antwoordZetten', 'top3Opgeven']);
  assert.equal(BUNDEL_MAX, 25);
  assert.equal(DEBOUNCE_MS, 1000);
  assert.deepEqual(WACHTTIJDEN_MS, [2000, 4000, 8000, 16000, 30000]);
  assert.equal(bundel('anna', [{ actie: 'itemOpslaan', data: { soort: 'spullen', naam: 'Tent' } }]).fout, 'ongeldig');
  assert.equal(bundel('anna', [{ actie: 'stapZetten', data: {} }]).fout, 'ongeldig');
  const item = keuken()[0];
  const veel = Array.from({ length: 26 }, () => ({ actie: 'claimen', data: { itemId: item.id } }));
  assert.equal(bundel('anna', veel).fout, 'ongeldig');
  assert.equal(bundel('anna', veel.slice(0, 25)).ok, true);
  assert.equal(bundel(undefined, veel.slice(0, 1)).fout, 'geen_toegang');
});

test('SYNC-7 AAN-83: twee deelnemers die tegelijk verschillende items aanvinken houden allebei hun vinkje', () => {
  const { bundel, lees, keuken } = opzet();
  const [a, b, c] = keuken();
  // Beide hebben het scherm met dezelfde versies geladen; de bundels komen na elkaar onder het slot binnen.
  assert.equal(bundel('anna', [{ actie: 'afvinken', data: { itemId: a.id, afgevinkt: true } }, { actie: 'claimen', data: { itemId: c.id } }]).ok, true);
  assert.equal(bundel('bram', [{ actie: 'afvinken', data: { itemId: b.id, afgevinkt: true } }, { actie: 'claimen', data: { itemId: c.id } }]).ok, true);
  const items = lees('Items');
  assert.equal(items.find((i) => i.id === a.id).afgevinkt, true);
  assert.equal(items.find((i) => i.id === b.id).afgevinkt, true);
  assert.deepEqual(lees('Claims').filter((x) => x.itemId === c.id).map((x) => x.deelnemerId).sort(), [ANNA, BRAM]);
  // Laatste wint zonder versiecheck, en twee keer hetzelfde is geen fout (idempotent).
  const r = bundel('bram', [{ actie: 'afvinken', data: { itemId: a.id, afgevinkt: false } }, { actie: 'claimIntrekken', data: { itemId: b.id } }, { actie: 'claimIntrekken', data: { itemId: b.id } }]);
  assert.deepEqual(r.data.uitslagen.map((u) => u.ok), [true, true, true]);
  assert.equal(lees('Items').find((i) => i.id === a.id).afgevinkt, false);
});

test('SYNC-7 K4 FRM-8 AAN-83: antwoordZetten schrijft één veld, laat de rest staan en zet ingevuld', () => {
  const { vraag, lees } = opzet({ stap: 'invullen' });
  const zet = (veld, waarde) => vraag('anna', 'bundel', { acties: [{ actie: 'antwoordZetten', data: { veld, waarde } }] }).data.uitslagen[0];
  assert.equal(zet('woonplaats', '  Utrecht ').ok, true);
  const u = zet('beschikbaarheid', { '2027-04-09': 'ja' });
  assert.equal(u.ok, true);
  assert.equal(u.data.ingevuld, true);
  assert.equal(zet('budgetVerblijf', 15000).ok, true);
  let rij = lees('Antwoorden').find((a) => a.deelnemerId === ANNA);
  assert.deepEqual(rij.data, { woonplaats: 'Utrecht', beschikbaarheid: { '2027-04-09': 'ja' }, budgetVerblijf: 15000 });
  assert.equal(lees('Deelnemers').find((d) => d.id === ANNA).ingevuld, true);
  // null haalt het veld weg; een ongeldige waarde of een onbekend veld wordt geweigerd (NFR-6).
  assert.equal(zet('budgetVerblijf', null).ok, true);
  assert.equal(zet('budgetVerblijf', 12345).fout, 'ongeldig');
  assert.equal(zet('budgetVerblijf', 'veel').fout, 'ongeldig');
  assert.equal(zet('bestaatNiet', 1).fout, 'ongeldig');
  assert.equal(zet('woonplaats', 'U').fout, 'ongeldig');
  rij = lees('Antwoorden').find((a) => a.deelnemerId === ANNA);
  assert.equal(rij.data.budgetVerblijf, undefined);
  assert.equal(rij.data.woonplaats, 'Utrecht');
  // Een tweede apparaat met een oude versie overschrijft alleen zijn eigen veld (laatste wint per veld).
  assert.equal(zet('maxReistijdUur', 3).ok, true);
  assert.deepEqual(Object.keys(lees('Antwoorden').find((a) => a.deelnemerId === ANNA).data).sort(), ['beschikbaarheid', 'maxReistijdUur', 'woonplaats']);
});

test('FRM-9 SYNC-7: antwoordZetten na de stap Invullen geeft gesloten', () => {
  const { vraag } = opzet({ stap: 'overzicht' });
  const u = vraag('anna', 'bundel', { acties: [{ actie: 'antwoordZetten', data: { veld: 'woonplaats', waarde: 'Utrecht' } }] });
  assert.equal(u.ok, true);
  assert.equal(u.data.uitslagen[0].fout, 'gesloten');
});

test('SYNC-2: tien snelle handelingen gaan na de stilte in één aanroep; dezelfde sleutel telt één keer', async () => {
  const klok = nepKlok();
  const verzonden = [];
  const w = maakWachtrij({ opslag: nepOpslag(), eigenaar: () => 'x', timers: klok.timers, verstuur: async (acties) => { verzonden.push(acties); return { uitslagen: acties.map(() => ({ ok: true, data: {} })) }; } });
  w.start();
  for (let i = 0; i < 10; i += 1) { w.zet({ actie: 'claimen', data: { itemId: `item${i % 4}` }, sleutel: `claim:item${i % 4}` }); await klok.verder(100); }
  assert.equal(w.status(), 'bezig');
  assert.equal(verzonden.length, 0);
  await klok.verder(DEBOUNCE_MS);
  assert.equal(verzonden.length, 1);
  assert.equal(verzonden[0].length, 4);
  assert.equal(w.aantal(), 0);
  assert.equal(w.status(), 'opgeslagen');
  assert.equal(SYNC_TEKST[w.status()], 'Opgeslagen');
});

test('SYNC-3: de wachtrij overleeft herladen en gaat bij openen alsnog; kapotte opslag is geen fout', async () => {
  const opslag = nepOpslag();
  const klok = nepKlok();
  const eerst = maakWachtrij({ opslag, eigenaar: () => 'demo:deelnemer:e1', timers: klok.timers, verstuur: async () => { throw Object.assign(new Error(''), { code: 'offline' }); } });
  eerst.start();
  eerst.zet({ actie: 'afvinken', data: { itemId: 'a', afgevinkt: true }, sleutel: 'vink:a', editieId: 'e1' });
  eerst.zet({ actie: 'claimen', data: { itemId: 'b' }, sleutel: 'claim:b', editieId: 'e1' });
  assert.ok(opslag.getItem(`${WACHTRIJ_SLEUTEL}:demo:deelnemer:e1`));

  // Het tabblad sluit voordat er iets verstuurd is; een nieuwe pagina leest dezelfde opslag.
  const verzonden = [];
  const klok2 = nepKlok();
  const later = maakWachtrij({ opslag, eigenaar: () => 'demo:deelnemer:e1', timers: klok2.timers, verstuur: async (acties, editieId) => { verzonden.push({ acties, editieId }); return { uitslagen: acties.map(() => ({ ok: true })) }; } });
  later.start();
  assert.equal(later.aantal(), 2);
  await klok2.verder(10);
  assert.equal(verzonden.length, 1);
  assert.deepEqual(verzonden[0].acties.map((a) => a.actie), ['afvinken', 'claimen']);
  assert.equal(verzonden[0].editieId, 'e1');
  assert.equal(opslag.getItem(`${WACHTRIJ_SLEUTEL}:demo:deelnemer:e1`), null);

  // Een andere eigenaar ziet die wachtrij niet; rommel in de opslag wordt genegeerd.
  opslag.setItem(`${WACHTRIJ_SLEUTEL}:ander`, '{kapot');
  const ander = maakWachtrij({ opslag, eigenaar: () => 'ander', timers: klok2.timers, verstuur: async () => ({ uitslagen: [] }) });
  ander.start();
  assert.equal(ander.aantal(), 0);
  // localStorage die gooit (privémodus, vol): de wachtrij werkt in het geheugen.
  const stuk = { getItem() { throw new Error('geen opslag'); }, setItem() { throw new Error('vol'); }, removeItem() { throw new Error('geen opslag'); } };
  const geheugen = maakWachtrij({ opslag: stuk, eigenaar: () => 'x', timers: klok2.timers, verstuur: async (acties) => ({ uitslagen: acties.map(() => ({ ok: true })) }) });
  geheugen.start();
  geheugen.zet({ actie: 'claimen', data: { itemId: 'c' } });
  assert.equal(geheugen.aantal(), 1);
  await klok2.verder(DEBOUNCE_MS);
  assert.equal(geheugen.aantal(), 0);
});

test('SYNC-5 AAN-82: bij een netwerkfout opnieuw na 2, 4, 8, 16 en 30 s, daarna terugdraaien met melding en Opnieuw', async () => {
  const klok = nepKlok();
  const pogingen = [];
  let tijd = 0;
  let stuk = true;
  const w = maakWachtrij({
    opslag: nepOpslag(), eigenaar: () => 'x', timers: klok.timers,
    verstuur: async (acties) => { pogingen.push(tijd); if (stuk) throw Object.assign(new Error(''), { code: 'offline' }); return { uitslagen: acties.map(() => ({ ok: true })) }; },
  });
  const gebeurtenissen = [];
  w.bij((e) => gebeurtenissen.push(e.soort));
  w.start();
  w.zet({ actie: 'claimen', data: { itemId: 'a' } });
  const loop = async (ms) => { for (let i = 0; i < ms / 500; i += 1) { tijd += 500; await klok.verder(500); } };
  await loop(1000);
  assert.equal(w.status(), 'fout');
  assert.equal(SYNC_TEKST.fout, 'Niet opgeslagen, opnieuw proberen');
  await loop(2000 + 4000 + 8000 + 16000 + 30000);
  assert.deepEqual(pogingen, [1000, 3000, 7000, 15000, 31000, 61000]);
  assert.equal(w.aantal(), 0);
  assert.ok(gebeurtenissen.includes('teruggedraaid'));
  assert.equal(w.melding(), TERUG_TEKST);
  // Opnieuw zet de handeling terug; nu lukt het.
  stuk = false;
  await w.opnieuw();
  assert.equal(w.aantal(), 0);
  assert.equal(w.melding(), '');
  assert.equal(w.status(), 'opgeslagen');
});

test('SYNC-5: herstelt de verbinding tijdens het opnieuw proberen, dan lukt het bij de volgende poging', async () => {
  const klok = nepKlok();
  let stuk = true;
  let aanroepen = 0;
  const w = maakWachtrij({ opslag: nepOpslag(), eigenaar: () => 'x', timers: klok.timers, verstuur: async (acties) => { aanroepen += 1; if (stuk) throw Object.assign(new Error(''), { code: 'fout' }); return { uitslagen: acties.map(() => ({ ok: true })) }; } });
  w.start();
  w.zet({ actie: 'claimen', data: { itemId: 'a' } });
  await klok.verder(DEBOUNCE_MS);
  assert.equal(w.status(), 'fout');
  w.zet({ actie: 'claimen', data: { itemId: 'b' } }); // komt erbij zonder de wachttijd te verkorten
  stuk = false;
  await klok.verder(1999);
  assert.equal(aanroepen, 1);
  await klok.verder(1);
  assert.equal(aanroepen, 2);
  assert.equal(w.status(), 'opgeslagen');
  assert.equal(w.aantal(), 0);
});

test('SYNC-1 SYNC-5: de stand toont een handeling direct, schuift haar door na bevestiging en draait haar terug bij een weigering', async () => {
  const klok = nepKlok();
  let antwoord = (acties) => ({ uitslagen: acties.map(() => ({ ok: true })) });
  const w = maakWachtrij({ opslag: nepOpslag(), eigenaar: () => 'x', timers: klok.timers, verstuur: async (acties) => antwoord(acties) });
  w.start();
  const getekend = [];
  const stand = maakStand({ wachtrij: w, toepassen: pasItemsToe, hoort: (a) => a.editieId === 'e1', bijWijziging: (g) => getekend.push(g) });
  const server = { items: [{ id: 'a', claims: [], afgevinkt: false }, { id: 'b', claims: [{ naam: 'Bram', ik: false, deelnemerId: 'bram' }], afgevinkt: false }] };
  stand.zetBevestigd(server);
  stand.zet('claimen', { itemId: 'a' }, { sleutel: 'claim:a:ik', editieId: 'e1' });
  stand.zet('afvinken', { itemId: 'b', afgevinkt: true }, { sleutel: 'vink:b', editieId: 'e1' });
  const nu = getekend.at(-1);
  assert.deepEqual(nu.items[0].claims, [{ naam: '', ik: true }]);
  assert.equal(nu.items[1].afgevinkt, true);
  assert.equal(server.items[0].claims.length, 0); // de gegevens van de Sheet blijven onaangeroerd
  // Opnieuw laden terwijl de handeling onderweg is: ze blijft in beeld.
  assert.equal(stand.zetBevestigd(server).items[1].afgevinkt, true);
  await klok.verder(DEBOUNCE_MS);
  assert.equal(stand.zicht().items[0].claims.length, 1); // doorgeschoven naar bevestigd

  antwoord = (acties) => ({ uitslagen: acties.map(() => ({ ok: false, fout: 'gesloten', melding: 'De boodschappen zijn definitief. Claimen kan niet meer.' })) });
  stand.zet('claimIntrekken', { itemId: 'b', deelnemerId: 'bram' }, { sleutel: 'claim:b:bram', editieId: 'e1' });
  assert.equal(stand.zicht().items[1].claims.length, 0);
  await klok.verder(DEBOUNCE_MS);
  assert.equal(stand.zicht().items[1].claims.length, 1); // teruggedraaid
  assert.match(w.melding(), /teruggezet\. De boodschappen zijn definitief/);
  // Formulier: één veld zetten of weghalen.
  const f = { antwoorden: { data: { woonplaats: 'Zwolle', budgetVerblijf: 5000 } } };
  pasAntwoordToe(f, { actie: 'antwoordZetten', data: { veld: 'woonplaats', waarde: 'Utrecht' } });
  pasAntwoordToe(f, { actie: 'antwoordZetten', data: { veld: 'budgetVerblijf', waarde: null } });
  assert.deepEqual(f.antwoorden.data, { woonplaats: 'Utrecht' });
});

test('AAN-83 ACC-11: de top 3 staat direct in de stand; punten, mensen en aantal gaven schuiven mee', () => {
  const g = { mijnTop3: [{ accommodatieId: 'a', rang: 1 }], gaven: 2, accommodaties: [{ id: 'a', punten: 5, mensen: 2 }, { id: 'b', punten: 2, mensen: 1 }] };
  pasTop3Toe(g, { actie: 'top3Opgeven', data: { keuzes: [{ accommodatieId: 'b', rang: 1 }, { accommodatieId: 'a', rang: 2 }] } });
  assert.deepEqual(g.accommodaties.map((a) => [a.punten, a.mensen]), [[4, 2], [5, 2]]);
  assert.equal(g.gaven, 2);
  pasTop3Toe(g, { actie: 'top3Opgeven', data: { keuzes: [] } });
  assert.deepEqual(g.accommodaties.map((a) => [a.punten, a.mensen]), [[2, 1], [2, 1]]);
  assert.equal(g.gaven, 1);
  assert.deepEqual(g.mijnTop3, []);
  assert.equal(pasTop3Toe(g, { actie: 'afvinken', data: {} }), g);
});

test('SYNC-2 AAN-83 ACC-11: de top 3 gaat in een bundel en geeft per actie een uitslag', () => {
  const demo = maakDemo({ antwoorden: true, stap: 'accommodatie' });
  const nep = maakNepApi({ seed: demo.seed });
  nep.store.nieuwVerzoek();
  const acc = nep.store.voegToe('Accommodaties', { editieId: DEMO_EDITIE_ID, naam: 'Hoeve', plaats: '', link: '', prijsTotaal: 0, notitie: '' });
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const r = (nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, actie: 'bundel', sessie: 'anna', editieId: DEMO_EDITIE_ID, data: { acties: [
    { actie: 'top3Opgeven', data: { keuzes: [{ accommodatieId: acc.id, rang: 1 }] } },
    { actie: 'top3Opgeven', data: { keuzes: [{ accommodatieId: acc.id, rang: 2 }] } },
  ] } })));
  assert.deepEqual(r.data.uitslagen.map((u) => u.ok ? 'ok' : u.fout), ['ok', 'ongeldig']); // één optie: alleen plek 1
  nep.store.nieuwVerzoek();
  assert.deepEqual(nep.store.lees('Stemmen').map((s) => s.rang), [1]);
});
