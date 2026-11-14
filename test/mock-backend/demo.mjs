// Demodata voor de nepbackend en de tests.
// - maakVolledigeDemo: de demo uit spec §11 (test/fixtures/demo.json), voor `npm run mock` en de eindtest.
// - maakDemo: de kleine testset van vier personen (test/fixtures/basis.json) waar de fasetests op bouwen.
// De fixtures bewaren de klare tokens en pincodes; hier worden ze gehasht zoals het script dat doet.
import { readFileSync } from 'node:fs';
import { hashToken, hashGeheim, maakSalt } from '../../src/server/crypto.js';
import { nodeSha256, nodeRandom } from './memorystore.mjs';
import { startItems } from '../../src/server/acties/items.js';
import { STAPPEN, stapIndex } from '../../src/shared/stappen.js';
import { STANDAARD_MAALTIJDEN } from '../../src/shared/maaltijden.js';
import { startlijsten } from '../../src/shared/lijsten.js';
import { saldi } from '../../src/shared/saldo.js';
import { afrekening } from '../../src/shared/afrekening.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/basis.json', import.meta.url), 'utf8'));
const volledig = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url), 'utf8'));
export const DEMO_EDITIE_ID = 'demo-editie-2027';
export const DEMO_2026_ID = volledig.edities['2026'].id;
export const DEMO_NAMEN = volledig.leden.map((l) => l.voornaam);

// Een ID van zestien tekens met een vast voorvoegsel, zodat de demo bij elke start dezelfde ID's heeft.
const idMaker = () => {
  let n = 0;
  return (voor) => { n += 1; return `${voor}${String(n).padStart(16 - voor.length, '0')}`; };
};

