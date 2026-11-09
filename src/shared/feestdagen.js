// Nederlandse feestdagen, berekend (spec §7.3.5, KAL-5).
import { datumPlus, maakIso, weekdag } from './datums.js';

// Pasen volgens Meeus/Jones/Butcher (gregoriaanse kalender); geeft een ISO-datum.
export function pasen(jaar) {
  const a = jaar % 19;
  const b = Math.floor(jaar / 100);
  const c = jaar % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31);
  const dag = ((h + l - 7 * m + 114) % 31) + 1;
  return maakIso(jaar, maand, dag);
}

// Koningsdag is 27 april, of 26 april als 27 april op zondag valt.
export function koningsdag(jaar) {
  const dag = maakIso(jaar, 4, 27);
  return weekdag(dag) === 6 ? maakIso(jaar, 4, 26) : dag;
}

// Alle feestdagen van een jaar, op datum gesorteerd: [{ datum, naam }].
export function feestdagen(jaar) {
  const p = pasen(jaar);
  const lijst = [
    { datum: maakIso(jaar, 1, 1), naam: 'Nieuwjaarsdag' },
    { datum: datumPlus(p, -2), naam: 'Goede Vrijdag' },
    { datum: p, naam: 'Eerste Paasdag' },
    { datum: datumPlus(p, 1), naam: 'Tweede Paasdag' },
    { datum: koningsdag(jaar), naam: 'Koningsdag' },
    { datum: maakIso(jaar, 5, 5), naam: 'Bevrijdingsdag' },
    { datum: datumPlus(p, 39), naam: 'Hemelvaartsdag' },
    { datum: datumPlus(p, 49), naam: 'Eerste Pinksterdag' },
    { datum: datumPlus(p, 50), naam: 'Tweede Pinksterdag' },
    { datum: maakIso(jaar, 12, 25), naam: 'Eerste Kerstdag' },
    { datum: maakIso(jaar, 12, 26), naam: 'Tweede Kerstdag' },
  ];
  return lijst.sort((x, y) => (x.datum < y.datum ? -1 : 1));
}

// Opzoektabel datum -> naam voor een reeks jaren (een weekend kan over de jaargrens lopen).
export function feestdagTabel(vanJaar, totJaar) {
  const tabel = new Map();
  for (let j = vanJaar; j <= totJaar; j += 1) for (const f of feestdagen(j)) tabel.set(f.datum, f.naam);
  return tabel;
}
