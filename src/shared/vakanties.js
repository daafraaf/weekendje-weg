// Schoolvakanties per regio en de kenmerken van een weekend (spec §7.3.4, §7.3.6, KAL-4, KAL-6).
import { datumKort, datumPlus, jaarVan, maandVan, dagenInMaand, maakIso } from './datums.js';

export const REGIOS = ['noord', 'midden', 'zuid'];
export const REGIO_LETTER = { noord: 'N', midden: 'M', zuid: 'Z' };

// AAN-49: een schooljaar "2026-2027" geldt van 1 september 2026 tot en met 31 augustus 2027.
export function schooljaarBekend(iso, data) {
  return (data?.schooljaren || []).some((sj) => {
    const [a, b] = sj.split('-').map(Number);
    return iso >= `${a}-09-01` && iso <= `${b}-08-31`;
  });
}

// Regio's met vakantie op één dag (van en tot zijn inclusief).
export function regiosOpDag(iso, data) {
  const regios = new Set();
  for (const v of data?.vakanties || []) if (iso >= v.van && iso <= v.tot) regios.add(v.regio);
  return REGIOS.filter((r) => regios.has(r));
}

export function dagHeeftVakantie(iso, data) {
  return regiosOpDag(iso, data).length > 0;
}

// §7.3.4: kenmerken van het weekend met deze vrijdag. `feestdagen` is een Map datum -> naam.
export function weekendKenmerken(vrijdag, feestdagen, data) {
  const dagen = [vrijdag, datumPlus(vrijdag, 1), datumPlus(vrijdag, 2)];
  const maandag = datumPlus(vrijdag, 3);
  const regios = new Set();
  for (const d of dagen) for (const r of regiosOpDag(d, data)) regios.add(r);
  const feest = [...dagen, maandag].filter((d) => feestdagen.has(d)).map((d) => feestdagen.get(d));
  return {
    regios: REGIOS.filter((r) => regios.has(r)),
    feestdagen: feest,
    langWeekend: feestdagen.has(vrijdag) || feestdagen.has(maandag),
    bekend: schooljaarBekend(vrijdag, data),
  };
}

// Regels onder een maandblad: per vakantie welke regio's en welke data, en de feestdagen van de maand.
export function maandNotities(jaar, maand, feestdagen, data) {
  const eerste = maakIso(jaar, maand, 1);
  const laatste = maakIso(jaar, maand, dagenInMaand(jaar, maand));
  const groepen = new Map();
  for (const v of data?.vakanties || []) {
    if (v.tot < eerste || v.van > laatste) continue;
    const sleutel = `${v.naam}|${v.van}|${v.tot}`;
    if (!groepen.has(sleutel)) groepen.set(sleutel, { naam: v.naam, van: v.van, tot: v.tot, regios: [] });
    groepen.get(sleutel).regios.push(v.regio);
  }
  const regels = [...groepen.values()]
    .sort((a, b) => (a.van < b.van ? -1 : a.van > b.van ? 1 : a.naam.localeCompare(b.naam)))
    .map((g) => ({ soort: 'vakantie', tekst: `${g.naam}, regio ${REGIOS.filter((r) => g.regios.includes(r)).join(', ')}: ${datumKort(g.van)} tot en met ${datumKort(g.tot)}` }));
  for (const [datum, naam] of feestdagen) {
    if (jaarVan(datum) === jaar && maandVan(datum) === maand) regels.push({ soort: 'feestdag', tekst: `${naam}: ${datumKort(datum)}` });
  }
  if (!schooljaarBekend(eerste, data) || !schooljaarBekend(laatste, data)) regels.push({ soort: 'onbekend', tekst: 'Schoolvakanties nog niet bekend.' });
  return regels;
}

// KAL-6: vertaalt de open data van de Rijksoverheid naar `data/vakanties.json`.
// Verwachte vorm per antwoord: { content: [{ title, vacations: [{ type, regions: [{ region, startdate, enddate }] }] }] }.
export function vanOpenData(antwoorden) {
  const vakanties = [];
  const schooljaren = new Set();
  for (const antwoord of antwoorden) {
    for (const blok of antwoord?.content || []) {
      for (const vak of blok.vacations || []) {
        const naam = String(vak.type || '').trim();
        for (const r of vak.regions || []) {
          const regio = String(r.region || '').toLowerCase();
          const regios = regio.startsWith('heel') ? REGIOS : REGIOS.filter((x) => x === regio);
          const van = String(r.startdate || '').slice(0, 10);
          const tot = String(r.enddate || '').slice(0, 10);
          if (!naam || !regios.length || !/^\d{4}-\d{2}-\d{2}$/.test(van) || !/^\d{4}-\d{2}-\d{2}$/.test(tot)) continue;
          for (const x of regios) vakanties.push({ naam, regio: x, van, tot });
        }
      }
      const jaar = /(\d{4})\s*-\s*(\d{4})/.exec(String(blok.title || ''));
      if (jaar) schooljaren.add(`${jaar[1]}-${jaar[2]}`);
    }
  }
  vakanties.sort((a, b) => (a.van < b.van ? -1 : a.van > b.van ? 1 : REGIOS.indexOf(a.regio) - REGIOS.indexOf(b.regio)));
  return { schooljaren: [...schooljaren].sort(), vakanties };
}
