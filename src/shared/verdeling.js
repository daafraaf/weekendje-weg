// Verdeling van een post over deelnemers (spec §5.2 `Posten.verdeling`, §7.13.2 t/m §7.13.5, GELD-2 t/m GELD-4).
// Elke verdeling telt exact op tot het bedrag; daarop rust de saldo-invariant (§7.13.6).
import { euro } from './geld.js';

export const WIJZEN = ['gelijk', 'aandeel', 'bedrag'];
export const AANDEEL_MAX = 20;

const positief = (map) => Object.entries(map || {}).filter(([, w]) => w > 0);

// §7.13.2: "in de verdeling" is geselecteerd, aandeel groter dan 0 of bedrag groter dan 0.
export function inVerdeling(verdeling) {
  if (!verdeling) return [];
  if (verdeling.wijze === 'gelijk') return [...new Set(verdeling.deelnemers || [])];
  if (verdeling.wijze === 'aandeel') return positief(verdeling.aandelen).map(([id]) => id);
  if (verdeling.wijze === 'bedrag') return positief(verdeling.bedragen).map(([id]) => id);
  return [];
}

// AAN-10: de restcenten gaan naar de betaler (bij een ontvangst de ontvanger) als die in de verdeling zit,
// anders naar de eerste deelnemer in de verdeling op voornaam en daarna op id.
export function restNaar(ids, betalerId, naamVan = () => '') {
  if (ids.includes(betalerId)) return betalerId;
  return ids.slice().sort((a, b) => (naamVan(a) || '').localeCompare(naamVan(b) || '', 'nl') || (a < b ? -1 : a > b ? 1 : 0))[0];
}

// Geeft per deelnemer-ID het aandeel in centen; samen precies het bedrag. Een ongeldige verdeling geeft {}.
export function verdeel(bedrag, verdeling, { betalerId, naamVan } = {}) {
  if (verdelingFout(bedrag, verdeling)) return {};
  const ids = inVerdeling(verdeling);
  const uit = {};
  if (verdeling.wijze === 'bedrag') {
    for (const [id, c] of positief(verdeling.bedragen)) uit[id] = c;
    return uit;
  }
  if (verdeling.wijze === 'gelijk') {
    const deel = Math.floor(bedrag / ids.length);
    for (const id of ids) uit[id] = deel;
  } else {
    const som = ids.reduce((s, id) => s + verdeling.aandelen[id], 0);
    for (const id of ids) uit[id] = Math.floor((bedrag * verdeling.aandelen[id]) / som);
  }
  const rest = bedrag - Object.values(uit).reduce((s, c) => s + c, 0);
  if (rest) { const r = restNaar(ids, betalerId, naamVan); uit[r] += rest; }
  return uit;
}

// GELD-12 (BV-34): de bedragen per persoon van een verdeling, om bij wisselen naar Bedrag voor te vullen. Een ongeldige
// verdeling of geen bedrag geeft {}.
export const bedragenVan = (bedrag, verdeling, opties = {}) => (bedrag > 0 ? verdeel(bedrag, verdeling, opties) : {});

// Verschil tussen het bedrag en de som van de bedragen per persoon; positief is nog te verdelen.
export const verschil = (bedrag, verdeling) => bedrag - positief(verdeling && verdeling.bedragen).reduce((s, [, c]) => s + c, 0);

// Geeft een Nederlandse melding als de verdeling niet opgeslagen kan worden, anders null.
// AAN-09: bij bedrag per persoon kan opslaan pas als het verschil met het totaal nul is (GELD-3).
export function verdelingFout(bedrag, verdeling) {
  if (!Number.isInteger(bedrag) || bedrag <= 0) return 'Vul een bedrag in.';
  if (!verdeling || !WIJZEN.includes(verdeling.wijze)) return 'Kies hoe je verdeelt.';
  if (verdeling.wijze === 'gelijk') {
    return inVerdeling(verdeling).length ? null : 'Kies minstens één persoon.';
  }
  if (verdeling.wijze === 'aandeel') {
    const waarden = Object.values(verdeling.aandelen || {});
    if (waarden.some((a) => !Number.isInteger(a) || a < 0 || a > AANDEEL_MAX)) return `Een aandeel is een heel getal van 0 tot en met ${AANDEEL_MAX}.`;
    return waarden.some((a) => a > 0) ? null : 'Geef minstens één persoon een aandeel.';
  }
  const waarden = Object.values(verdeling.bedragen || {});
  if (waarden.some((c) => !Number.isInteger(c) || c < 0)) return 'Een bedrag per persoon is nul of meer.';
  const v = verschil(bedrag, verdeling);
  if (v > 0) return `Nog ${euro(v)} te verdelen`;
  if (v < 0) return `${euro(-v)} te veel`;
  return null;
}

// Haalt nullen weg en houdt alleen het veld van de gekozen wijze over.
export function schoonVerdeling(verdeling) {
  if (verdeling.wijze === 'gelijk') return { wijze: 'gelijk', deelnemers: inVerdeling(verdeling) };
  if (verdeling.wijze === 'aandeel') return { wijze: 'aandeel', aandelen: Object.fromEntries(positief(verdeling.aandelen)) };
  return { wijze: 'bedrag', bedragen: Object.fromEntries(positief(verdeling.bedragen)) };
}

// §7.13.5, §7.13.9, AAN-61: de standaardverdeling en de knop "Iedereen" nemen alle niet-afgehaakte
// deelnemers; een afgehaakte deelnemer komt er alleen bij als iemand hem zelf aanvinkt.
export const iedereen = (deelnemers) => deelnemers.filter((d) => !d.afgehaakt).map((d) => d.id);
export const standaardVerdeling = (deelnemers) => ({ wijze: 'gelijk', deelnemers: iedereen(deelnemers) });
