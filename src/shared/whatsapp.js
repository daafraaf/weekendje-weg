// WhatsApp-teksten (spec §7.12). Pure functies; delen en kopiëren staan in src/web/delen.js.
// Een tekst bevat nooit een pincode samen met een link (§7.12.3): de uitnodiging heeft de link,
// de pincodetekst alleen de pincode en de naam van de editie.
import { datumLang } from './datums.js';
import { STAPPEN, STAPNAMEN } from './stappen.js';
import { euro } from './geld.js';

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

// OVZ-2 (§7.12.2): wie nog niet heeft ingevuld en de deadline.
export function herinneringTekst({ editieTitel, namen, deadline }) {
  if (!namen.length) return `Hoi allemaal! Iedereen heeft zijn wensen voor ${editieTitel} ingevuld. Dank jullie wel.`;
  const wie = namen.length === 1 ? `${namen[0]}, jouw wensen` : `${namenLijst(namen)}, jullie wensen`;
  return `Hoi allemaal! ${wie} voor ${editieTitel} staan nog open. Invullen kan tot ${datumVan(deadline)}.`;
}

// AAN-58: per stap wat er nu van iedereen wordt verwacht, en welke stap daarna volgt (§7.12.2).
const STAP_VERWACHT = {
  invullen: (t, d) => `Hoi allemaal! Voor ${t} kun je je beschikbaarheid en wensen invullen in de app. Invullen kan tot ${d.deadline}.`,
  overzicht: (t) => `Hoi allemaal! Het invullen voor ${t} is gesloten. In de app zie je nu welke weekenden het best passen.`,
  accommodatie: (t) => `Hoi allemaal! Voor ${t} zoeken we nu een accommodatie. Kijk in de app naar de opties.`,
  voorbereiding: (t) => `Hoi allemaal! We bereiden ${t} voor. Kijk in de app wat je meeneemt, wanneer je kookt en met wie je rijdt.`,
  weekend: (t) => `Hoi allemaal! Het is zover: ${t} begint. Het programma staat in de app.`,
  afrekenen: (t) => `Hoi allemaal! ${t} zit erop. Zet je uitgaven in de app, dan rekenen we af.`,
  afgerond: (t) => `Hoi allemaal! ${t} is afgerond en afgerekend. Bedankt voor het mooie weekend!`,
};

export function stapTekst({ editieTitel, stap, deadline }) {
  const maak = STAP_VERWACHT[stap];
  if (!maak) throw new Error(`onbekende stap ${stap}`);
  const tekst = maak(editieTitel, { deadline: datumVan(deadline) });
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
