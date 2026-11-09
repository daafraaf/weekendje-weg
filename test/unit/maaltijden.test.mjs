import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { kaartLink } from '../../src/web/navigatie.js';
import { STANDAARD_MAALTIJDEN, maaltijdNaam, puntenVanDag, uitgelicht, dagVanDatum, dagDatum } from '../../src/shared/maaltijden.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';
const CHRIS = 'dln0000000000004';
const EVA = 'dln0000000000001';

function opzet() {
  const demo = maakDemo({ antwoorden: true, stap: 'voorbereiding', items: true });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  for (const [naam, id] of [['anna', ANNA], ['bram', BRAM], ['chris', CHRIS]]) {
    nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, naam), soort: 'deelnemer', subjectId: id, verloopt: '2099-01-01T00:00:00.000Z' });
  }
  nep.store.flush();
  const als = (sessie) => (actie, data) => vraag({ actie, sessie, data });
  const scherm = (sessie, naam = 'kookbeurten') => vraag({ actie: 'scherm', sessie, data: { naam } }).data;
  return { demo, nep, vraag, org: als(beheer), anna: als('anna'), bram: als('bram'), chris: als('chris'), beheer, scherm };
}

// Het weekend vastleggen levert de zes standaardmaaltijden; het weekend 11 juni 2027 is een vrijdag.
function metWeekend() {
  const o = opzet();
  assert.equal(o.org('weekendVastleggen', { vrijdag: '2027-06-11' }).ok, true);
  const maaltijd = (dag, soort) => o.scherm('anna').maaltijden.find((m) => m.dag === dag && m.soort === soort);
  return { ...o, maaltijd };
}

test('KOK-1 AAN-18: bij het vastleggen van het weekend staan zes maaltijden klaar, de organisator past ze aan', () => {
  const { org, anna, scherm, nep } = metWeekend();
  const s = scherm('anna');
  assert.equal(s.maaltijden.length, 6);
  assert.deepEqual(s.maaltijden.map((m) => m.naam), ['Vrijdag diner', 'Zaterdag ontbijt', 'Zaterdag lunch', 'Zaterdag diner', 'Zondag ontbijt', 'Zondag lunch']);
  assert.deepEqual(STANDAARD_MAALTIJDEN.length, 6);
  assert.equal(s.maaltijden[1].datum, '2027-06-12');
  // Opnieuw vastleggen maakt geen tweede set.
  org('weekendVastleggen', { vrijdag: '2027-06-18' });
  assert.equal(scherm('anna').maaltijden.length, 6);
  assert.equal(scherm('anna').maaltijden[0].datum, '2027-06-18');
  // Aanpassen en toevoegen: alleen de organisator.
  const diner = s.maaltijden[3];
  assert.equal(anna('maaltijdOpslaan', { id: diner.id, dag: 'za', soort: 'diner', omschrijving: 'Risotto' }).fout, 'geen_toegang');
  assert.equal(org('maaltijdOpslaan', { id: diner.id, dag: 'za', soort: 'diner', omschrijving: '  Paddenstoelen   risotto ' }).ok, true);
  assert.equal(org('maaltijdOpslaan', { dag: 'zo', soort: 'diner', omschrijving: 'Restjes' }).ok, true);
  const na = scherm('anna').maaltijden;
  assert.equal(na.length, 7);
  assert.equal(na.find((m) => m.id === diner.id).omschrijving, 'Paddenstoelen risotto');
  assert.equal(na[6].naam, 'Zondag diner'); // gesorteerd op dag en soort
  assert.equal(org('maaltijdOpslaan', { id: '0000000000000000', dag: 'za', soort: 'diner', omschrijving: '' }).fout, 'gewijzigd');
  assert.equal(org('maaltijdOpslaan', { dag: 'ma', soort: 'diner', omschrijving: '' }).fout, 'ongeldig');
  nep.store.nieuwVerzoek();
});

