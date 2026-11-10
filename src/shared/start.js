// Startscherm per stap, menu en aftelteller (spec §7.14, STA-3 t/m STA-6, NAV-10). Pure functies; de voorkant tekent ze.
import { STAPNAMEN } from './stappen.js';
import { dagenTussen } from './datums.js';
import { ONDERDELEN, onderdeelAan } from './onderdelen.js';

// NAV-10, AAN-12: het hoofdmenu heeft altijd deze zeven items, in de volgorde van de stappen en met de namen van de
// stappenbalk. `stap` koppelt een item aan zijn stap; `routes` zijn de schermen waarop het item actief is.
// Afrekening opent Wie betaalt wat en heeft de eindafrekening als tweede tab (NAV-11). Een scherm dat nog niet aan
// de beurt is, toont zelf "Komt in stap ..."; boodschappen, kookbeurten, programma, kamers en carpool staan niet in
// het menu (OND-2: ze staan uit, zie onderdelen.js).
export const MENU = [
  { naam: 'start', label: 'Start' },
  { naam: 'formulier', label: STAPNAMEN.invullen, stap: 'invullen' },
  { naam: 'voortgang', label: 'Voortgang' },
  { naam: 'overzicht', label: STAPNAMEN.overzicht, stap: 'overzicht' },
  { naam: 'accommodaties', label: STAPNAMEN.accommodatie, stap: 'accommodatie' },
  { naam: 'meenemen', label: STAPNAMEN.voorbereiding, stap: 'voorbereiding' },
  { naam: 'afrekening', label: STAPNAMEN.afrekenen, stap: 'afrekenen', href: 'posten', routes: ['posten', 'afrekening'] },
];

// NAV-1: Archief en Uitleg staan niet in het hoofdmenu; Uitleg zit in het profielmenu, Archief in de sectie Afgelopen weekenden.
export const NIET_IN_MENU = new Set(['archief', 'uitleg']);

// NAV-9: de beheerschermen zitten achter één menu-item Beheren. De volgorde is die van het overzicht.
export const BEHEER_SCHERMEN = ['leden', 'editie-nieuw', 'uitnodigen', 'lijsten-beheer', 'vragen-beheer', 'detail', 'stappen', 'accommodatie-beheer'];

// NAV-10: de items voor een sessie. `beschikbaar` zijn de schermen die de router voor deze sessie kent; een
// beheersessie heeft geen Invullen (geen eigen antwoorden) en krijgt Beheren apart, na een scheidingslijn.
export function menuItems(beschikbaar) {
  const heeft = (naam) => beschikbaar.includes(naam);
  const items = MENU.filter((m) => heeft(m.naam)).map((m) => ({ ...m, href: m.href || m.naam, routes: m.routes || [m.naam] }));
  const beheer = heeft('beheren') ? { naam: 'beheren', label: 'Beheren', href: 'beheren', routes: ['beheren', ...BEHEER_SCHERMEN] } : null;
  return { items, beheer };
}

// Een scherm staat in het hoofdmenu als het een van de zeven items is of Beheren (de stap doet er niet meer toe).
export function inMenu(naam) {
  return naam === 'beheren' || MENU.some((m) => m.naam === naam);
}

// STA-5: dagen tot de vrijdag; op de dag zelf "Vandaag!". Daarna (het weekend zelf of later) geen teller.
export function aftelTekst(vandaag, vrijdag) {
  if (!vrijdag) return null;
  const n = dagenTussen(vandaag, vrijdag);
  if (n < 0) return null;
  if (n === 0) return 'Vandaag!';
  return n === 1 ? 'Nog 1 dag tot het weekend' : `Nog ${n} dagen tot het weekend`;
}

// STA-4: de eerstvolgende actie van de organisator als knop { tekst, route }. `g` is het antwoord van het scherm `start`.
export function eersteActie(g, vlaggen = ONDERDELEN) {
  const e = g.editie;
  if (!e) return { tekst: 'Nieuwe editie maken', route: '#/editie-nieuw' };
  const naarStap = (naam) => ({ tekst: `Zet de stap op ${naam}`, route: '#/stappen' });
  switch (e.stap) {
    case 'invullen':
      return g.voortgang.ingevuld < g.voortgang.aantal ? { tekst: 'Herinnering sturen', route: '#/voortgang' } : naarStap(STAPNAMEN.overzicht);
    case 'overzicht':
      return e.vastgelegdWeekend ? naarStap(STAPNAMEN.accommodatie) : { tekst: 'Weekend vastleggen', route: '#/accommodatie-beheer' };
    case 'accommodatie':
      return e.deelvorm === 'geboekt' ? naarStap(STAPNAMEN.voorbereiding) : { tekst: 'Accommodaties beheren', route: '#/accommodatie-beheer' };
    case 'voorbereiding':
      return e.boodschappenDefinitief || !onderdeelAan('boodschappen', vlaggen) ? naarStap(STAPNAMEN.weekend) : { tekst: 'Boodschappen definitief maken', route: '#/boodschappen' };
    case 'weekend':
      return g.programma.punten || !onderdeelAan('programma', vlaggen) ? naarStap(STAPNAMEN.afrekenen) : { tekst: 'Programma beheren', route: '#/programma' };
    case 'afrekenen':
      return g.afrekening.open.length ? { tekst: 'Openstaande betalingen', route: '#/afrekening' } : naarStap(STAPNAMEN.afgerond);
    default:
      return { tekst: 'Nieuwe editie', route: `#/editie-nieuw?van=${encodeURIComponent(e.id)}` };
  }
}
