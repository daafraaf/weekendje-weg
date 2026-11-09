// Telling per weekend en de rangorde van de voorkeursdatum (spec §7.5.1, §7.5.2, OVZ-4, OVZ-5).
// Pure functies; het script telt, de voorkant toont.
import { maandVan } from './datums.js';

export const TOP = 5;

// §7.5.1: per weekend ja, misschien, nee en niet ingevuld. `beschikbaarheden` heeft één object per
// deelnemer die niet afgehaakt is (leeg object als hij nog niets heeft opgeslagen).
export function tellWeekenden(vrijdagen, beschikbaarheden, voorkeursmaanden = []) {
  const maanden = new Set(voorkeursmaanden);
  return vrijdagen.map((vrijdag) => {
    const t = { vrijdag, ja: 0, misschien: 0, nee: 0, leeg: 0, voorkeursmaand: maanden.has(maandVan(vrijdag)) };
    for (const b of beschikbaarheden) {
      const w = (b || {})[vrijdag];
      if (w === 'ja' || w === 'misschien' || w === 'nee') t[w] += 1;
      else t.leeg += 1;
    }
    return t;
  });
}

// AAN-06: minste nee, dan meeste ja, dan meeste misschien, dan in een voorkeursmaand, dan het vroegste weekend.
export function vergelijk(a, b) {
  return (a.nee - b.nee)
    || (b.ja - a.ja)
    || (b.misschien - a.misschien)
    || (Number(b.voorkeursmaand) - Number(a.voorkeursmaand))
    || (a.vrijdag < b.vrijdag ? -1 : a.vrijdag > b.vrijdag ? 1 : 0);
}

const zelfdeStand = (a, b) => a.nee === b.nee && a.ja === b.ja && a.misschien === b.misschien;

// De top (standaard 5) in rangorde; de eerste is de voorkeursdatum. `gelijk` markeert een weekend met
// dezelfde aantallen als een buur in de lijst (alleen de voorkeursmaand of de datum beslist dan).
export function topWeekenden(tellingen, aantal = TOP) {
  const gesorteerd = [...tellingen].sort(vergelijk);
  return gesorteerd.slice(0, aantal).map((t, i) => ({
    ...t,
    plek: i + 1,
    gelijk: (i > 0 && zelfdeStand(t, gesorteerd[i - 1])) || (i + 1 < gesorteerd.length && zelfdeStand(t, gesorteerd[i + 1])),
  }));
}

export function voorkeursdatum(tellingen) {
  return topWeekenden(tellingen, 1)[0] || null;
}