test('KOK-2: kok worden en stoppen, meerdere koks per maaltijd, twee keer aanmelden geeft één rij', () => {
  const { anna, bram, chris, org, maaltijd, scherm, nep } = metWeekend();
  const m = maaltijd('za', 'diner').id;
  assert.equal(anna('kokWorden', { maaltijdId: m }).ok, true);
  assert.equal(anna('kokWorden', { maaltijdId: m }).ok, true);
  assert.equal(bram('kokWorden', { maaltijdId: m }).ok, true);
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Koks').length, 2);
  const s = scherm('anna').maaltijden.find((x) => x.id === m);
  assert.deepEqual(s.koks.map((k) => k.naam), ['Anna', 'Bram']);
  assert.deepEqual(s.koks.map((k) => k.ik), [true, false]);
  assert.equal(s.kok, true);
  assert.equal(scherm('chris').maaltijden.find((x) => x.id === m).kok, false);
  assert.equal(anna('kokStoppen', { maaltijdId: m }).ok, true);
  assert.equal(anna('kokStoppen', { maaltijdId: m }).ok, true); // al gestopt is geen fout
  assert.deepEqual(scherm('bram').maaltijden.find((x) => x.id === m).koks.map((k) => k.naam), ['Bram']);
  assert.equal(anna('kokWorden', { maaltijdId: '0000000000000000' }).fout, 'gewijzigd');
  // De organisator is ook deelnemer en kan koken.
  assert.equal(org('kokWorden', { maaltijdId: m }).ok, true);
  // AAN-68: een afgehaakte deelnemer kookt niet meer en staat niet meer bij de koks.
  assert.equal(org('afhakenMarkeren', { deelnemerId: BRAM, afgehaakt: true }).ok, true);
  assert.deepEqual(scherm('anna').maaltijden.find((x) => x.id === m).koks.map((k) => k.naam), ['Eva']);
  assert.equal(bram('kokWorden', { maaltijdId: maaltijd('za', 'lunch').id }).fout, 'gesloten');
  assert.equal(chris('kokWorden', { maaltijdId: m }).ok, true);
});

test('KOK-3: een ingrediënt van een kok staat met de maaltijdnaam op de boodschappenlijst', () => {
  const { anna, bram, org, maaltijd, scherm } = metWeekend();
  const m = maaltijd('za', 'diner').id;
  // Alleen een kok van die maaltijd voegt een ingrediënt toe.
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: 'Risottorijst', maaltijdId: m }).fout, 'geen_toegang');
  anna('kokWorden', { maaltijdId: m });
  assert.equal(bram('itemOpslaan', { soort: 'boodschap', naam: 'Risottorijst', maaltijdId: m }).fout, 'geen_toegang');
  assert.equal(anna('itemOpslaan', { soort: 'spullen', naam: 'Pan', maaltijdId: m }).fout, 'ongeldig');
  const r = anna('itemOpslaan', { soort: 'boodschap', naam: 'Risottorijst', maaltijdId: m });
  assert.equal(r.ok, true);
  assert.ok(r.data.categorie); // het voorstel volgt de woordenlijst (MEE-4)
  const item = scherm('bram', 'meenemen').items.find((i) => i.naam === 'Risottorijst');
  assert.equal(item.soort, 'boodschap');
  assert.equal(item.maaltijd, 'Zaterdag diner');
  assert.equal(scherm('anna').maaltijden.find((x) => x.id === m).ingredienten.length, 1);
  // Een ingrediënt blijft een boodschap, ook bij wijzigen.
  assert.equal(anna('itemOpslaan', { id: r.data.id, versie: r.data.versie, soort: 'keuken', naam: 'Rijst' }).fout, 'ongeldig');
  assert.equal(maaltijdNaam({ dag: 'zo', soort: 'lunch' }), 'Zondag lunch');
  // Na definitief kan een kok geen ingrediënt meer toevoegen (§7.8.5).
  assert.equal(org('boodschappenDefinitief', { definitief: true }).ok, true);
  assert.equal(anna('itemOpslaan', { soort: 'boodschap', naam: 'Parmezaan', maaltijdId: m }).fout, 'gesloten');
});

test('KOK-4 AAN-34: een kok ziet aantallen en teksten zonder deelnemer-ID\'s, een andere deelnemer ziet ze niet', () => {
  const { anna, bram, org, maaltijd, scherm, nep } = metWeekend();
  const m = maaltijd('za', 'diner').id;
  anna('kokWorden', { maaltijdId: m });
  const s = scherm('anna');
  const kok = s.maaltijden.find((x) => x.id === m);
  // De demoantwoorden: Eva en Chris vegetarisch, Bram IPA met de vrije tekst "Notenallergie".
  assert.ok(kok.wensen.aantallen.length > 0);
  assert.ok(kok.wensen.aantallen.every((a) => typeof a.label === 'string' && a.aantal > 0));
  assert.equal(kok.wensen.aantallen.find((a) => a.label === 'Vegetarisch').aantal, 2);
  assert.deepEqual(kok.wensen.teksten, ['Notenallergie']);
  // Het antwoord bevat geen enkel deelnemer-ID en geen vrije tekst met naam.
  nep.store.nieuwVerzoek();
  const ids = nep.store.lees('Deelnemers').map((d) => d.id);
  const tekst = JSON.stringify(s);
  for (const id of ids) assert.equal(tekst.includes(id), false, `deelnemer-ID ${id} staat in het antwoord`);
  assert.equal('ik' in s, false);
  // Een deelnemer die geen kok is krijgt de wensen niet, ook de organisator niet.
  assert.ok(scherm('bram').maaltijden.every((x) => !('wensen' in x)));
  assert.ok(org('scherm', { naam: 'kookbeurten' }).data.maaltijden.every((x) => !('wensen' in x)));
  assert.ok(kok && s.maaltijden.filter((x) => x.id !== m).every((x) => !('wensen' in x)));
  // Een afgehaakte deelnemer (Bram: IPA en de notenallergie) telt niet meer mee.
  assert.equal(org('afhakenMarkeren', { deelnemerId: BRAM, afgehaakt: true }).ok, true);
  const daarna = scherm('anna').maaltijden.find((x) => x.id === m).wensen;
  assert.deepEqual(daarna.teksten, []);
  assert.equal(daarna.aantallen.some((a) => a.label === 'IPA'), false);
  assert.equal(bram('scherm', { naam: 'kookbeurten' }).ok, true);
});

