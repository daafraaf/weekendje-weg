// WhatsApp-teksten (spec §7.12). Pure functies; delen en kopiëren staan in src/web/delen.js.
// Een tekst bevat nooit een pincode samen met een link (§7.12.3): de uitnodiging heeft de link,
// de pincodetekst alleen de pincode en de naam van de editie.
import { datumLang } from './datums.js';
import { STAPPEN, STAPNAMEN } from './stappen.js';
import { euro } from './geld.js';
import { ONDERDELEN, onderdeelAan } from './onderdelen.js';

export function uitnodigingTekst({ voornaam, editieTitel, link }) {
  return `Hoi ${voornaam}, je bent uitgenodigd voor ${editieTitel}. Vul hier je beschikbaarheid en wensen in: ${link}\nDe pincode krijg je in een apart bericht.`;
}

export function pincodeTekst({ voornaam, editieTitel, pin }) {
  if (!/^[0-9]{6}$/.test(String(pin))) throw new Error('pincode van zes cijfers verwacht');
  return `Hoi ${voornaam}, je pincode voor ${editieTitel} is ${pin}. Je hebt hem nodig bij de link die je eerder kreeg.`;
}

// "Anne", "Anne en Bas", "Anne, Bas en Daan".
export function namenLijst(namen) {
  if (namen.length <= 1) return namen.join('');
  return `${namen.slice(0, -1).join(', ')} en ${namen[namen.length - 1]}`;
}

const datumVan = (iso) => (iso ? datumLang(String(iso).slice(0, 10)) : '');

// EDI-10, DDL-1 (BV-10): de deadline is informatief, dus "Graag ingevuld vóór ...", nooit dat invullen dan sluit.
const graagVoor = (datum) => (datum ? ` Graag ingevuld vóór ${datum}.` : '');

// OVZ-2 (§7.12.2): wie nog niet heeft ingevuld en de deadline.
export function herinneringTekst({ editieTitel, namen, deadline }) {
  if (!namen.length) return `Hoi allemaal! Iedereen heeft zijn wensen voor ${editieTitel} ingevuld. Dank jullie wel.`;
  const wie = namen.length === 1 ? `${namen[0]}, jouw wensen` : `${namenLijst(namen)}, jullie wensen`;
  return `Hoi allemaal! ${wie} voor ${editieTitel} staan nog open.${graagVoor(datumVan(deadline))}`;
}

// §7.12.4, OND-2 (BV-27): Meenemen noemt kookbeurten en carpool alleen als ze aan staan.
function meenemenTekst(t, o) {
  const wat = ['wat je meeneemt'];
  if (onderdeelAan('kookbeurten', o)) wat.push('wanneer je kookt');
  if (onderdeelAan('carpool', o)) wat.push('met wie je rijdt');
  return `Hoi allemaal! We bereiden ${t} voor. Kijk in de app ${namenLijst(wat)}.`;
}

// AAN-58: per stap wat er nu van iedereen wordt verwacht, en welke stap daarna volgt (§7.12.2).
const STAP_VERWACHT = {
  invullen: (t, d) => `Hoi allemaal! Voor ${t} kun je je beschikbaarheid en wensen invullen in de app.${graagVoor(d.deadline)}`,
  overzicht: (t) => `Hoi allemaal! Het invullen voor ${t} is gesloten. In de app zie je nu welke weekenden het best passen.`,
  // ACC-9: bij een verrassing geen opties. §7.12.4 (BV-28): zonder opties nog geen top 3.
  accommodatie: (t, d) => (d.deelvorm === 'verrassing'
    ? `Hoi allemaal! Voor ${t} regelen we de accommodatie. Het wordt een verrassing: waar we heen gaan, hoor je later.`
    : d.aantalOpties > 0
      ? `Hoi allemaal! Voor ${t} zoeken we nu een accommodatie. Kijk in de app naar de opties en geef je top 3.`
      : `Hoi allemaal! Voor ${t} zoeken we nu een accommodatie. De organisator zet binnenkort opties in de app.`),
  voorbereiding: (t, d) => meenemenTekst(t, d.onderdelen),
  weekend: (t, d) => `Hoi allemaal! Het is zover: ${t} begint.${onderdeelAan('programma', d.onderdelen) ? ' Het programma staat in de app.' : ' Veel plezier!'}`,
  afrekenen: (t) => `Hoi allemaal! ${t} zit erop. Zet je uitgaven in de app, dan rekenen we af.`,
  // §7.12.4, BV-25: "afgerekend" alleen als er geen betaling meer open staat.
  afgerond: (t, d) => (d.aantalOpen > 0
    ? `Hoi allemaal! ${t} is afgerond. Er staan nog betalingen open: kijk in de app of jij nog iets moet overmaken.`
    : `Hoi allemaal! ${t} is afgerond en afgerekend. Bedankt voor het mooie weekend!`),
};

// aantalOpties: het aantal accommodaties (BV-28); onderdelen: de vlaggen van ONDERDELEN (OND-2).
export function stapTekst({ editieTitel, stap, deadline, deelvorm, aantalOpen = 0, aantalOpties = 0, onderdelen = ONDERDELEN }) {
  const maak = STAP_VERWACHT[stap];
  if (!maak) throw new Error(`onbekende stap ${stap}`);
  const tekst = maak(editieTitel, { deadline: datumVan(deadline), deelvorm, aantalOpen, aantalOpties, onderdelen });
  const volgende = STAPPEN[STAPPEN.indexOf(stap) + 1];
  if (!volgende) return tekst;
  return `${tekst} Daarna volgt de stap ${STAPNAMEN[volgende]}.`; // STA-8: namen uit één tabel, DDL-1: geen datums
}

// Waakhond voor de regel hierboven: waar of onwaar voor één tekst.
export function heeftLinkEnPincode(tekst) {
  const link = /https?:\/\/|#b=/.test(tekst);
  const pin = /(^|[^0-9A-Za-z_-])[0-9]{6}([^0-9A-Za-z_-]|$)/.test(tekst.replace(/(https?:\/\/\S+|#b=\S+)/g, ''));
  return link && pin;
}

// GELD-10 (§7.12.2): betaalverzoek per betaling. AAN-22: zonder rekeningnummer of betaallink;
// het bedrag in centen wordt `€ 12,40`.
export function betaalverzoekTekst({ bedrag, editieTitel }) {
  return `Wil je ${euro(bedrag)} overmaken voor ${editieTitel}?`;
}
