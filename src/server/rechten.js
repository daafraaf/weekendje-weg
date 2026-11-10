// De enige plek die beslist wie wat mag (spec §6). Elke actie loopt hier doorheen
// voordat de Store wordt aangeraakt.
//
// Rollen: 'gast' (zonder sessie), 'deelnemer' (deelnemerssessie), 'organisator' (beheersessie),
// 'eigenaar' (Sheet-menu).
// Context (alles optioneel; de API vult wat de actie nodig heeft):
//   editieId              de editie van het verzoek
//   organisatorVanEditie  het lid van de beheersessie is organisator van deze editie
//   stap, naDeadline, deelvorm, definitief (boodschappen)   uit de editie
//   nieuw                 de schrijfactie maakt een nieuwe rij
//   eigen                 de rij hoort bij de deelnemer van de sessie
//   betrokken             de deelnemer is `van` of `naar` van de betaling
//   setupcodeGeldig       bij groepOpzetten
//   scherm                naam van de leesactie `scherm`
import { stapIndex } from '../shared/stappen.js';

const JA = null;
const NEE = 'geen_toegang';
const DICHT = 'gesloten';
const als = (voorwaarde, anders = DICHT) => (voorwaarde ? JA : anders);

// Inloggen en uitloggen controleren zelf link, pincode of wachtwoord (spec §7.1).
const TOEGANG = new Set(['inloggenDeelnemer', 'inloggenBeheer', 'wachtwoordInstellen', 'uitloggen']);

// Acties zonder editie; ook een beheersessie die (nog) geen organisator is, mag ze doen.
const GROEPSBREED = new Set(['status', 'editieAanmaken', 'ledenBeheren', 'beheerlinkMaken', 'uitloggen']);

const alleenOrganisator = { organisator: () => JA };
const iedereen = { deelnemer: () => JA, organisator: () => JA };

// AAN-38: acties en schermen die §6 niet letterlijk noemt, volgen de rij die erbij hoort:
// - eigen antwoorden en de andere schermen lezen mag elk lid van de editie, ook na de deadline;
// - een bestaand item of een bestaande post wijzigen volgt de regel voor verwijderen;
// - deelnemersBeheren en vragenBeheren vallen onder "Editie, blokken, vragen, deadline, stappen";
// - betalingTerugdraaien volgt "Betaling markeren".
const SCHERMEN = {
  start: iedereen,
  formulier: iedereen,
  voortgang: iedereen,
  overzicht: {
    deelnemer: (c) => als(stapIndex(c.stap) >= stapIndex('overzicht')),
    organisator: () => JA,
  },
  // §7.6.2: deelnemers zien de accommodaties vanaf de stap Accommodatie.
  accommodaties: {
    deelnemer: (c) => als(stapIndex(c.stap) >= stapIndex('accommodatie')),
    organisator: () => JA,
  },
  meenemen: iedereen,
  kookbeurten: iedereen,
  programma: iedereen,
  kamers: iedereen,
  carpool: iedereen,
  posten: iedereen,
  afrekening: iedereen,
  archief: iedereen,
  beheer: alleenOrganisator,
};

const eigenOfOrganisator = {
  deelnemer: (c) => als(c.eigen, NEE),
  organisator: () => JA,
};

// AAN-39: een organisator vult eigen antwoorden in en stemt voor zijn eigen deelnemersrij in die
// editie. DDL-1: de deadline is informatief en blokkeert niets. AAN-04: naar Overzicht gaan sluit het invullen.
const eigenAntwoorden = (c) => als(c.stap === 'invullen');

