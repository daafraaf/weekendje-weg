import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { prijsPerPersoon, heleEuro, isHttpsLink, telPunten, tikRang, maxRang, deelvormVan, rangVan, beddenFout, beddenTekst } from '../../src/shared/accommodatie.js';
import { ALLE_SCHERMEN } from '../../src/server/rechten.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';
const ANNA = 'dln0000000000002';
const BRAM = 'dln0000000000003';
const CHRIS = 'dln0000000000004';

function opzet({ stap = 'accommodatie' } = {}) {
  const demo = maakDemo({ antwoorden: true, stap });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: ANNA, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'bram'), soort: 'deelnemer', subjectId: BRAM, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const org = (actie, data) => vraag({ actie, sessie: beheer, data });
  const scherm = (sessie) => vraag({ actie: 'scherm', sessie, data: { naam: 'accommodaties' } });
  const voegToe = (naam, prijsTotaal = 138000, extra = {}) => org('accommodatieOpslaan', { naam, plaats: 'Dwingeloo', link: 'https://voorbeeld.nl/huis', prijsTotaal, notitie: '', ...extra });
  const editie = () => { nep.store.nieuwVerzoek(); return nep.store.vind('Edities', DEMO_EDITIE_ID); };
  return { demo, nep, vraag, beheer, org, scherm, voegToe, editie };
}

test('§7.6.3: prijs per persoon is het totaal gedeeld door het aantal, afgerond op hele euro\'s', () => {
  assert.equal(prijsPerPersoon(138000, 6), 23000);
  assert.equal(prijsPerPersoon(100000, 3), 33300);
  assert.equal(prijsPerPersoon(0, 3), null);
  assert.equal(prijsPerPersoon(100000, 0), null);
  assert.equal(heleEuro(138000), '€ 1.380');
  assert.equal(heleEuro(23000), '€ 230');
});

test('ACC-2 NFR-3: alleen een link met https:// is geldig', () => {
  assert.ok(isHttpsLink('https://voorbeeld.nl/a?b=1'));
  for (const slecht of ['http://voorbeeld.nl', 'javascript:alert(1)', 'https://', 'voorbeeld.nl', 'https://a b', '']) assert.ok(!isHttpsLink(slecht), slecht);
});

test('ACC-1 AAN-63: de organisator legt een vrijdag binnen de periode vast, een andere dag of ander jaar niet', () => {
  const { org, editie, scherm, beheer, nep } = opzet();
  const s = scherm(beheer).data;
  assert.equal(s.top.length, 5);
  assert.ok(s.weekenden.length > 40);
  assert.equal(org('weekendVastleggen', { vrijdag: s.top[0].vrijdag }).ok, true);
  assert.equal(editie().vastgelegdWeekend, s.top[0].vrijdag);
  assert.equal(nep.store.lees('Edities').length, 1);
});

test('ACC-1 AAN-63: een andere dag of een datum buiten de periode wordt geweigerd', () => {
  const { org, editie, scherm, beheer } = opzet();
  const s = scherm(beheer).data;
  assert.equal(org('weekendVastleggen', { vrijdag: '2027-06-12' }).fout, 'ongeldig'); // zaterdag
  assert.equal(org('weekendVastleggen', { vrijdag: '2028-06-09' }).fout, 'ongeldig'); // buiten de periode
  assert.equal(editie().vastgelegdWeekend, '');
  assert.equal(org('weekendVastleggen', { vrijdag: s.weekenden[3] }).ok, true);
});

test('ACC-6 AAN-63: een tweede weekendVastleggen geeft gesloten en laat het weekend staan', () => {
  const { org, editie, scherm, beheer } = opzet();
  const s = scherm(beheer).data;
  assert.equal(org('weekendVastleggen', { vrijdag: s.weekenden[2] }).ok, true);
  assert.equal(org('weekendVastleggen', { vrijdag: s.weekenden[3] }).fout, 'gesloten');
  assert.equal(editie().vastgelegdWeekend, s.weekenden[2]);
});

