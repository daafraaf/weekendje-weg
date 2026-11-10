import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { herinneringTekst, stapTekst, heeftLinkEnPincode, namenLijst } from '../../src/shared/whatsapp.js';
import { STAPPEN } from '../../src/shared/stappen.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/basis.json', import.meta.url), 'utf8'));
const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';

function opzet({ stap = 'overzicht', antwoorden = true } = {}) {
  const demo = maakDemo({ antwoorden, stap });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'bram'), soort: 'deelnemer', subjectId: BRAM, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const scherm = (sessie, naam, extra = {}) => vraag({ actie: 'scherm', sessie, data: { naam }, ...extra });
  const zet = (stap2) => vraag({ actie: 'stapZetten', sessie: beheer, data: { stap: stap2 } });
  const bijwerken = (data) => vraag({ actie: 'editieBijwerken', sessie: beheer, data });
  const editie = () => { nep.store.nieuwVerzoek(); return nep.store.vind('Edities', DEMO_EDITIE_ID); };
  return { demo, nep, vraag, beheer, scherm, zet, bijwerken, editie };
}

test('OVZ-7 AAN-07: het overzicht voor een deelnemer bevat geen deelnemer-ID\'s, namen of vrije tekst', () => {
  const { scherm, demo } = opzet();
  const r = scherm('bram', 'overzicht');
  assert.equal(r.ok, true);
  const tekst = JSON.stringify(r.data);
  assert.equal(r.data.detail, undefined);
  for (const d of demo.seed.Deelnemers) assert.ok(!tekst.includes(d.id), `deelnemer-ID ${d.id} gelekt`);
  for (const l of demo.seed.Leden) {
    assert.ok(!tekst.includes(l.id), `lid-ID ${l.id} gelekt`);
    assert.ok(!tekst.includes(l.voornaam), `naam ${l.voornaam} gelekt`);
    assert.ok(!tekst.includes(l.woonplaats), `woonplaats ${l.woonplaats} gelekt`);
  }
  for (const a of fixture.antwoorden) {
    assert.ok(!tekst.includes(a.id), 'antwoord-ID gelekt');
    for (const k of ['activiteitenEigen', 'programmaEigen', 'etenDrinkenEigen']) {
      if (a.data[k]) assert.ok(!tekst.includes(a.data[k]), `vrije tekst ${k} gelekt`);
    }
  }
  assert.ok(!/deelnemerId|lidId|"data"/.test(tekst));
});

test('OVZ-7: ook een eigen tekstvraag en het blok samenwerken komen niet bij een deelnemer', () => {
  const { nep, scherm } = opzet();
  nep.store.nieuwVerzoek();
  const q = nep.store.voegToe('Vragen', { editieId: DEMO_EDITIE_ID, volgorde: 1, type: 'tekst', tekst: 'Wat nog?', opties: [] });
  const rij = nep.store.lees('Antwoorden').find((a) => a.deelnemerId === BRAM);
  nep.store.werkBij('Antwoorden', rij.id, { data: { ...rij.data, samenwerken: 'ja', eigenVragen: { [q.id]: 'Geheim antwoordje' } } }, rij.versie);
  nep.store.flush();
  const tekst = JSON.stringify(scherm('anna', 'overzicht').data);
  assert.ok(!tekst.includes('Geheim antwoordje'));
  assert.ok(!tekst.includes('samenwerken'));
});

test('OVZ-3: voor de stap Overzicht krijgt een deelnemer het overzicht niet, de organisator wel', () => {
  const { scherm, beheer } = opzet({ stap: 'invullen' });
  assert.equal(scherm('anna', 'overzicht').fout, 'gesloten');
  assert.equal(scherm(beheer, 'overzicht').ok, true);
});

test('OVZ-4 OVZ-5: aantallen per weekend, de top 5 met de demo-voorkeursdatum en de bandbreedtes', () => {
  const { scherm } = opzet();
  const d = scherm('anna', 'overzicht').data;
  assert.equal(d.aantal, 4);
  assert.equal(d.ingevuld, 3);
  assert.equal(d.weekenden.length, 53);
  const juni = d.weekenden.find((w) => w.vrijdag === '2027-06-11');
  assert.deepEqual([juni.ja, juni.misschien, juni.nee, juni.leeg], [3, 0, 0, 1]);
  assert.deepEqual(d.top.map((t) => t.vrijdag), ['2027-06-11', '2027-05-14', '2027-09-24', '2027-06-18', '2027-10-01']);
  assert.ok(d.top[1].gelijk && d.top[2].gelijk); // gelijkspel op de tweede plek
  assert.deepEqual(d.budgetVerblijf, { min: 10000, max: 20000, aantal: 3 });
  assert.deepEqual(d.budgetWeekend, { min: 20000, max: 40000, aantal: 3 });
  assert.deepEqual(d.reistijd, { min: 2, max: 4, aantal: 3 });
  const act = d.wensen.find((w) => w.blok === 'activiteiten').items;
  assert.equal(act.find((i) => i.label === 'Wandelen').aantal, 3);
  assert.equal(act.find((i) => i.label === 'Escape room').aantal, 1);
});

