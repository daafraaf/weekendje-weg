// Stappen van een editie in vaste volgorde (spec §7.2.1).
export const STAPPEN = ['invullen', 'overzicht', 'accommodatie', 'voorbereiding', 'weekend', 'afrekenen', 'afgerond'];

export function stapIndex(stap) {
  return STAPPEN.indexOf(stap);
}

// §7.2.2, AAN-05: één stap vooruit of één stap terug; terug naar Invullen kan niet meer vanaf Accommodatie.
// (Vanaf Accommodatie is één stap terug Overzicht, dus Invullen ligt dan altijd twee stappen terug.)
export function stapMogelijk(van, naar) {
  const a = stapIndex(van);
  const b = stapIndex(naar);
  if (a < 0 || b < 0) return false;
  if (naar === 'invullen' && a >= stapIndex('accommodatie')) return false;
  return b === a + 1 || b === a - 1;
}

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