test('ACC-7 AAN-81: losmaken wist alleen het weekend, laat een geboekte accommodatie staan en kan alleen in Weekendje prikker of Accommodatie', () => {
  const { org, editie, scherm, beheer, nep } = opzet();
  const s = scherm(beheer).data;
  assert.equal(org('weekendLosmaken', {}).fout, 'gewijzigd'); // er staat niets vast
  assert.equal(org('weekendVastleggen', { vrijdag: s.weekenden[2] }).ok, true);
  const acc = org('accommodatieOpslaan', { naam: 'Hoeve', plaats: 'Dwingeloo', link: '', prijsTotaal: 100000, notitie: '' }).data;
  assert.equal(org('accommodatieBoeken', { accommodatieId: acc.id }).ok, true);
  assert.equal(scherm(beheer).data.losmakenMogelijk, true);
  assert.equal(org('weekendLosmaken', {}).ok, true);
  assert.equal(editie().vastgelegdWeekend, '');
  assert.equal(editie().geboektAccommodatieId, acc.id); // K3
  assert.equal(org('weekendVastleggen', { vrijdag: s.weekenden[4] }).ok, true); // daarna kan vastleggen weer
  nep.store.werkBij('Edities', editie().id, { stap: 'voorbereiding' }, editie().versie);
  assert.equal(scherm(beheer).data.losmakenMogelijk, false);
  assert.equal(org('weekendLosmaken', {}).fout, 'gesloten');
  assert.equal(editie().vastgelegdWeekend, s.weekenden[4]);
});

test('ACC-2 AAN-64: toevoegen, wijzigen en verwijderen met grenzen en versiecontrole', () => {
  const { org, voegToe, scherm, beheer, nep } = opzet();
  const r = voegToe('Hoeve de Kraanvogel');
  assert.equal(r.ok, true);
  assert.equal(voegToe('X', 100, { link: 'http://onveilig.nl' }).fout, 'ongeldig');
  assert.equal(voegToe('  ').fout, 'ongeldig');
  assert.equal(voegToe('Te duur', 10000001).fout, 'ongeldig');
  assert.equal(voegToe('Gratis', 0).ok, true); // 0 = prijs onbekend
  assert.equal(org('accommodatieOpslaan', { id: r.data.id, versie: r.data.versie, naam: 'Hoeve', plaats: 'Drenthe', link: '', prijsTotaal: 150000, notitie: 'sauna' }).ok, true);
  const verouderd = org('accommodatieOpslaan', { id: r.data.id, versie: r.data.versie, naam: 'Nogmaals', plaats: '', link: '', prijsTotaal: 1, notitie: '' });
  assert.equal(verouderd.fout, 'gewijzigd');
  const lijst = scherm(beheer).data.accommodaties;
  assert.deepEqual(lijst.map((a) => a.naam), ['Hoeve', 'Gratis']);
  assert.equal(lijst[1].prijsPerPersoon, null);
  const nu = lijst[0];
  assert.equal(org('accommodatieVerwijderen', { id: nu.id, versie: nu.versie }).ok, true);
  assert.equal(scherm(beheer).data.accommodaties.length, 1);
  for (let i = 0; i < 12; i++) voegToe(`Extra ${i}`);
  assert.equal(voegToe('Een te veel').fout, 'ongeldig');
  nep.store.nieuwVerzoek();
  assert.equal(nep.store.lees('Accommodaties').length, 12);
});

test('ACC-2 TOE-7: een deelnemer beheert geen accommodaties of weekend', () => {
  const { vraag, voegToe } = opzet();
  const id = voegToe('Hoeve').data.id;
  const data = { naam: 'X', plaats: '', link: '', prijsTotaal: 1, notitie: '' };
  assert.equal(vraag({ actie: 'accommodatieOpslaan', sessie: 'anna', data }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'accommodatieVerwijderen', sessie: 'anna', data: { id, versie: 1 } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'weekendVastleggen', sessie: 'anna', data: { vrijdag: '2027-06-11' } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'deelvormZetten', sessie: 'anna', data: { deelvorm: 'verrassing' } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'accommodatieBoeken', sessie: 'anna', data: { accommodatieId: id } }).fout, 'geen_toegang');
  assert.equal(vraag({ actie: 'verrassingOnthullen', sessie: 'anna', data: {} }).fout, 'geen_toegang');
});