test('OVZ-4: een afgehaakte deelnemer telt niet mee', () => {
  const { nep, scherm } = opzet();
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Deelnemers', BRAM, { afgehaakt: true });
  nep.store.flush();
  const d = scherm('anna', 'overzicht').data;
  assert.equal(d.aantal, 3);
  const juni = d.weekenden.find((w) => w.vrijdag === '2027-06-11');
  assert.equal(juni.ja, 2);
});

test('AAN-56: eigen vragen ja/nee, keuze, meerkeuze en schaal geven aantallen per optie, tekstvragen niet', () => {
  const { nep, scherm } = opzet();
  nep.store.nieuwVerzoek();
  const qs = [
    nep.store.voegToe('Vragen', { editieId: DEMO_EDITIE_ID, volgorde: 1, type: 'janee', tekst: 'Hond mee?', opties: [] }),
    nep.store.voegToe('Vragen', { editieId: DEMO_EDITIE_ID, volgorde: 2, type: 'meerkeuze', tekst: 'Welke avond?', opties: [{ sleutel: 'vr', label: 'Vrijdag' }, { sleutel: 'za', label: 'Zaterdag' }] }),
    nep.store.voegToe('Vragen', { editieId: DEMO_EDITIE_ID, volgorde: 3, type: 'schaal', tekst: 'Hoe druk?', opties: [] }),
    nep.store.voegToe('Vragen', { editieId: DEMO_EDITIE_ID, volgorde: 4, type: 'tekst', tekst: 'Opmerking?', opties: [] }),
  ];
  for (const [deelnemer, waarden] of [[BRAM, ['ja', 'vr,za', '4', 'x']], ['dln0000000000004', ['nee', 'za', '4', 'y']]]) {
    const rij = nep.store.lees('Antwoorden').find((a) => a.deelnemerId === deelnemer);
    nep.store.werkBij('Antwoorden', rij.id, { data: { ...rij.data, eigenVragen: Object.fromEntries(qs.map((q, i) => [q.id, waarden[i]])) } }, rij.versie);
  }
  nep.store.flush();
  const v = scherm('anna', 'overzicht').data.vragen;
  assert.equal(v.length, 3);
  assert.deepEqual(v[0].opties, [{ label: 'Ja', aantal: 1 }, { label: 'Nee', aantal: 1 }]);
  assert.deepEqual(v[1].opties, [{ label: 'Vrijdag', aantal: 1 }, { label: 'Zaterdag', aantal: 2 }]);
  assert.equal(v[2].opties.find((o) => o.label === '4').aantal, 2);
});

test('OVZ-6 AAN-07: de organisator ziet alles per persoon, inclusief vrije tekst en woonplaats', () => {
  const { scherm, beheer } = opzet();
  const d = scherm(beheer, 'overzicht').data.detail;
  assert.equal(d.personen.length, 4);
  const bram = d.personen.find((p) => p.voornaam === 'Bram');
  assert.equal(bram.woonplaats, 'Arnhem');
  assert.equal(bram.data.etenDrinkenEigen, 'Notenallergie');
  assert.equal(bram.ingevuld, true);
  const anna = d.personen.find((p) => p.voornaam === 'Anna');
  assert.equal(anna.ingevuld, false);
  assert.ok(d.lijsten.activiteiten.length > 0);
});

test('OVZ-1: voortgang toont per deelnemer naam en ingevuld, plus de deadline, zonder ID\'s', () => {
  const { scherm, beheer, demo } = opzet({ stap: 'invullen' });
  const r = scherm('anna', 'voortgang').data;
  assert.equal(r.organisator, false);
  assert.equal(r.editie.deadline, demo.seed.Edities[0].deadline);
  assert.deepEqual(r.deelnemers.map((d) => [d.voornaam, d.ingevuld]), [['Anna', false], ['Bram', true], ['Chris', true], ['Eva', true]]);
  const tekst = JSON.stringify(r);
  for (const d of demo.seed.Deelnemers) assert.ok(!tekst.includes(d.id));
  assert.equal(scherm(beheer, 'voortgang').data.organisator, true);
});

test('OVZ-1: een beheersessie zonder gekozen editie krijgt de eigen editie', () => {
  const { vraag, beheer } = opzet({ stap: 'invullen' });
  const r = vraag({ actie: 'scherm', sessie: beheer, editieId: undefined, data: { naam: 'voortgang' } });
  assert.equal(r.ok, true);
  assert.equal(r.data.editie.id, DEMO_EDITIE_ID);
  assert.deepEqual(r.data.edities.map((e) => e.id), [DEMO_EDITIE_ID]);
});

