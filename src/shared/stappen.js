// Stappen van een editie in vaste volgorde (spec §7.2.1).
import { dagenTussen } from './datums.js';

export const STAPPEN = ['invullen', 'overzicht', 'accommodatie', 'voorbereiding', 'weekend', 'afrekenen', 'afgerond'];

export function stapIndex(stap) {
  return STAPPEN.indexOf(stap);
}

// §7.2.2, AAN-05: één stap vooruit of één stap terug, ook van Afgerond naar Afrekening (BV-25); terug naar Invullen
// kan niet meer vanaf Accommodatie.
// (Vanaf Accommodatie is één stap terug Overzicht, dus Invullen ligt dan altijd twee stappen terug.)
export function stapMogelijk(van, naar) {
  const a = stapIndex(van);
  const b = stapIndex(naar);
  if (a < 0 || b < 0) return false;
  if (naar === 'invullen' && a >= stapIndex('accommodatie')) return false;
  return b === a + 1 || b === a - 1;
}

// AAN-81, §7.6.8 (BV-01): in deze stappen kan de organisator het weekend losmaken (Ander weekend kiezen).
export const LOSMAKEN_STAPPEN = ['overzicht', 'accommodatie', 'voorbereiding'];

// AAN-88 (§7.2.7, BV-25, BV-26): de redenen voor een korte bevestiging bij een stap vooruit. Alleen de voorkant vraagt
// dit; de server controleert het niet. Een stap terug geeft niets. Zonder vastgelegd weekend geen datumwaarschuwing.
export const WAARSCHUWING_DAGEN = 7;
export function stapWaarschuwingen({ van, naar, nogNiet = [], vastgelegdWeekend = '', vandaag = '', aantalOpen = 0 }) {
  if (stapIndex(van) < 0 || stapIndex(naar) !== stapIndex(van) + 1) return [];
  const uit = [];
  if (naar === 'overzicht' && nogNiet.length) {
    const wie = nogNiet.length === 1 ? `${nogNiet[0]} heeft` : nogNiet.length === 2 ? `${nogNiet[0]} en ${nogNiet[1]} hebben` : `${nogNiet.length} mensen hebben`;
    uit.push(`${wie} nog niet ingevuld.`);
  }
  if (['weekend', 'afrekenen', 'afgerond'].includes(naar) && vastgelegdWeekend && vandaag) {
    const dagen = dagenTussen(vandaag, vastgelegdWeekend);
    if (dagen > WAARSCHUWING_DAGEN) uit.push(`Het weekend is pas over ${dagen} dagen.`);
  }
  if (naar === 'afgerond' && aantalOpen > 0) {
    uit.push(`${aantalOpen === 1 ? 'Er staat nog 1 betaling' : `Er staan nog ${aantalOpen} betalingen`} open. Die kun je na Afgerond nog afvinken.`);
  }
  return uit;
}
export const stapVraag = (naar) => (naar === 'afgerond' ? 'Toch afronden?' : 'Toch door?');

export const volgendeStap = (stap) => STAPPEN[stapIndex(stap) + 1] || null;
export const vorigeStap = (stap) => (stapMogelijk(stap, STAPPEN[stapIndex(stap) - 1]) ? STAPPEN[stapIndex(stap) - 1] : null);

// STA-8: de namen van de stappen, één tabel voor stappenbalk, menu, stappenbeheer en WhatsApp-teksten. De waarden
// in de Sheet blijven `invullen` … `afgerond`; alleen de labels zijn nieuw (Overzicht heet Weekendje prikker).
export const STAPNAMEN = {
  invullen: 'Invullen',
  overzicht: 'Weekendje prikker',
  accommodatie: 'Accommodatie',
  voorbereiding: 'Meenemen',
  weekend: 'Weekend',
  afrekenen: 'Afrekening',
  afgerond: 'Afgerond',
};

// Een scherm dat nog niet aan de beurt is, zegt dat rustig (NAV-10).
export const komtInStap = (stap) => `Komt in stap ${STAPNAMEN[stap]}`;
