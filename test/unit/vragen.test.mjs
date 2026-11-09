import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { LIJSTEN_STANDAARD, antwoordGeldig, lijstenVan, maakSleutel } from '../../src/shared/lijsten.js';
import { BLOKKEN_STANDAARD } from '../../src/shared/editie.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';
const GELDIG = { beschikbaarheid: { '2027-04-09': 'ja' }, budgetVerblijf: 15000, budgetWeekend: 40000, maxReistijdUur: 2 };

function opzet() {
  const demo = maakDemo();
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const beheren = (data) => vraag({ actie: 'vragenBeheren', sessie: beheer, data });
  const bijwerken = (data) => vraag({ actie: 'editieBijwerken', sessie: beheer, data });
  const formulier = () => vraag({ actie: 'scherm', sessie: 'anna', data: { naam: 'formulier' } }).data;
  const opslaan = (data, versie = 0) => vraag({ actie: 'antwoordenOpslaan', sessie: 'anna', data: { versie, data } });
  const rijen = (tab) => { nep.store.nieuwVerzoek(); return nep.store.lees(tab); };
  return { demo, nep, vraag, beheer, beheren, bijwerken, formulier, opslaan, rijen };
}

test('EDI-2 FRM-5: de organisator past een lijst aan en de deelnemer ziet de nieuwe lijst', () => {
  const { bijwerken, formulier, vraag } = opzet();
  assert.deepEqual(formulier().editie.lijsten.activiteiten, lijstenVan({}).activiteiten); // startlijst zonder opgeslagen lijst
  const lijst = formulier().editie.lijsten.activiteiten;
  const nieuw = [{ sleutel: lijst[0].sleutel, label: 'Lange wandeling' }, { label: 'Kanoën' }, { label: 'Kanoën' }];
  const r = bijwerken({ lijsten: { activiteiten: nieuw } });
  assert.equal(r.ok, true);
  const na = formulier().editie.lijsten.activiteiten;
  assert.equal(na.length, 3);
  assert.equal(na[0].sleutel, lijst[0].sleutel); // hernoemen behoudt de sleutel
  assert.equal(na[0].label, 'Lange wandeling');
  assert.equal(new Set(na.map((o) => o.sleutel)).size, 3); // twee keer dezelfde naam geeft toch unieke sleutels
  assert.deepEqual(formulier().editie.lijsten.programma, lijstenVan({}).programma); // andere lijsten blijven
  assert.equal(vraag({ actie: 'editieBijwerken', sessie: 'anna', data: { lijsten: { activiteiten: [] } } }).ok, false); // een deelnemer mag het niet
});

test('AAN-21 FRM-6: blokken staan standaard aan, Samenwerken uit; de organisator zet ze om', () => {
  const { bijwerken, formulier } = opzet();
  assert.deepEqual(formulier().editie.blokken, { ...BLOKKEN_STANDAARD });
  bijwerken({ blokken: { samenwerken: true, programma: false } });
  assert.deepEqual(formulier().editie.blokken, { etenDrinken: true, activiteiten: true, programma: false, samenwerken: true });
});

test('AAN-55 EDI-2: na de stap Invullen zijn blokken, lijsten en vragen vast', () => {
  const { nep, bijwerken, beheren } = opzet();
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', DEMO_EDITIE_ID, { stap: 'overzicht' }, 1);
  nep.store.flush();
  assert.equal(bijwerken({ blokken: { samenwerken: true } }).fout, 'gesloten');
  assert.equal(beheren({ actie: 'toevoegen', type: 'tekst', tekst: 'Iets?' }).fout, 'gesloten');
});