test('PRG-1 AAN-25: alleen de organisator voegt programmapunten toe, wijzigt en verwijdert ze', () => {
  const { org, anna, scherm } = opzet();
  const punt = { dag: 'za', begin: '11:00', eind: '13:00', titel: 'Kanoën op de Reest', adres: 'Reestdal 1, Meppel', link: 'https://voorbeeld.nl/kano', notitie: 'Joris regelt de kano\'s' };
  assert.equal(anna('programmaOpslaan', punt).fout, 'geen_toegang');
  const r = org('programmaOpslaan', punt);
  assert.equal(r.ok, true);
  assert.equal(anna('programmaVerwijderen', { id: r.data.id }).fout, 'geen_toegang');
  assert.equal(org('programmaOpslaan', { ...punt, id: r.data.id, titel: 'Kanoën' }).ok, true);
  assert.equal(scherm('anna', 'programma').punten[0].titel, 'Kanoën');
  assert.equal(org('programmaOpslaan', { ...punt, link: 'http://onveilig.nl' }).fout, 'ongeldig'); // NFR-3
  assert.equal(org('programmaOpslaan', { ...punt, link: 'javascript:alert(1)' }).fout, 'ongeldig');
  assert.equal(org('programmaOpslaan', { ...punt, begin: '25:00' }).fout, 'ongeldig');
  assert.equal(org('programmaOpslaan', { ...punt, eind: '10:00' }).fout, 'ongeldig');
  assert.equal(org('programmaOpslaan', { ...punt, titel: '   ' }).fout, 'ongeldig');
  assert.equal(org('programmaOpslaan', { ...punt, dag: 'ma' }).fout, 'ongeldig');
  assert.equal(org('programmaVerwijderen', { id: r.data.id }).ok, true);
  assert.equal(scherm('anna', 'programma').punten.length, 0);
  assert.equal(org('programmaVerwijderen', { id: r.data.id }).fout, 'gewijzigd');
});

test('PRG-2: het programma staat per dag op begintijd en het adres wordt een kaartlink', () => {
  const { org, scherm } = opzet();
  for (const [dag, begin, titel] of [['za', '18:30', 'Risotto'], ['za', '09:30', 'Ontbijt'], ['vr', '20:00', 'Aankomst'], ['za', '11:00', 'Kanoën']]) {
    org('programmaOpslaan', { dag, begin, eind: '', titel, adres: '', link: '', notitie: '' });
  }
  const punten = scherm('bram', 'programma').punten;
  assert.deepEqual(punten.map((p) => p.titel), ['Aankomst', 'Ontbijt', 'Kanoën', 'Risotto']);
  assert.deepEqual(puntenVanDag(punten, 'za').map((p) => p.begin), ['09:30', '11:00', '18:30']);
  assert.equal(kaartLink('Hoeve 1, Meppel'), 'https://maps.google.com/?q=Hoeve%201%2C%20Meppel');
});

test('PRG-3 AAN-69: het punt dat nu loopt of het eerstvolgende is uitgelicht', () => {
  const dag = [
    { id: 'a', begin: '09:30', eind: '', titel: 'Ontbijt' }, { id: 'b', begin: '11:00', eind: '13:00', titel: 'Kanoën' },
    { id: 'c', begin: '14:30', eind: '', titel: 'Wandeling' }, { id: 'd', begin: '18:30', eind: '', titel: 'Risotto' },
  ];
  assert.deepEqual(uitgelicht(dag, '08:00'), { punt: dag[0], nu: false });
  assert.deepEqual(uitgelicht(dag, '10:15'), { punt: dag[0], nu: true }); // zonder eind loopt het tot het volgende begint
  assert.deepEqual(uitgelicht(dag, '11:00'), { punt: dag[1], nu: true });
  assert.deepEqual(uitgelicht(dag, '13:30'), { punt: dag[2], nu: false }); // kanoën is klaar, wandeling komt eraan
  assert.deepEqual(uitgelicht(dag, '20:00'), { punt: dag[3], nu: true });
  assert.equal(uitgelicht([], '10:00'), null);
  assert.equal(dagVanDatum('2027-06-11', '2027-06-12'), 'za');
  assert.equal(dagVanDatum('2027-06-11', '2027-06-14'), null);
  assert.equal(dagVanDatum('', '2027-06-12'), null);
  assert.equal(dagDatum('2027-06-11', 'zo'), '2027-06-13');
});
