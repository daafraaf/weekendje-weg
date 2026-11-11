// Bouwstenen van het startscherm: knoppen, kaarten, rijen en de blokken die deelnemer en organisator delen.
// Alle tekst gaat via textContent (NFR-5).
import { h } from '../dom.js';
import { aftelTekst } from '../../shared/start.js';
import { euro } from '../../shared/geld.js';
import { ONDERDELEN, onderdeelAan } from '../../shared/onderdelen.js';
import { weekendLang } from '../screens/overzicht.js';

export const knop = (tekst, route, soort = 'ghost') => h('a', { class: `btn btn-${soort}`, href: route }, tekst);
export const kaart = (kop, ...kinderen) => h('section', { class: 'glass card beheer-blok' }, kop ? h('h2', { class: 't-h3' }, kop) : null, ...kinderen);
export const tekst = (t) => h('p', { class: 't-body' }, t);
export const klein = (t) => h('p', { class: 't-small t-sec' }, t);
export const rij = (titel, sub, route) => h('a', { class: 'row start-rij', href: route }, h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, titel), sub ? h('span', { class: 't-small t-sec' }, sub) : null));
export const lijst = (naam, ...rijen) => h('div', { class: 'solid list', role: 'list', 'aria-label': naam }, rijen.flat().filter(Boolean));

// STA-5: dagen tot de vrijdag, op de dag zelf "Vandaag!".
export function aftelBlok(g, vandaag) {
  const t = aftelTekst(vandaag, g.editie.vastgelegdWeekend);
  return t ? h('section', { class: 'glass card start-aftel', 'aria-label': 'Aftellen' }, h('p', { class: 'start-aftel-getal' }, t), klein(weekendLang(g.editie.vastgelegdWeekend))) : null;
}

// ACC-9: bij een geheime verrassing geeft de server geen naam; dan staat er alleen dat het geregeld is.
export function accommodatieRegel(g) {
  const b = g.geboekt;
  if (b && !b.naam) return '✓ De accommodatie is geregeld. Het wordt een verrassing.';
  if (b) return `✓ Geboekt: ${b.naam}${b.plaats ? `, ${b.plaats}` : ''}${b.verrassing ? ' (nog een verrassing)' : ''}.`;
  if (g.editie.deelvorm === 'verrassing') return 'Het wordt een verrassing. De accommodatie is nog niet geboekt.';
  return 'We kiezen samen: geef je top 3 van de accommodaties.';
}

export function weekendRegel(g) {
  return g.editie.vastgelegdWeekend ? `Het weekend: ${weekendLang(g.editie.vastgelegdWeekend)}.` : 'Het weekend ligt nog niet vast.';
}

// De status per onderdeel van de voorbereiding; de organisator ziet dezelfde rijen als status (§7.14).
export function voorbereidingRijen(g, vlaggen = ONDERDELEN) {
  const v = g.voorbereiding;
  if (!v) return [];
  const s = (n, enkel, meer) => `${n} ${n === 1 ? enkel : meer}`;
  const aan = (n, r) => (onderdeelAan(n, vlaggen) ? r : null); // OND-2
  return [
    aan('boodschappen', rij('Boodschappenlijst', v.boodschappen.definitief ? `${s(v.boodschappen.aantal, 'boodschap', 'boodschappen')}, definitief` : `${s(v.boodschappen.aantal, 'boodschap', 'boodschappen')}, nog niet definitief`, '#/boodschappen')),
    rij('Wie neemt wat mee', `${v.spullen.geclaimd} van ${s(v.spullen.totaal, 'spul', 'spullen')} heeft een eigenaar`, '#/meenemen'),
    aan('kookbeurten', rij('Kookbeurten', `${v.maaltijden.metKok} van ${s(v.maaltijden.totaal, 'maaltijd', 'maaltijden')} heeft een kok${v.maaltijden.mijn ? `, jij kookt ${v.maaltijden.mijn}x` : ''}`, '#/kookbeurten')),
    aan('carpool', rij('Carpool', v.carpool.mijn === 'rijdt' ? 'Jij rijdt' : v.carpool.mijn === 'meerijden' ? 'Jij rijdt mee' : `${s(v.carpool.zonderRit, 'deelnemer heeft', 'deelnemers hebben')} nog geen rit`, '#/carpool')),
    aan('kamers', rij('Kamer', v.kamers.mijn ? `Jij slaapt in ${v.kamers.mijn}` : `${v.kamers.ingedeeld} van ${g.deelnemers} ingedeeld`, '#/kamers')),
  ].filter(Boolean);
}

// "Wat jij moet betalen of krijgt" (deelnemer) en de openstaande betalingen (organisator, voor iedereen).
export function betalingRijen(g) {
  return g.afrekening.open.map((b) => h('div', { class: 'row', role: 'listitem' }, h('span', { class: 'rij-tekst' },
    h('span', { class: 'rij-naam' }, b.ikBetaal ? `Jij betaalt ${b.naar}` : b.ikKrijg ? `${b.van} betaalt jou` : `${b.van} betaalt ${b.naar}`)),
  h('span', { class: 't-num' }, euro(b.bedrag))));
}

// Afgerond: samenvatting van de editie (§7.14).
export function samenvatting(g) {
  return kaart('Samenvatting', tekst(weekendRegel(g)), tekst(accommodatieRegel(g)),
    klein(`${g.deelnemers} deelnemers, ${euro(g.afrekening.uitgaven)} uitgegeven, ${g.afrekening.aantalOpen === 0 ? 'alles betaald' : `${g.afrekening.aantalOpen} ${g.afrekening.aantalOpen === 1 ? 'betaling' : 'betalingen'} open`}.`));
}
