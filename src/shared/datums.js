// Datumhulp op ISO-datums (JJJJ-MM-DD), zonder tijdzones: alles rekent in UTC (spec §7.3).
import { datumPlus, MAANDNAMEN } from './editie.js';

export { datumPlus, MAANDNAMEN };
export const WEEKDAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
export const WEEKDAGNAMEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const utc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

export const maakIso = (jaar, maand, dag) => new Date(Date.UTC(jaar, maand - 1, dag)).toISOString().slice(0, 10);
export const jaarVan = (iso) => +iso.slice(0, 4);
export const maandVan = (iso) => +iso.slice(5, 7);
export const dagVan = (iso) => +iso.slice(8, 10);
export const dagenTussen = (van, tot) => Math.round((utc(tot) - utc(van)) / 86400000);

// 0 = maandag tot 6 = zondag.
export function weekdag(iso) {
  return (new Date(utc(iso)).getUTCDay() + 6) % 7;
}

export function dagenInMaand(jaar, maand) {
  return new Date(Date.UTC(jaar, maand, 0)).getUTCDate();
}

// '2027-04-27' wordt '27 apr'.
export function datumKort(iso) {
  return `${dagVan(iso)} ${MAANDEN_KORT[maandVan(iso) - 1]}`;
}

// '2027-04-27' wordt 'dinsdag 27 april'.
export function datumLang(iso) {
  return `${WEEKDAGNAMEN[weekdag(iso)]} ${dagVan(iso)} ${MAANDNAMEN[maandVan(iso) - 1]}`;
}

// Alle vrijdagen van `van` tot en met `tot` (spec §7.3.1: een weekend is een vrijdag).
export function vrijdagen(van, tot) {
  const lijst = [];
  let d = datumPlus(van, (4 - weekdag(van) + 7) % 7);
  while (d <= tot) {
    lijst.push(d);
    d = datumPlus(d, 7);
  }
  return lijst;
}

// AAN-15: het venster van een editie is standaard het kalenderjaar.
export function standaardPeriode(jaar) {
  return { periodeVan: `${jaar}-01-01`, periodeTot: `${jaar}-12-31` };
}