test('EDI-3 FRM-7: eigen vragen toevoegen, beantwoorden en terugzien', () => {
  const { beheren, formulier, opslaan } = opzet();
  assert.equal(beheren({ actie: 'toevoegen', type: 'keuze', tekst: 'Hoe laat eten?', opties: [{ label: 'Zes uur' }, { label: 'Acht uur' }] }).ok, true);
  assert.equal(beheren({ actie: 'toevoegen', type: 'meerkeuze', tekst: 'Welke spellen?', opties: [{ label: 'Catan' }, { label: 'Uno' }, { label: 'Poker' }] }).ok, true);
  assert.equal(beheren({ actie: 'toevoegen', type: 'schaal', tekst: 'Zin in kamperen?' }).ok, true);
  const vragen = formulier().vragen;
  assert.deepEqual(vragen.map((q) => q.volgorde), [1, 2, 3]);
  const [keuze, meer, schaal] = vragen;
  const r = opslaan({ ...GELDIG, eigenVragen: { [keuze.id]: keuze.opties[1].sleutel, [meer.id]: `${meer.opties[0].sleutel},${meer.opties[2].sleutel}`, [schaal.id]: '4' } });
  assert.equal(r.ok, true);
  assert.equal(formulier().antwoorden.data.eigenVragen[schaal.id], '4');
  assert.equal(opslaan({ ...GELDIG, eigenVragen: { [schaal.id]: '9' } }, 1).fout, 'ongeldig');
  assert.equal(opslaan({ ...GELDIG, eigenVragen: { [keuze.id]: 'onbekend' } }, 1).fout, 'ongeldig');
  assert.equal(beheren({ actie: 'toevoegen', type: 'keuze', tekst: 'Te weinig opties', opties: [{ label: 'Een' }] }).fout, 'ongeldig');
});

test('EDI-3: zodra een vraag een antwoord heeft, kan alleen de tekst nog wijzigen; verwijderen kan altijd', () => {
  const { beheren, formulier, opslaan, rijen } = opzet();
  beheren({ actie: 'toevoegen', type: 'keuze', tekst: 'Hoe laat eten?', opties: [{ label: 'Zes uur' }, { label: 'Acht uur' }] });
  const vraag = formulier().vragen[0];
  // Zonder antwoord mogen type en opties nog wijzigen.
  assert.equal(beheren({ actie: 'wijzigen', id: vraag.id, type: 'janee', tekst: 'Vroeg eten?' }).ok, true);
  assert.equal(formulier().vragen[0].type, 'janee');
  assert.deepEqual(formulier().vragen[0].opties, []);
  assert.equal(beheren({ actie: 'wijzigen', id: vraag.id, type: 'keuze', tekst: 'Hoe laat eten?', opties: [{ label: 'Zes uur' }, { label: 'Acht uur' }] }).ok, true);
  const keuze = formulier().vragen[0].opties[0].sleutel;
  opslaan({ ...GELDIG, eigenVragen: { [vraag.id]: keuze } });
  const gewijzigd = beheren({ actie: 'wijzigen', id: vraag.id, type: 'tekst', tekst: 'Hoe laat eten?' });
  assert.equal(gewijzigd.fout, 'ongeldig');
  assert.equal(beheren({ actie: 'wijzigen', id: vraag.id, tekst: 'Hoe laat gaan we eten?' }).ok, true);
  assert.equal(formulier().vragen[0].tekst, 'Hoe laat gaan we eten?');
  assert.equal(formulier().vragen[0].type, 'keuze');
  // Verwijderen: de vraag verdwijnt en het antwoord telt niet meer mee bij de volgende keer opslaan.
  assert.equal(beheren({ actie: 'verwijderen', id: vraag.id }).ok, true);
  assert.equal(formulier().vragen.length, 0);
  assert.equal(opslaan({ ...GELDIG, eigenVragen: { [vraag.id]: keuze } }, 1).ok, true);
  assert.deepEqual(rijen('Antwoorden')[0].data.eigenVragen, {});
});

test('AAN-53 AAN-54: startlijsten en de vorm van een antwoord op een eigen vraag', () => {
  assert.deepEqual(Object.keys(LIJSTEN_STANDAARD), ['activiteiten', 'programma', 'etenDrinken', 'keuken', 'spullen']);
  assert.equal(maakSleutel('Kanoën & suppen', new Set()), 'kanoensuppen');
  assert.equal(maakSleutel('Kanoën', new Set(['kanoen'])), 'kanoen2');
  const opties = [{ sleutel: 'a', label: 'A' }, { sleutel: 'b', label: 'B' }];
  assert.equal(antwoordGeldig({ type: 'janee', opties: [] }, 'ja'), true);
  assert.equal(antwoordGeldig({ type: 'janee', opties: [] }, 'misschien'), false);
  assert.equal(antwoordGeldig({ type: 'keuze', opties }, 'b'), true);
  assert.equal(antwoordGeldig({ type: 'meerkeuze', opties }, 'a,b'), true);
  assert.equal(antwoordGeldig({ type: 'meerkeuze', opties }, 'a,a'), false);
  assert.equal(antwoordGeldig({ type: 'schaal', opties: [] }, '5'), true);
  assert.equal(antwoordGeldig({ type: 'schaal', opties: [] }, '0'), false);
});
