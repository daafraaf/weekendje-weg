// Regels rond leden die voorkant en script delen (GRP-5).

// AAN-90 (BV-15): een voornaam die al bij een ander lid staat (zonder hoofdletters en spaties) geeft in de voorkant
// een waarschuwing, geen weigering. `eigenId` is het lid dat gewijzigd wordt; dat telt niet mee.
const sleutel = (naam) => String(naam || '').replace(/\s+/g, '').toLowerCase();
export function zelfdeNaam(leden, voornaam, eigenId = '') {
  const s = sleutel(voornaam);
  return Boolean(s) && leden.some((l) => l.id !== eigenId && sleutel(l.voornaam) === s);
}