// Een extra deelnemerssessie, bijvoorbeeld voor Eva (organisator met haar eigen deelnemerslink).
function sessieVoor(nep, naam, deelnemerId) {
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, naam), soort: 'deelnemer', subjectId: deelnemerId, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  return naam;
}
const top3 = (vraag, sessie, ...ids) => vraag({ actie: 'top3Opgeven', sessie, data: { keuzes: ids.map((accommodatieId, i) => ({ accommodatieId, rang: i + 1 })) } });

test('ACC-11 ACC-12: punten tellen 3, 2 en 1, per persoon één keer per optie, gesorteerd op punten', () => {
  const opties = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const stemmen = [
    { deelnemerId: 'p1', accommodatieId: 'a', rang: 1 }, { deelnemerId: 'p1', accommodatieId: 'b', rang: 2 }, { deelnemerId: 'p1', accommodatieId: 'c', rang: 3 },
    { deelnemerId: 'p2', accommodatieId: 'b', rang: 1 }, { deelnemerId: 'p2', accommodatieId: 'a', rang: 2 },
    { deelnemerId: 'p3', accommodatieId: 'c', rang: 1 },
    { deelnemerId: 'p3', accommodatieId: 'c', rang: 3 }, // dubbel: alleen de beste rang telt
    { deelnemerId: 'p4', accommodatieId: 'weg', rang: 1 }, // verwijderde optie telt niet
  ];
  const t = telPunten(opties, stemmen);
  assert.deepEqual(t.opties, [{ id: 'a', punten: 5, mensen: 2 }, { id: 'b', punten: 5, mensen: 2 }, { id: 'c', punten: 4, mensen: 2 }, { id: 'd', punten: 0, mensen: 0 }]);
  assert.equal(t.gaven, 3);
  assert.equal(telPunten(opties, stemmen, (id) => id !== 'p1').gaven, 2);
});

test('ACC-11: minder dan drie opties geeft minder plekken; opnieuw tikken vervangt de keuze', () => {
  assert.deepEqual([0, 1, 2, 3, 7].map(maxRang), [0, 1, 2, 3, 3]);
  let mijn = tikRang([], 'a', 1);
  mijn = tikRang(mijn, 'b', 2);
  assert.deepEqual(mijn, [{ accommodatieId: 'a', rang: 1 }, { accommodatieId: 'b', rang: 2 }]);
  mijn = tikRang(mijn, 'b', 1); // b schuift naar 1, a valt eruit
  assert.deepEqual(mijn, [{ accommodatieId: 'b', rang: 1 }]);
  mijn = tikRang(tikRang(mijn, 'a', 3), 'a', 2); // dezelfde optie op een andere plek
  assert.deepEqual(mijn, [{ accommodatieId: 'b', rang: 1 }, { accommodatieId: 'a', rang: 2 }]);
  assert.deepEqual(tikRang(mijn, 'a', 2), [{ accommodatieId: 'b', rang: 1 }]); // dezelfde knop haalt weg
});

