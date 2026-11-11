// Stappen van een editie in vaste volgorde (spec §7.2.1).
import { dagenTussen } from './datums.js';
import { ONDERDELEN, onderdeelAan } from './onderdelen.js';

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

// ACC-7, OND-2 (BV-27): wat losmaken raakt, voor de bevestiging bij Ander weekend kiezen. Maaltijden (kookbeurten) en
// programma staan er alleen in als dat onderdeel aan staat.
export function losmakenGevolgen({ aftellen = false, geboektNaam = '', weekendTekst = '', onderdelen = ONDERDELEN } = {}) {
  const uit = [];
  if (aftellen) uit.push('De aftelteller op het startscherm verdwijnt.');
  const datums = [onderdeelAan('kookbeurten', onderdelen) ? 'de maaltijden' : '', onderdeelAan('programma', onderdelen) ? 'het programma' : ''].filter(Boolean);
  if (datums.length) uit.push(`De datums bij ${datums.join(' en ')} verdwijnen tot je een nieuw weekend kiest.`);
  if (geboektNaam) uit.push(`${geboektNaam} blijft op geboekt staan, maar die boeking hoort bij ${weekendTekst}. Controleer of de boeking past bij het nieuwe weekend.`);
  return uit;
}

// AAN-88 (§7.2.7, BV-25, BV-26): de redenen voor een korte bevestiging bij een stap vooruit. Alleen de voorkant vraagt
// dit; de server controleert het niet. Een stap terug geeft niets. Zonder vastgelegd weekend geen datumwaarschuwing.
export const WAARSCHUWING_DAGEN = 7;
// §7.12.4 (BV-28): bij Samen kiezen zonder opties (aantalOpties 0; null is onbekend) ook een vraag.
export function stapWaarschuwingen({ van, naar, nogNiet = [], vastgelegdWeekend = '', vandaag = '', aantalOpen = 0, aantalOpties = null, deelvorm = 'samen' }) {
  if (stapIndex(van) < 0 || stapIndex(naar) !== stapIndex(van) + 1) return [];
  const uit = [];
  if (naar === 'overzicht' && nogNiet.length) {
    const wie = nogNiet.length === 1 ? `${nogNiet[0]} heeft` : nogNiet.length === 2 ? `${nogNiet[0]} en ${nogNiet[1]} hebben` : `${nogNiet.length} mensen hebben`;
    uit.push(`${wie} nog niet ingevuld.`);
  }
  if (naar === 'accommodatie' && deelvorm !== 'verrassing' && aantalOpties === 0) {
    uit.push('Er staan nog geen accommodaties klaar. Het bericht voor de groep zegt dan dat de opties binnenkort komen.');
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
