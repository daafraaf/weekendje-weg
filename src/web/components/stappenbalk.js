// Stappenbalk (STA-1, STA-2): zeven stappen met verwachte datum; op mobiel compact en uitklapbaar.
import { STAPPEN, stapIndex } from '../../shared/stappen.js';
import { h, icoon } from '../dom.js';

export const STAPNAMEN = { invullen: 'Invullen', overzicht: 'Overzicht', accommodatie: 'Accommodatie', voorbereiding: 'Voorbereiding', weekend: 'Weekend', afrekenen: 'Afrekenen', afgerond: 'Afgerond' };
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

// '2026-12-01' wordt '1 dec'; leeg wordt 'volgt'. Invullen toont 'tot 1 dec' (spec §7.2.4).
export function stapDatum(stap, iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return 'volgt';
  const tekst = `${Number(m[3])} ${MAANDEN[Number(m[2]) - 1]}`;
  return stap === 'invullen' ? `tot ${tekst}` : tekst;
}

export function maakStappenbalk({ stap, stapData = {}, titel = '' }) {
  const nu = stapIndex(stap);
  const klasse = (i) => (i < nu ? 'done' : i === nu ? 'now' : '');
  const status = (i) => (i < nu ? 'klaar' : i === nu ? 'huidige stap' : 'nog niet');
  const naam = (s) => STAPNAMEN[s];

  const lijst = h('ol', { class: 'sb-lijst' }, STAPPEN.map((s, i) => h('li', { class: `sb-stap ${klasse(i)}`, 'aria-current': i === nu ? 'step' : false },
    h('span', { class: 'sb-nr' }, i < nu ? icoon('m5 12.5 4.5 4.5L19 7.5', 16) : String(i + 1)),
    h('span', { class: 'sb-tekst' },
      h('span', { class: 'sb-naam' }, naam(s)),
      h('span', { class: 'sb-datum' }, i === nu ? 'nu' : stapDatum(s, stapData[s])),
      h('span', { class: 'sr' }, `, ${status(i)}`)))));

  const segmenten = h('ol', { class: 'sb-segmenten' }, STAPPEN.map((s, i) => h('li', { class: `seg ${klasse(i)}` },
    h('span', { class: 'sr' }, `${naam(s)}, ${status(i)}`))));

  const knop = h('button', { class: 'icon-btn sb-knop', type: 'button', 'aria-label': 'Alle stappen tonen', 'aria-expanded': 'false' }, icoon('m6 9.5 6 6 6-6'));
  const vorige = STAPPEN[nu - 1];
  const volgende = STAPPEN[nu + 1];
  const compact = h('div', { class: 'sb-compact' },
    h('div', { class: 'sb-kop' }, h('p', { class: 't-cap' }, titel), knop),
    segmenten,
    h('div', { class: 'sb-rij' },
      h('span', { class: 't-sec sb-buur' }, vorige ? [icoon('m14.5 6-6 6 6 6', 16), h('span', {}, naam(vorige))] : null),
      h('span', { class: 'sb-nu' }, `${nu + 1} · ${naam(stap)}`),
      h('span', { class: 't-sec sb-buur sb-rechts' }, volgende ? [h('span', {}, naam(volgende)), icoon('m9.5 6 6 6-6 6', 16)] : null)));

  const nav = h('nav', { class: 'glass stappenbalk', 'aria-label': 'Stappen van de editie' }, compact, lijst);
  knop.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    knop.setAttribute('aria-expanded', String(open));
    knop.setAttribute('aria-label', open ? 'Stappen inklappen' : 'Alle stappen tonen');
  });
  return nav;
}
