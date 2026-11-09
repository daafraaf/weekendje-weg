// Regels rond de antwoorden van een deelnemer die voorkant en script delen (spec §5.2, §7.4, FRM-2, FRM-3, FRM-4, FRM-8).

// §7.4.3: schijven van €50 (verblijf, 20 stuks) en €100 (weekend, 10 stuks); opgeslagen als bovengrens in centen.
export const BUDGET_VERBLIJF = { stapCent: 5000, aantal: 20 };
export const BUDGET_WEEKEND = { stapCent: 10000, aantal: 10 };

export const bovengrens = (budget, index) => (index + 1) * budget.stapCent;
export const indexVanBovengrens = (budget, cent) => (Number.isInteger(cent) && cent % budget.stapCent === 0 && cent >= budget.stapCent && cent <= budget.aantal * budget.stapCent ? cent / budget.stapCent - 1 : null);

const euro = (cent) => `€${cent / 100}`;

// "tot €50", "€50 tot €100", ..., zoals in §7.4.3.
export function schijfTekst(budget, index) {
  const tot = euro(bovengrens(budget, index));
  return index === 0 ? `tot ${tot}` : `${euro(index * budget.stapCent)} tot ${tot}`;
}

// §7.4.4: reistijd is een geheel getal van 1 tot en met 12 uur; woonplaats 2 tot 60 tekens.
export const REISTIJD = { min: 1, max: 12 };
export const WOONPLAATS = { min: 2, max: 60 };
export const VRIJ_VELD_MAX = 500; // §7.4.7

// §5.2: de acht verblijfswensen. Alleen eigenKamer kent "lieverWel". AAN-52: de labels zijn gekozen, de spec geeft ze niet.
const JA_NEE = [['ja', 'Ja'], ['nee', 'Nee'], ['maaktNietUit', 'Maakt niet uit']];
export const VERBLIJF_WENSEN = [
  { sleutel: 'eigenKamer', label: 'Eigen kamer', opties: [['ja', 'Ja'], ['lieverWel', 'Liever wel'], ['maaktNietUit', 'Maakt niet uit']] },
  { sleutel: 'eigenBadkamer', label: 'Eigen badkamer', opties: JA_NEE },
  { sleutel: 'sauna', label: 'Sauna', opties: JA_NEE },
  { sleutel: 'bubbelbad', label: 'Bubbelbad', opties: JA_NEE },
  { sleutel: 'barbecue', label: 'Barbecue', opties: JA_NEE },
  { sleutel: 'buitenruimte', label: 'Buitenruimte', opties: JA_NEE },
  { sleutel: 'schoonmaak', label: 'Schoonmaak inbegrepen', opties: JA_NEE },
  { sleutel: 'linnengoed', label: 'Linnengoed inbegrepen', opties: JA_NEE },
];

// §7.4.8, AAN-33: ingevuld is minstens één weekend met een waarde, beide budgetten en de reistijd gekozen.
// Geeft de lijst van wat nog ontbreekt; leeg betekent ingevuld.
export function ontbreekt(data = {}) {
  const lijst = [];
  if (!Object.values(data.beschikbaarheid || {}).some(Boolean)) lijst.push('een weekend');
  if (data.budgetVerblijf == null) lijst.push('budget verblijf');
  if (data.budgetWeekend == null) lijst.push('budget weekend');
  if (data.maxReistijdUur == null) lijst.push('reistijd');
  return lijst;
}

export const isIngevuld = (data) => ontbreekt(data).length === 0;
