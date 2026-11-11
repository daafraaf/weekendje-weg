// UIT-1, UIT-3: de route van het weekend als kleine tijdlijn met kaartjes, bovenaan Start. Sluiten zet de vlag (AAN-85).
// Alle tekst gaat via textContent (NFR-5).
import { h } from '../dom.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { ROUTE_STAPPEN, uitlegVoor } from '../uitleg.js';

export function maakRoute({ organisator, bijSluiten }) {
  const stappen = ROUTE_STAPPEN.map((s, i) => {
    const u = uitlegVoor(s, organisator);
    return h('li', { class: 'route-stap' },
      h('span', { class: 'route-nr', 'aria-hidden': 'true' }, String(i + 1)),
      h('div', { class: 'route-kaartje' },
        h('h3', { class: 't-h3' }, STAPNAMEN[s]),
        h('p', { class: 't-body' }, u.gebeurt),
        h('p', { class: 't-small t-sec' }, `Levert op: ${u.oplevert}`),
        h('p', { class: 't-small' }, `Jij: ${u.jij}`)));
  });
  return h('section', { class: 'glass card beheer-blok route', 'aria-labelledby': 'route-kop' },
    h('div', { class: 'hint-kop' },
      h('h2', { class: 't-h3', id: 'route-kop' }, 'Zo gaat het weekend'),
      h('button', { class: 'btn btn-ghost route-sluit', type: 'button', onclick: bijSluiten }, 'Sluiten')),
    h('p', { class: 't-small t-sec' }, 'Zes stappen van uitnodiging tot afrekening. Zo weet je steeds waar we zijn en wat er van jou komt.'),
    h('ol', { class: 'route-lijst' }, stappen));
}
