// Beschikbaarheid per weekend (spec §5.2, §7.3.2, KAL-2, KAL-7). Waarden: { 'JJJJ-MM-DD': 'ja' | 'misschien' | 'nee' }.
export const WAARDEN = ['ja', 'misschien', 'nee'];

// AAN-17: tikken wisselt leeg, ja, misschien, nee, leeg.
export function volgendeWaarde(huidig) {
  const volgorde = [undefined, ...WAARDEN];
  return volgorde[(volgorde.indexOf(huidig) + 1) % volgorde.length];
}

// Geeft een nieuw object; `undefined` haalt de sleutel weg (een ontbrekende sleutel is niet ingevuld).
export function zetWaarde(waarden, vrijdag, waarde) {
  const nieuw = { ...waarden };
  if (waarde) nieuw[vrijdag] = waarde;
  else delete nieuw[vrijdag];
  return nieuw;
}

// KAL-7: zet alle lege weekenden van de lijst op `waarde`; ingevulde weekenden blijven staan.
export function maandVullen(waarden, vrijdagen, waarde) {
  const nieuw = { ...waarden };
  for (const v of vrijdagen) if (!nieuw[v]) nieuw[v] = waarde;
  return nieuw;
}

export function tel(waarden, vrijdagen) {
  const t = { ja: 0, misschien: 0, nee: 0, leeg: 0 };
  for (const v of vrijdagen) t[waarden[v] || 'leeg'] += 1;
  return t;
}