// Spec §11: groep Studievrienden, zes leden, editie 2026 (afgerond) en editie 2027 in de gekozen `stap`.
// Wat bij een stap hoort ("vanaf") geldt ook voor alle latere stappen.
export function maakVolledigeDemo({ stap = 'invullen' } = {}) {
  if (!STAPPEN.includes(stap)) throw new Error(`onbekende stap ${stap}`);
  const f = volledig;
  const id = idMaker();
  const aangemaakt = f.groep.aangemaakt;
  const lidVan = new Map(f.leden.map((l) => [l.voornaam, l.id]));
  const seed = {
    Groep: [f.groep],
    Leden: f.leden.map((l) => ({ ...l, actief: true })),
    Edities: [], Deelnemers: [], Antwoorden: [], Accommodaties: [], Stemmen: [], Items: [], Claims: [],
    Maaltijden: [], Koks: [], Programma: [], Kamers: [], Kamerindeling: [], Ritten: [], Meerijders: [], Posten: [], Betalingen: [],
  };
  const links = {};

  function deelnemers(e, jaar, ingevuld = []) {
    const ids = {};
    f.leden.forEach((l, i) => {
      const dId = `dln${jaar}${String(i + 1).padStart(9, '0')}`;
      ids[l.voornaam] = dId;
      const pinSalt = maakSalt(nodeRandom);
      seed.Deelnemers.push({
        id: dId, editieId: e.id, lidId: l.id, rol: e.organisatoren.includes(l.voornaam) ? 'organisator' : 'deelnemer',
        tokenHash: hashToken(nodeSha256, e.tokens[l.voornaam]), pinSalt, pinHash: hashGeheim(nodeSha256, f.pin, pinSalt),
        afgehaakt: false, ingevuld: ingevuld.includes(l.voornaam), ingevuldOp: ingevuld.includes(l.voornaam) ? `${jaar - 1}-12-0${(i % 6) + 1}T20:00:00Z` : '',
      });
    });
    links[jaar] = f.leden.map((l) => ({ naam: l.voornaam, fragment: `#b=${f.scriptId}&t=${e.tokens[l.voornaam]}` }));
    return ids;
  }
  const editieRij = (e, jaar, velden) => ({
    id: e.id, jaar, titel: e.titel, stapData: e.stapData, periodeVan: e.periodeVan, periodeTot: e.periodeTot,
    voorkeursmaanden: e.voorkeursmaanden, deadline: e.deadline, blokken: { etenDrinken: true, activiteiten: true, programma: true, samenwerken: false },
    lijsten: startlijsten(), vastgelegdWeekend: '', deelvorm: 'samen', geboektAccommodatieId: '', onthuld: false, boodschappenDefinitief: false,
    versie: 1, bijgewerkt: aangemaakt, ...velden,
  });
  const naarIds = (ids, verdeling) => {
    if (verdeling.wijze === 'gelijk') return { wijze: 'gelijk', deelnemers: verdeling.deelnemers.map((n) => ids[n]) };
    const veld = verdeling.wijze === 'aandeel' ? 'aandelen' : 'bedragen';
    return { wijze: verdeling.wijze, [veld]: Object.fromEntries(Object.entries(verdeling[veld]).map(([n, w]) => [ids[n], w])) };
  };
  const post = (e, ids, p) => ({
    id: id('pst'), editieId: e.id, soort: p.soort || 'uitgave', omschrijving: p.omschrijving, bedrag: p.bedrag, betalerId: ids[p.betaler],
    datum: p.datum, categorie: p.categorie, verdeling: naarIds(ids, p.verdeling), aangemaaktDoor: ids[p.betaler],
    aangepastDoorOrganisator: false, versie: 1, bijgewerkt: aangemaakt,
  });
  // De betalingen die de afrekening nu voorstelt (AAN-35), met de namen voor de volgorde.
  const voorstel = (e, ids) => {
    const naamVan = (dId) => Object.keys(ids).find((n) => ids[n] === dId) || '';
    const posten = seed.Posten.filter((p) => p.editieId === e.id);
    const betaald = seed.Betalingen.filter((b) => b.editieId === e.id);
    return afrekening(saldi(posten, betaald, { deelnemers: Object.values(ids), naamVan }), naamVan);
  };
  const betaal = (e, b, op) => seed.Betalingen.push({ id: id('bet'), editieId: e.id, ...b, betaaldOp: op });

  // Editie 2026: afgerond, weekend 2 tot en met 4 oktober, geboekte accommodatie, posten met alle drie de
  // verdeelwijzen en een ontvangst, alle betalingen betaald.
  const e26 = f.edities['2026'];
  const ids26 = deelnemers(e26, 2026, f.leden.map((l) => l.voornaam));
  seed.Edities.push(editieRij(e26, 2026, { stap: e26.stap, vastgelegdWeekend: e26.vastgelegdWeekend, deelvorm: 'samen', onthuld: false, geboektAccommodatieId: e26.accommodaties.find((a) => a.geboekt).id, boodschappenDefinitief: true }));
  const accRij = (e, a) => ({ id: a.id, editieId: e.id, naam: a.naam, plaats: a.plaats, link: a.link, prijsTotaal: a.prijsTotaal, notitie: a.notitie, versie: 1, bedden: a.bedden ?? null, eigenKamers: a.eigenKamers ?? null });
  for (const a of e26.accommodaties) seed.Accommodaties.push(accRij(e26, a));
  for (const p of e26.posten) seed.Posten.push(post(e26, ids26, p));
  for (const b of voorstel(e26, ids26)) betaal(e26, b, '2026-10-12T18:00:00Z');

  // Editie 2027 in de gekozen stap.
  const e27 = f.edities['2027'];
  const vanaf = (s) => stapIndex(stap) >= stapIndex(s);
  const ingevuld = vanaf('overzicht') ? e27.ingevuldPerStap.overzicht : e27.ingevuldPerStap.invullen;
  const ids = deelnemers(e27, 2027, ingevuld);
  const acc = e27.accommodaties;
  const vb = e27.voorbereiding;
  seed.Edities.push(editieRij(e27, 2027, {
    stap,
    vastgelegdWeekend: vanaf(e27.vastgelegdWeekend.vanaf) ? e27.vastgelegdWeekend.vrijdag : '',
    deelvorm: acc.deelvorm, onthuld: false,
    geboektAccommodatieId: vanaf(acc.geboektVanaf) ? acc.geboekt : '',
    boodschappenDefinitief: vanaf(vb.vanaf) && vb.boodschappenDefinitief,
  }));
  for (const naam of ingevuld) {
    seed.Antwoorden.push({ id: id('ant'), editieId: e27.id, deelnemerId: ids[naam], data: e27.antwoorden[naam], versie: 1, bijgewerkt: aangemaakt });
  }
  if (vanaf(acc.vanaf)) {
    for (const a of acc.lijst) {
      seed.Accommodaties.push(accRij(e27, a));
    }
    // ACC-11: één rij per keuze, rang 1 tot en met 3.
    for (const [naam, keuzes] of Object.entries(acc.top3)) keuzes.forEach((accommodatieId, i) => seed.Stemmen.push({ id: id('stm'), editieId: e27.id, deelnemerId: ids[naam], accommodatieId, rang: i + 1 }));
    // KOK-1: het vastleggen van het weekend maakt de standaardmaaltijden.
    for (const [dag, soort] of STANDAARD_MAALTIJDEN) seed.Maaltijden.push({ id: id('mlt'), editieId: e27.id, dag, soort, omschrijving: '' });
  }
  if (vanaf(vb.vanaf)) {
    const item = (velden) => { const rij = { id: id('itm'), editieId: e27.id, maaltijdId: '', toegevoegdDoor: '', afgevinkt: false, versie: 1, ...velden }; seed.Items.push(rij); return rij; };
    const claim = (itemId, namen) => namen.forEach((n, i) => seed.Claims.push({ id: id('clm'), itemId, deelnemerId: ids[n], gemaakt: `2027-04-2${i}T12:00:00Z` }));
    const start = startItems(seed.Edities[1].lijsten).map((i) => item(i));
    for (const c of vb.claims) claim(start.find((i) => i.naam === c.item).id, c.door);
    for (const b of vb.boodschappen) claim(item({ soort: 'boodschap', naam: b.naam, categorie: b.categorie, toegevoegdDoor: ids[b.toegevoegdDoor] }).id, b.door || []);
    for (const k of vb.kookbeurten) {
      const m = seed.Maaltijden.find((x) => x.editieId === e27.id && x.dag === k.dag && x.soort === k.soort);
      m.omschrijving = k.omschrijving;
      for (const n of k.koks) seed.Koks.push({ id: id('kok'), maaltijdId: m.id, deelnemerId: ids[n] });
      for (const ing of k.ingredienten) item({ soort: 'boodschap', naam: ing.naam, categorie: ing.categorie, maaltijdId: m.id, toegevoegdDoor: ids[k.koks[0]] });
    }
    for (const k of vb.kamers) {
      const kamerId = id('kmr');
      seed.Kamers.push({ id: kamerId, editieId: e27.id, naam: k.naam, slaapplaatsen: k.slaapplaatsen });
      for (const n of k.indeling) seed.Kamerindeling.push({ id: id('kin'), kamerId, deelnemerId: ids[n] });
    }
    for (const r of vb.ritten) {
      const ritId = id('rit');
      seed.Ritten.push({ id: ritId, editieId: e27.id, bestuurderId: ids[r.bestuurder], vertrekplaats: r.vertrekplaats, vrijePlaatsen: r.vrijePlaatsen });
      for (const n of r.meerijders) seed.Meerijders.push({ id: id('mrd'), ritId, deelnemerId: ids[n] });
    }
  }
  if (vanaf(e27.programma.vanaf)) {
    for (const p of e27.programma.punten) seed.Programma.push({ id: id('prg'), editieId: e27.id, ...p });
    for (const p of e27.programma.posten) seed.Posten.push(post(e27, ids, p));
  }
  const af = e27.afrekenen;
  if (vanaf(af.vanaf)) {
    for (const p of af.posten) seed.Posten.push(post(e27, ids, p));
    // EDI-9, §11: één afgehaakte deelnemer die zijn aandeel in de eerdere posten houdt. Zoals afhakenMarkeren:
    // zijn claims vervallen (AAN-11) en hij gaat uit kamer en rit (§7.11.4).
    const weg = ids[af.afgehaakt];
    seed.Deelnemers.find((d) => d.id === weg).afgehaakt = true;
    seed.Claims = seed.Claims.filter((c) => c.deelnemerId !== weg);
    seed.Kamerindeling = seed.Kamerindeling.filter((k) => k.deelnemerId !== weg);
    seed.Meerijders = seed.Meerijders.filter((m) => m.deelnemerId !== weg);
    // Open en betaalde betalingen: de eerste voorgestelde betalingen zijn al gedaan.
    for (let i = 0; i < af.betaaldAantal; i += 1) betaal(e27, voorstel(e27, ids)[0], `2027-05-2${5 + i}T09:00:00Z`);
  }
  for (const tab of Object.keys(seed)) if (!seed[tab].length) delete seed[tab];
  return {
    seed, scriptId: f.scriptId, pin: f.pin, namen: DEMO_NAMEN, links, deelnemerIds: { 2026: ids26, 2027: ids },
    tokens: { 2026: e26.tokens, 2027: e27.tokens }, ledenIds: Object.fromEntries(lidVan),
  };
}