test('ACC-11 ACC-12 AAN-08: top 3 opgeven via de server, opnieuw opgeven vervangt, stand zonder namen, afgehaakten tellen niet', () => {
  const { org, vraag, voegToe, scherm, beheer, nep } = opzet();
  const a = voegToe('Hoeve').data;
  const b = voegToe('Boerderij').data;
  // Twee opties: plek 3 bestaat niet.
  assert.equal(vraag({ actie: 'top3Opgeven', sessie: 'anna', data: { keuzes: [{ accommodatieId: a.id, rang: 3 }] } }).fout, 'ongeldig');
  const c = voegToe('Strandhuis').data;
  assert.equal(top3(vraag, 'anna', a.id, b.id, c.id).ok, true);
  assert.equal(top3(vraag, 'bram', b.id, a.id).ok, true);
  assert.equal(org('top3Opgeven', { keuzes: [{ accommodatieId: c.id, rang: 1 }] }).ok, true); // de organisator met zijn eigen rij (AAN-39)
  let s = scherm('anna').data;
  assert.deepEqual(s.accommodaties.map((x) => [x.punten, x.mensen]), [[5, 2], [5, 2], [4, 2]]);
  assert.equal(s.gaven, 3);
  assert.deepEqual(s.mijnTop3, [{ accommodatieId: a.id, rang: 1 }, { accommodatieId: b.id, rang: 2 }, { accommodatieId: c.id, rang: 3 }]);
  // Opnieuw opgeven vervangt alles; twee keer hetzelfde verandert niets (idempotent, wachtrij).
  assert.equal(top3(vraag, 'anna', c.id).ok, true);
  assert.equal(top3(vraag, 'anna', c.id).ok, true);
  s = scherm('anna').data;
  assert.deepEqual(s.accommodaties.map((x) => [x.punten, x.mensen]), [[2, 1], [3, 1], [6, 2]]);
  nep.store.nieuwVerzoek();
  assert.deepEqual(nep.store.lees('Stemmen').filter((x) => x.deelnemerId === ANNA).map((x) => [x.accommodatieId, x.rang]), [[c.id, 1]]);
  // Dubbele plek of optie, of een optie die niet bestaat.
  assert.equal(vraag({ actie: 'top3Opgeven', sessie: 'anna', data: { keuzes: [{ accommodatieId: a.id, rang: 1 }, { accommodatieId: b.id, rang: 1 }] } }).fout, 'ongeldig');
  assert.equal(vraag({ actie: 'top3Opgeven', sessie: 'anna', data: { keuzes: [{ accommodatieId: a.id, rang: 1 }, { accommodatieId: a.id, rang: 2 }] } }).fout, 'ongeldig');
  assert.equal(top3(vraag, 'anna', 'onbekend-id-0000').fout, 'gewijzigd');
  // Een lege lijst haalt de top 3 weg.
  assert.equal(top3(vraag, 'anna').ok, true);
  assert.equal(scherm('anna').data.gaven, 2);
  // Geen namen of ID's van anderen.
  const tekst = JSON.stringify(scherm('anna').data);
  for (const id of ['dln0000000000001', BRAM, CHRIS]) assert.ok(!tekst.includes(id));
  assert.ok(!tekst.includes('Anna') && !tekst.includes('Bram'));
  // AAN-08: wie afhaakt, telt niet meer mee.
  org('afhakenMarkeren', { deelnemerId: BRAM, afgehaakt: true });
  assert.equal(scherm(beheer).data.gaven, 1);
  assert.deepEqual(scherm(beheer).data.accommodaties.map((x) => x.punten), [0, 0, 3]);
});

test('ACC-8 ACC-13 AAN-65: wisselen bewaart de voorkeuren en kan tot er geboekt is', () => {
  const { org, vraag, voegToe, scherm, beheer, editie } = opzet();
  const a = voegToe('Hoeve').data;
  const b = voegToe('Boerderij').data;
  assert.equal(editie().deelvorm, 'samen');
  top3(vraag, 'anna', a.id, b.id);
  assert.equal(org('deelvormZetten', { deelvorm: 'verrassing' }).ok, true);
  assert.equal(top3(vraag, 'anna', b.id).fout, 'gesloten'); // bij een verrassing geen top 3
  assert.equal(org('deelvormZetten', { deelvorm: 'samen' }).ok, true);
  assert.deepEqual(scherm('anna').data.mijnTop3.map((k) => k.accommodatieId), [a.id, b.id]); // bewaard
  assert.equal(org('accommodatieBoeken', { accommodatieId: a.id }).ok, true);
  assert.equal(scherm(beheer).data.geboektId, a.id);
  assert.equal(org('deelvormZetten', { deelvorm: 'verrassing' }).fout, 'gesloten');
  assert.equal(top3(vraag, 'anna', b.id).fout, 'gesloten'); // na boeken staat de keuze vast
  assert.equal(org('accommodatieBoeken', { accommodatieId: b.id }).ok, true); // een andere boeken vervangt
  assert.equal(editie().geboektAccommodatieId, b.id);
  assert.equal(org('accommodatieBoeken', { accommodatieId: 'onbekend-id-0000' }).fout, 'gewijzigd');
});

