// Stappen van een editie in vaste volgorde (spec §7.2.1).
export const STAPPEN = ['invullen', 'overzicht', 'accommodatie', 'voorbereiding', 'weekend', 'afrekenen', 'afgerond'];

export function stapIndex(stap) {
  return STAPPEN.indexOf(stap);
}