// opties.blokkades: aantal blokkades dat de organisator (eerste deelnemer) al heeft gehad.
// opties.antwoorden: de demoantwoorden uit de fixture (Anna vult niets in); `npm run mock` zet ze aan.
// opties.stap: de stap van de demo-editie.
// opties.posten: twee demoposten uit de fixture (Eva boodschappen, Bram kanoverhuur).
// opties.afrekening: daarbovenop het huisje (Eva, gelijk over vier), één betaalde betaling (Bram aan Eva)
// en Chris afgehaakt met zijn aandeel in het huisje (spec §11, stap afrekenen).
export function maakDemo({ blokkades = 0, antwoorden = false, stap = 'invullen', posten = false, afrekening = false, items = false, weekend = '' } = {}) {
  const ingevuld = new Map(antwoorden ? fixture.antwoorden.map((a) => [a.deelnemerId, a.ingevuldOp]) : []);
  const deelnemers = fixture.deelnemers.map((d) => {
    const pinSalt = maakSalt(nodeRandom);
    return {
      id: d.id, editieId: DEMO_EDITIE_ID, lidId: d.lidId, rol: d.rol,
      tokenHash: hashToken(nodeSha256, d.token), pinSalt, pinHash: hashGeheim(nodeSha256, d.pin, pinSalt),
      afgehaakt: false, ingevuld: ingevuld.has(d.id), ingevuldOp: ingevuld.get(d.id) || '',
    };
  });
  const seed = {
    Groep: [fixture.groep],
    Leden: fixture.leden,
    // Een minimale editie, zodat sessies van deze deelnemers door de API worden herkend.
    Edities: [{
      id: DEMO_EDITIE_ID, jaar: 2027, titel: 'Weekendje weg 2027', stap, stapData: fixture.stapData, versie: 1, bijgewerkt: fixture.groep.aangemaakt,
      periodeVan: '2027-01-01', periodeTot: '2027-12-31', voorkeursmaanden: [4, 5, 9, 10], deadline: '2099-01-01T23:59:00+01:00',
      blokken: { etenDrinken: true, activiteiten: true, programma: true, samenwerken: false }, lijsten: {},
      vastgelegdWeekend: weekend, deelvorm: 'samen', geboektAccommodatieId: '', onthuld: false, // weekend: AAN-93
    }],
    Deelnemers: deelnemers,
  };
  if (antwoorden) {
    seed.Antwoorden = fixture.antwoorden.map((a) => ({ id: a.id, editieId: DEMO_EDITIE_ID, deelnemerId: a.deelnemerId, data: a.data, versie: 1, bijgewerkt: a.ingevuldOp }));
  }
  const alsPost = (p) => ({ ...p, editieId: DEMO_EDITIE_ID, aangepastDoorOrganisator: false, versie: 1, bijgewerkt: fixture.groep.aangemaakt });
  if (posten || afrekening) seed.Posten = fixture.posten.map(alsPost);
  if (afrekening) {
    seed.Posten.push(...fixture.afrekening.posten.map(alsPost));
    seed.Betalingen = fixture.afrekening.betalingen.map((b) => ({ ...b, editieId: DEMO_EDITIE_ID }));
    for (const d of deelnemers) if (d.id === fixture.afrekening.afgehaakt) d.afgehaakt = true;
  }
  // opties.items: de startlijst keuken en spullen als items (§7.7.2), zoals een nieuwe editie ze krijgt.
  if (items) seed.Items = startItems({}).map((i, n) => ({ id: `itm${String(n).padStart(13, '0')}`, editieId: DEMO_EDITIE_ID, ...i, maaltijdId: '', toegevoegdDoor: '', afgevinkt: false, versie: 1 }));
  if (blokkades) seed.Pogingen = [{ sleutel: deelnemers[0].tokenHash, fout: 0, geblokkeerdTot: '', blokkades }];
  const fragment = (i) => `#b=${fixture.scriptId}&t=${fixture.deelnemers[i].token}`;
  return {
    seed,
    scriptId: fixture.scriptId,
    pin: fixture.deelnemers[0].pin,
    namen: fixture.leden.map((l) => l.voornaam),
    tokens: fixture.deelnemers.map((d) => d.token),
    tokenHash: deelnemers.map((d) => d.tokenHash),
    fragment,
  };
}