test('OVZ-2: de herinnering noemt wie nog niet heeft ingevuld en de deadline', () => {
  assert.equal(namenLijst(['Joris', 'Sanne']), 'Joris en Sanne');
  assert.equal(namenLijst(['A', 'B', 'C']), 'A, B en C');
  const t = herinneringTekst({ editieTitel: 'Weekendje weg 2027', namen: ['Joris', 'Sanne'], deadline: '2026-12-01T23:59:00+01:00' });
  assert.equal(t, 'Hoi allemaal! Joris en Sanne, jullie wensen voor Weekendje weg 2027 staan nog open. Invullen kan tot dinsdag 1 december.');
  assert.match(herinneringTekst({ editieTitel: 'X', namen: ['Anna'], deadline: '2026-12-01T23:59:00+01:00' }), /Anna, jouw wensen/);
});

test('EDI-7 AAN-05: de organisator zet de stap één vooruit of terug, de deelnemer niet', () => {
  const { zet, vraag, editie } = opzet({ stap: 'invullen' });
  assert.equal(vraag({ actie: 'stapZetten', sessie: 'anna', data: { stap: 'overzicht' } }).fout, 'geen_toegang');
  assert.equal(zet('accommodatie').fout, 'ongeldig');
  assert.equal(zet('overzicht').data.editie.stap, 'overzicht');
  assert.equal(zet('invullen').ok, true);
  assert.equal(zet('overzicht').ok, true);
  assert.equal(zet('accommodatie').ok, true);
  assert.equal(zet('invullen').fout, 'ongeldig');
  assert.equal(zet('overzicht').ok, true);
  assert.equal(editie().stap, 'overzicht');
});

test('AAN-04: naar Overzicht sluit het invullen, ook voor de deadline', () => {
  const { zet, vraag } = opzet({ stap: 'invullen', antwoorden: false });
  const opslaan = () => vraag({ actie: 'antwoordenOpslaan', sessie: 'anna', data: { versie: 0, data: { maxReistijdUur: 2 } } });
  assert.equal(zet('overzicht').ok, true);
  assert.equal(opslaan().fout, 'gesloten');
  assert.equal(zet('invullen').ok, true);
  assert.equal(opslaan().ok, true);
});

test('EDI-8: de organisator past verwachte data aan en maakt er een leeg', () => {
  const { bijwerken, editie } = opzet({ stap: 'accommodatie' });
  const r = bijwerken({ stapData: { voorbereiding: '2027-05-28', accommodatie: '' } });
  assert.equal(r.ok, true);
  assert.equal(r.data.editie.stapData.voorbereiding, '2027-05-28');
  assert.equal(editie().stapData.accommodatie, undefined);
  assert.equal(editie().stapData.invullen, fixture.stapData.invullen);
  assert.equal(bijwerken({ stapData: { weekend: '28-05-2027' } }).fout, 'ongeldig');
});

test('EDI-10 AAN-57: verlengen alleen in Invullen en naar een latere deadline; Invullen schuift mee', () => {
  const { nep, bijwerken, editie, zet } = opzet({ stap: 'invullen' });
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', DEMO_EDITIE_ID, { deadline: '2027-03-01T23:59:00+01:00' }, 1);
  nep.store.flush();
  assert.equal(bijwerken({ deadline: '2027-02-01T23:59:00+01:00' }).fout, 'ongeldig');
  const r = bijwerken({ deadline: '2027-03-08T23:59:00+01:00' });
  assert.equal(r.ok, true);
  assert.equal(editie().deadline, '2027-03-08T23:59:00+01:00');
  assert.equal(editie().stapData.invullen, '2027-03-08');
  assert.equal(editie().stapData.overzicht, fixture.stapData.overzicht);
  zet('overzicht');
  assert.equal(bijwerken({ deadline: '2027-03-20T23:59:00+01:00' }).fout, 'gesloten');
});

test('AAN-58: elke stap heeft een tekst met de verwachte datum van de volgende stap, zonder link of pincode', () => {
  const stapData = { invullen: '2026-12-01', overzicht: '2026-12-03', accommodatie: '2026-12-15' };
  for (const stap of STAPPEN) {
    const t = stapTekst({ editieTitel: 'Weekendje weg 2027', stap, stapData, deadline: '2026-12-01T23:59:00+01:00' });
    assert.ok(t.includes('Weekendje weg 2027'));
    assert.ok(!heeftLinkEnPincode(t));
  }
  assert.match(stapTekst({ editieTitel: 'W', stap: 'invullen', stapData, deadline: '2026-12-01T23:59:00+01:00' }), /tot dinsdag 1 december\. De stap Weekendje prikker volgt rond donderdag 3 december\.$/);
  assert.match(stapTekst({ editieTitel: 'W', stap: 'accommodatie', stapData }), /De stap Meenemen volgt later, de datum hoor je nog\.$/);
  assert.ok(!/volgt/.test(stapTekst({ editieTitel: 'W', stap: 'afgerond', stapData })));
});
