// Boodschappenlijst: indeling, afvinken, tellingen en kopieertekst (spec §7.8, MEE-5 t/m MEE-9).
import { CATEGORIEEN, STANDAARD_CATEGORIE } from './categorieen.js';

const opNaam = (a, b) => a.naam.localeCompare(b.naam, 'nl', { sensitivity: 'base' }) || (a.id > b.id ? 1 : -1);

// MEE-5, §7.8.1: alle `boodschap`-items en alle `keuken`-items zonder claim. Items met `claims` (lijst) of `aantalClaims`.
export function opLijst(item) {
  const claims = Array.isArray(item.claims) ? item.claims.length : item.aantalClaims || 0;
  return item.soort === 'boodschap' || (item.soort === 'keuken' && claims === 0);
}

// MEE-5, MEE-7, §7.8.2: per categorie in de vaste volgorde (AAN-19), binnen een categorie op naam,
// afgevinkte items doorgestreept onderaan. Lege categorieën ontbreken.
export function boodschappenLijst(items) {
  const lijst = items.filter(opLijst);
  return CATEGORIEEN.map((categorie) => {
    const eigen = lijst.filter((i) => (CATEGORIEEN.includes(i.categorie) ? i.categorie : STANDAARD_CATEGORIE) === categorie);
    const open = eigen.filter((i) => !i.afgevinkt).sort(opNaam);
    const klaar = eigen.filter((i) => i.afgevinkt).sort(opNaam);
    return { categorie, items: [...open, ...klaar] };
  }).filter((g) => g.items.length > 0);
}

export function voortgang(groepen) {
  const alle = groepen.flatMap((g) => g.items);
  return { klaar: alle.filter((i) => i.afgevinkt).length, totaal: alle.length };
}

// MEE-8, §7.8.7: per categorie een kop en daaronder de items, zonder afgevinkte items, als platte tekst.
// Een categorie waarvan alles is afgevinkt blijft weg. Items staan als "- naam"; categorieën gescheiden door een lege regel.
export function kopieerTekst(groepen) {
  return groepen
    .map((g) => ({ kop: g.categorie, items: g.items.filter((i) => !i.afgevinkt) }))
    .filter((g) => g.items.length > 0)
    .map((g) => [g.kop, ...g.items.map((i) => `- ${i.naam}`)].join('\n'))
    .join('\n\n');
}

const woorden = (t) => String(t || '').normalize('NFC').toLowerCase().split(/[^\p{L}\p{N},]+/u).map((w) => w.replace(/^,+|,+$/g, '')).filter(Boolean);

// MEE-9, §7.8.8, AAN-67: een eten-en-drinkenwens hoort bij een boodschap als al haar woorden terugkomen in de naam van het item
// (een woord van vier tekens of meer ook als begin van een woord). Alleen wensen met minstens één persoon tellen.
export function tellingenBij(naam, wensen) {
  const w = woorden(naam);
  return (wensen || []).filter((o) => {
    const l = woorden(o.label);
    return o.aantal > 0 && l.length > 0 && l.every((x) => w.some((y) => y === x || (x.length >= 4 && y.startsWith(x))));
  }).map((o) => ({ label: o.label, aantal: o.aantal }));
}

export const personenTekst = (n) => (n === 1 ? '1 persoon' : `${n} personen`);
