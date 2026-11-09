// Bedragen in centen, hun weergave en de categorieën van posten (spec §7.13.1, §7.9).

// AAN-16: de zes categorieën van posten; de sleutel staat in `Posten.categorie`.
export const CATEGORIEEN = [
  { sleutel: 'verblijf', label: 'Verblijf' },
  { sleutel: 'etenDrinken', label: 'Eten en drinken' },
  { sleutel: 'boodschappen', label: 'Boodschappen' },
  { sleutel: 'activiteit', label: 'Activiteit' },
  { sleutel: 'vervoer', label: 'Vervoer' },
  { sleutel: 'overig', label: 'Overig' },
];
export const CATEGORIE_SLEUTELS = CATEGORIEEN.map((c) => c.sleutel);
export const categorieLabel = (sleutel) => (CATEGORIEEN.find((c) => c.sleutel === sleutel) || { label: 'Overig' }).label;

// AAN-59: een post is 1 cent tot € 100.000 met een omschrijving van 1 tot 80 tekens.
export const POST_GRENZEN = { bedragMax: 10000000, omschrijvingMax: 80 };

const duizendtallen = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// §7.13.1: `€ 1.234,56`; een negatief bedrag krijgt een minteken vooraan.
export function euro(centen) {
  const a = Math.abs(Math.round(centen));
  return `${centen < 0 ? '-' : ''}€ ${duizendtallen(Math.floor(a / 100))},${String(a % 100).padStart(2, '0')}`;
}

// Tekst voor een invoerveld: `84,60`, zonder euroteken en zonder duizendtallen.
export const invoerTekst = (centen) => `${Math.floor(centen / 100)},${String(centen % 100).padStart(2, '0')}`;

// Leest `84,60`, `€ 1.234,56`, `84.6` of `12` als centen; geeft null als het geen bedrag is.
// Een komma is altijd het decimaalteken; zonder komma is een punt met één of twee cijfers erna ook decimaal.
export function leesBedrag(tekst) {
  let t = String(tekst == null ? '' : tekst).replace(/[€\s]/g, '');
  if (!t) return null;
  if (t.includes(',')) {
    if (!/^(\d{1,3}(\.\d{3})+|\d+),\d{0,2}$/.test(t)) return null;
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  } else if (!/^\d+(\.\d{1,2})?$/.test(t)) {
    return null;
  }
  const [heel, deel = ''] = t.split('.');
  const uit = Number(heel) * 100 + Number(`${deel}00`.slice(0, 2));
  return Number.isSafeInteger(uit) ? uit : null;
}