test('ACC-13 AAN-65 AAN-87: verwijderen van de geboekte geeft "nog geen accommodatie gekozen" en neemt de voorkeuren mee', () => {
  const { org, vraag, voegToe, scherm, beheer, editie, nep } = opzet();
  const a = voegToe('Hoeve').data;
  const b = voegToe('Boerderij').data;
  top3(vraag, 'anna', a.id, b.id);
  top3(vraag, 'bram', a.id);
  org('accommodatieBoeken', { accommodatieId: a.id });
  assert.equal(org('accommodatieVerwijderen', { id: a.id, versie: a.versie }).ok, true);
  assert.equal(editie().geboektAccommodatieId, '');
  assert.equal(editie().deelvorm, 'samen');
  const s = scherm(beheer).data;
  assert.equal(s.geboekt, false);
  assert.deepEqual(s.accommodaties.map((x) => [x.id, x.punten]), [[b.id, 2]]);
  nep.store.nieuwVerzoek();
  assert.ok(!nep.store.lees('Stemmen').some((x) => x.accommodatieId === a.id));
  assert.equal(scherm('anna').data.gaven, 1);
  // Daarna kan er weer gewisseld worden.
  assert.equal(org('deelvormZetten', { deelvorm: 'verrassing' }).ok, true);
  // Bij een onthulde verrassing maakt verwijderen van de geboekte de onthulling ook ongedaan (AAN-87).
  org('accommodatieBoeken', { accommodatieId: b.id });
  assert.equal(org('verrassingOnthullen', {}).ok, true);
  assert.equal(org('accommodatieVerwijderen', { id: b.id, versie: b.versie }).ok, true);
  assert.equal(editie().onthuld, false);
});

// ACC-9: per leesactie wat een deelnemer ontvangt; naam, plaats, link, bedden en ID mogen er nergens in staan.
function geheimLekt(vraag, sessie, verboden) {
  const lekken = [];
  for (const naam of ALLE_SCHERMEN) {
    const r = vraag({ actie: 'scherm', sessie, data: { naam } });
    if (!r.ok) continue;
    const tekst = JSON.stringify(r.data);
    for (const v of verboden) if (tekst.includes(v)) lekken.push(`${naam}: ${v}`);
    if (/"bedden":\s*\d|"eigenKamers":\s*\d/.test(tekst)) lekken.push(`${naam}: bedden`);
  }
  return lekken;
}

test('ACC-9: bij een verrassing ontvangt een deelnemer uit geen enkele leesactie naam, plaats, link of bedden, ook niet na het weekend', () => {
  const { org, vraag, voegToe, scherm, beheer, nep, editie } = opzet();
  const eva = sessieVoor(nep, 'eva', 'dln0000000000001');
  org('deelvormZetten', { deelvorm: 'verrassing' });
  const a = voegToe('Geheime Hoeve', 120000, { plaats: 'Geheimdorp', link: 'https://voorbeeld.nl/geheim', notitie: 'Geheime notitie', bedden: 7, eigenKamers: 3 }).data;
  voegToe('Reserve Molen', 90000, { plaats: 'Ergens', link: 'https://voorbeeld.nl/molen' });
  const verboden = ['Geheime Hoeve', 'Geheimdorp', 'voorbeeld.nl/geheim', 'Geheime notitie', 'Reserve Molen', a.id];
  assert.deepEqual(geheimLekt(vraag, 'anna', verboden), []);
  const voor = scherm('anna').data;
  assert.equal(voor.verborgen, true);
  assert.equal(voor.geboekt, false);
  assert.deepEqual(voor.accommodaties, []);
  // Geboekt: alleen dat het geregeld is.
  assert.equal(org('accommodatieBoeken', { accommodatieId: a.id }).ok, true);
  assert.deepEqual(geheimLekt(vraag, 'anna', verboden), []);
  assert.equal(scherm('anna').data.geboekt, true);
  const start = vraag({ actie: 'scherm', sessie: 'anna', data: { naam: 'start' } }).data;
  assert.deepEqual(start.geboekt, { geregeld: true, verrassing: true });
  // De organisator ziet alles, met de beheerlink en met haar eigen deelnemerslink.
  assert.equal(scherm(beheer).data.accommodaties.length, 2);
  assert.equal(scherm(eva).data.geboektId, a.id);
  assert.equal(vraag({ actie: 'scherm', sessie: eva, data: { naam: 'start' } }).data.geboekt.naam, 'Geheime Hoeve');
  assert.equal(vraag({ actie: 'scherm', sessie: eva, data: { naam: 'posten' } }).data.verrassingGeheim, true);
  assert.equal(vraag({ actie: 'scherm', sessie: 'anna', data: { naam: 'posten' } }).data.verrassingGeheim, false);
  // Na het weekend en na Afgerond blijft het geheim zolang de organisator niet onthult (geen automatische onthulling).
  for (const stap of ['weekend', 'afgerond']) {
    nep.store.nieuwVerzoek();
    nep.store.werkBij('Edities', editie().id, { stap }, editie().versie);
    nep.store.flush();
    assert.deepEqual(geheimLekt(vraag, 'anna', verboden), [], stap);
  }
  const archief = vraag({ actie: 'scherm', sessie: 'anna', data: { naam: 'archief' } }).data.edities[0];
  assert.deepEqual(archief.accommodatie, { geregeld: true, verrassing: true });
});

