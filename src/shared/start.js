// Startscherm per stap, menu en aftelteller (spec §7.14, STA-3 t/m STA-6). Pure functies; de voorkant tekent ze.
import { stapIndex } from './stappen.js';
import { dagenTussen } from './datums.js';

// AAN-12, STA-6: vanaf welke stap een onderdeel in het menu staat. Wat hier niet staat, is altijd bereikbaar
// (start, formulier, voortgang en de beheerschermen van de organisator, AAN-71).
export const MENU_VANAF = {
  overzicht: 'overzicht',
  accommodaties: 'accommodatie',
  meenemen: 'accommodatie', boodschappen: 'accommodatie', kookbeurten: 'accommodatie', programma: 'accommodatie',
  kamers: 'accommodatie', carpool: 'accommodatie', posten: 'accommodatie', afrekening: 'accommodatie',
};

// NAV-1: Archief en Uitleg staan niet meer in het hoofdmenu; Uitleg zit in het profielmenu, Archief in de sectie Afgelopen weekenden.
export const NIET_IN_MENU = new Set(['archief', 'uitleg']);

// Een onbekende stap (nog niet geladen, of geen editie) geldt als Invullen: dan staan alleen de altijd bereikbare onderdelen in het menu.
export function inMenu(naam, stap) {
  if (NIET_IN_MENU.has(naam)) return false;
  const vanaf = MENU_VANAF[naam];
  if (!vanaf) return true;
  return stapIndex(stap) >= stapIndex(vanaf);
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
export function eersteActie(g) {
  const e = g.editie;
  if (!e) return { tekst: 'Nieuwe editie maken', route: '#/editie-nieuw' };
  const naarStap = (naam) => ({ tekst: `Zet de stap op ${naam}`, route: '#/stappen' });
  switch (e.stap) {
    case 'invullen':
      return g.voortgang.ingevuld < g.voortgang.aantal ? { tekst: 'Herinnering sturen', route: '#/voortgang' } : naarStap('Overzicht');
    case 'overzicht':
      return e.vastgelegdWeekend ? naarStap('Accommodatie') : { tekst: 'Weekend vastleggen', route: '#/accommodatie-beheer' };
    case 'accommodatie':
      return e.deelvorm === 'geboekt' ? naarStap('Voorbereiding') : { tekst: 'Accommodaties beheren', route: '#/accommodatie-beheer' };
    case 'voorbereiding':
      return e.boodschappenDefinitief ? naarStap('Weekend') : { tekst: 'Boodschappen definitief maken', route: '#/boodschappen' };
    case 'weekend':
      return g.programma.punten ? naarStap('Afrekenen') : { tekst: 'Programma beheren', route: '#/programma' };
    case 'afrekenen':
      return g.afrekening.open.length ? { tekst: 'Openstaande betalingen', route: '#/afrekening' } : naarStap('Afgerond');
    default:
      return { tekst: 'Nieuwe editie', route: `#/editie-nieuw?van=${encodeURIComponent(e.id)}` };
  }
}