export const REGELS = {
  status: { gast: () => JA, deelnemer: () => JA, organisator: () => JA },
  groepOpzetten: { gast: (c) => als(c.setupcodeGeldig, NEE) },
  setupcodeTonen: { eigenaar: () => JA },
  ledenBeheren: alleenOrganisator,
  // AAN-03: elke beheersessie mag een editie aanmaken en een beheerlink voor een lid maken;
  // de eigenaar maakt beheerlinks via het Sheet-menu.
  editieAanmaken: alleenOrganisator,
  beheerlinkMaken: { organisator: () => JA, eigenaar: () => JA },
  wachtwoordResetten: { eigenaar: () => JA },
  logLegen: { eigenaar: () => JA },
  editieBijwerken: alleenOrganisator,
  deelnemersBeheren: alleenOrganisator,
  vragenBeheren: alleenOrganisator,
  stapZetten: alleenOrganisator,
  linksMaken: alleenOrganisator,
  linkVernieuwen: alleenOrganisator,
  pincodeVernieuwen: alleenOrganisator,
  afhakenMarkeren: alleenOrganisator,
  antwoordenOpslaan: { deelnemer: eigenAntwoorden, organisator: eigenAntwoorden },
  antwoordZetten: { deelnemer: eigenAntwoorden, organisator: eigenAntwoorden },
  // SYNC-2: de bundel zelf mag elk lid van de editie; elke actie erin krijgt haar eigen regel.
  bundel: iedereen,
  overzichtDetail: alleenOrganisator,
  weekendVastleggen: alleenOrganisator,
  // AAN-81: losmaken kan alleen in de stappen Weekendje prikker en Accommodatie.
  weekendLosmaken: { organisator: (c) => als(c.stap === 'overzicht' || c.stap === 'accommodatie') },
  accommodatieOpslaan: alleenOrganisator,
  accommodatieVerwijderen: alleenOrganisator,
  deelvormZetten: alleenOrganisator,
  stemmen: { deelnemer: (c) => als(c.deelvorm === 'stemmen'), organisator: () => JA },
  itemOpslaan: {
    deelnemer: (c) => (c.nieuw ? als(!c.definitief) : c.eigen ? als(!c.definitief) : NEE),
    organisator: () => JA,
  },
  itemVerwijderen: { deelnemer: (c) => (c.eigen ? als(!c.definitief) : NEE), organisator: () => JA },
  claimen: iedereen,
  claimIntrekken: eigenOfOrganisator,
  afvinken: iedereen,
  boodschappenDefinitief: alleenOrganisator,
  kokWorden: iedereen,
  kokStoppen: iedereen,
  maaltijdOpslaan: alleenOrganisator,
  programmaOpslaan: alleenOrganisator,
  programmaVerwijderen: alleenOrganisator,
  kamersOpslaan: alleenOrganisator,
  kamerIndelen: alleenOrganisator,
  ritOpslaan: eigenOfOrganisator,
  meerijden: eigenOfOrganisator,
  meerijdenStoppen: eigenOfOrganisator,
  postOpslaan: { deelnemer: (c) => (c.nieuw ? JA : als(c.eigen, NEE)), organisator: () => JA },
  postVerwijderen: eigenOfOrganisator,
  betalingMarkeren: { deelnemer: (c) => als(c.betrokken, NEE), organisator: () => JA },
  betalingTerugdraaien: { deelnemer: (c) => als(c.betrokken, NEE), organisator: () => JA },
};

const LEZEN = new Set(['status', 'scherm', 'overzichtDetail']);

// Geeft null als het mag, anders de foutcode (`geen_toegang` of `gesloten`).
export function reden(rol, actie, context = {}) {
  const c = context;
  if (TOEGANG.has(actie)) return JA;
  const regels = actie === 'scherm' ? SCHERMEN[c.scherm] : REGELS[actie];
  const regel = regels && regels[rol];
  if (!regel) return NEE;
  if (rol === 'organisator' && c.editieId && !c.organisatorVanEditie && !GROEPSBREED.has(actie)) return NEE;
  const r = regel(c);
  if (r) return r;
  // AAN-29: na de stap Afgerond is een editie alleen-lezen.
  if (c.stap === 'afgerond' && !LEZEN.has(actie)) return DICHT;
  return JA;
}

// De rolcontrole zonder gegevens van het verzoek: heeft deze rol voor deze actie (of dit scherm) een regel, en is
// een beheersessie organisator van de editie. De API doet dit vóór het valideren, zodat wie de actie nooit mag
// `geen_toegang` krijgt en geen meldingen over velden (beveiligingsronde fase 19).
export function rolReden(rol, actie, context = {}) {
  const c = context;
  if (TOEGANG.has(actie)) return JA;
  const regels = actie === 'scherm' ? SCHERMEN[c.scherm] : REGELS[actie];
  if (!regels || !regels[rol]) return NEE;
  if (rol === 'organisator' && c.editieId && !c.organisatorVanEditie && !GROEPSBREED.has(actie)) return NEE;
  return JA;
}

export function mag(rol, actie, context) {
  return reden(rol, actie, context) === null;
}

export const ALLE_SCHERMEN = Object.keys(SCHERMEN);
export const IS_TOEGANG = (actie) => TOEGANG.has(actie);