test('ACC-10 AAN-87: alleen de organisator onthult, ook na Afgerond; daarna ziet de groep alleen de geboekte, onthullen is definitief', () => {
  const { org, vraag, voegToe, scherm, beheer, nep, editie } = opzet();
  const a = voegToe('Geheime Hoeve', 120000, { plaats: 'Geheimdorp', bedden: 7, eigenKamers: 3 }).data;
  voegToe('Reserve Molen');
  assert.equal(org('verrassingOnthullen', {}).fout, 'gesloten'); // samen kiezen: niets te onthullen
  org('deelvormZetten', { deelvorm: 'verrassing' });
  assert.equal(org('verrassingOnthullen', {}).fout, 'ongeldig'); // nog niets geboekt
  org('accommodatieBoeken', { accommodatieId: a.id });
  assert.equal(scherm(beheer).data.onthullenMogelijk, true);
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', editie().id, { stap: 'afgerond' }, editie().versie);
  nep.store.flush();
  assert.equal(vraag({ actie: 'verrassingOnthullen', sessie: 'anna', data: {} }).fout, 'geen_toegang');
  assert.equal(org('verrassingOnthullen', {}).ok, true);
  assert.equal(org('verrassingOnthullen', {}).ok, true); // nog eens: geen fout, niets anders
  assert.equal(editie().onthuld, true);
  const na = scherm('anna').data;
  assert.equal(na.verborgen, false);
  assert.equal(na.geboektId, a.id);
  const geboekt = na.accommodaties.find((x) => x.id === a.id);
  assert.deepEqual([geboekt.naam, geboekt.plaats, geboekt.bedden, geboekt.eigenKamers], ['Geheime Hoeve', 'Geheimdorp', 7, 3]);
  assert.equal(vraag({ actie: 'scherm', sessie: 'anna', data: { naam: 'start' } }).data.geboekt.naam, 'Geheime Hoeve');
  // Er is geen actie om terug te draaien: wisselen kan niet meer.
  assert.equal(org('deelvormZetten', { deelvorm: 'samen' }).fout, 'gesloten');
});

