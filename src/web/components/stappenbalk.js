// Stappenbalk (STA-1, STA-2, STA-8): zeven stappen zonder datums (DDL-1); op mobiel compact en uitklapbaar.
// De stap komt altijd van de editie in de Sheet; zonder bekende stap (nog niet geladen of offline) is er geen huidige stap.
import { STAPPEN, STAPNAMEN, stapIndex } from '../../shared/stappen.js';
import { h, icoon } from '../dom.js';

export function maakStappenbalk({ stap, titel = '' }) {
  const nu = stapIndex(stap);
  const klasse = (i) => (i < nu ? 'done' : i === nu ? 'now' : '');
  const status = (i) => (i < nu ? 'klaar' : i === nu ? 'huidige stap' : 'nog niet');
  const naam = (s) => STAPNAMEN[s];

  const lijst = h('ol', { class: 'sb-lijst' }, STAPPEN.map((s, i) => h('li', { class: `sb-stap ${klasse(i)}`, 'aria-current': i === nu ? 'step' : false },
    h('span', { class: 'sb-nr' }, i < nu ? icoon('m5 12.5 4.5 4.5L19 7.5', 16) : String(i + 1)),
    h('span', { class: 'sb-tekst' },
      h('span', { class: 'sb-naam' }, naam(s)),
      i === nu ? h('span', { class: 'sb-datum' }, 'nu') : null,
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
      h('span', { class: 'sb-nu' }, nu < 0 ? 'Stap laden…' : `${nu + 1} · ${naam(stap)}`),
      h('span', { class: 't-sec sb-buur sb-rechts' }, volgende ? [h('span', {}, naam(volgende)), icoon('m9.5 6 6 6-6 6', 16)] : null)));

  const nav = h('nav', { class: 'glass stappenbalk', 'aria-label': 'Stappen van de editie' }, compact, lijst);
  knop.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    knop.setAttribute('aria-expanded', String(open));
    knop.setAttribute('aria-label', open ? 'Stappen inklappen' : 'Alle stappen tonen');
  });
  return nav;
}