test('ACC-14 AAN-64: bedden en eigen kamers zijn optioneel, hele getallen van 0 tot 99, eigen kamers niet meer dan bedden', () => {
  assert.equal(beddenFout(null, null), null);
  assert.equal(beddenFout(8, 3), null);
  assert.equal(beddenFout(null, 4), null);
  assert.equal(beddenFout(0, 0), null);
  assert.match(beddenFout(3, 4), /niet meer eigen kamers dan bedden/);
  assert.match(beddenFout(-1, null), /heel getal/);
  assert.match(beddenFout(100, null), /heel getal/);
  assert.match(beddenFout(2.5, null), /heel getal/);
  assert.equal(beddenTekst({ bedden: 8, eigenKamers: 3 }), '8 bedden · 3 eigen kamers');
  assert.equal(beddenTekst({ bedden: 1, eigenKamers: 1 }), '1 bed · 1 eigen kamer');
  assert.equal(beddenTekst({ bedden: null, eigenKamers: 2 }), '2 eigen kamers');
  assert.equal(beddenTekst({ bedden: null, eigenKamers: null }), '');
  const { org, voegToe, scherm, beheer } = opzet();
  const r = voegToe('Hoeve', 100000, { bedden: 8, eigenKamers: 3 });
  assert.equal(r.ok, true);
  assert.equal(voegToe('Te veel kamers', 1, { bedden: 2, eigenKamers: 3 }).fout, 'ongeldig');
  assert.equal(voegToe('Halve bedden', 1, { bedden: 2.5 }).fout, 'ongeldig');
  assert.equal(voegToe('Te groot', 1, { bedden: 100 }).fout, 'ongeldig');
  let a = scherm(beheer).data.accommodaties[0];
  assert.deepEqual([a.bedden, a.eigenKamers], [8, 3]);
  // Weglaten bij wijzigen maakt het veld leeg.
  assert.equal(org('accommodatieOpslaan', { id: r.data.id, versie: r.data.versie, naam: 'Hoeve', plaats: '', link: '', prijsTotaal: 1, notitie: '', bedden: 9 }).ok, true);
  a = scherm(beheer).data.accommodaties[0];
  assert.deepEqual([a.bedden, a.eigenKamers], [9, null]);
});

test('AAN-86: oude deelvormen en stemmen zonder rang worden bij lezen omgezet; de Sheet blijft gelijk tot de volgende schrijfactie', () => {
  assert.deepEqual(['info', 'stemmen', 'geboekt', '', undefined, 'samen', 'verrassing'].map(deelvormVan), ['samen', 'samen', 'samen', 'samen', 'samen', 'samen', 'verrassing']);
  assert.deepEqual([{ rang: null }, {}, { rang: 2 }, { rang: 7 }].map(rangVan), [1, 1, 2, 1]);
  const { org, voegToe, scherm, beheer, nep, editie } = opzet();
  const a = voegToe('Hoeve').data;
  const b = voegToe('Boerderij').data;
  for (const [oud, geboekt] of [['info', ''], ['stemmen', ''], ['geboekt', a.id]]) {
    nep.store.nieuwVerzoek();
    nep.store.werkBij('Edities', editie().id, { deelvorm: oud, geboektAccommodatieId: geboekt }, editie().versie);
    nep.store.leeg('Stemmen');
    nep.store.voegToe('Stemmen', { editieId: DEMO_EDITIE_ID, deelnemerId: ANNA, accommodatieId: b.id }); // oude stem, zonder rang
    nep.store.flush();
    const s = scherm(beheer).data;
    assert.equal(s.deelvorm, 'samen', oud);
    assert.equal(s.geboektId, geboekt, oud);
    assert.equal(s.accommodaties.find((x) => x.id === b.id).punten, 3, oud);
    assert.equal(scherm('anna').data.mijnTop3[0].rang, 1);
    assert.equal(editie().deelvorm, oud); // lezen schrijft niets
  }
  // De volgende schrijfactie op de editie zet de nieuwe vorm neer.
  org('accommodatieBoeken', { accommodatieId: b.id });
  assert.equal(editie().deelvorm, 'samen');
});

test('§7.6.3: het scherm geeft de prijs per persoon over de niet-afgehaakte deelnemers', () => {
  const { org, voegToe, scherm, beheer } = opzet();
  voegToe('Hoeve', 100000);
  assert.equal(scherm(beheer).data.accommodaties[0].prijsPerPersoon, 25000); // 4 deelnemers
  org('afhakenMarkeren', { deelnemerId: CHRIS, afgehaakt: true });
  const s = scherm('anna').data;
  assert.equal(s.aantal, 3);
  assert.equal(s.accommodaties[0].prijsPerPersoon, 33300); // 1000 / 3 = 333,33 -> 333
});

test('§7.6.2: een deelnemer ziet de accommodaties pas vanaf de stap Accommodatie, de organisator altijd', () => {
  const { scherm, beheer } = opzet({ stap: 'overzicht' });
  assert.equal(scherm('anna').fout, 'gesloten');
  assert.equal(scherm(beheer).ok, true);
});
