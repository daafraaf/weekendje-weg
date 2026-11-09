// Vinkjeslijst met een vrij veld (FRM-5), ook voor meerkeuzevragen (FRM-7). Alle tekst gaat via textContent (NFR-5).
// items: [{ sleutel, label }]. gekozen: lijst van sleutels. eigen: tekst of null als er geen vrij veld is.
import { h } from '../dom.js';
import { VRIJ_VELD_MAX } from '../../shared/antwoorden.js';

export function maakVinkjeslijst({ id, label, items, gekozen = [], eigen = null, eigenLabel = 'Anders, namelijk', alleenLezen = false, soort = 'checkbox', bijWijziging = () => {} }) {
  let keuzes = [...gekozen];
  let vrij = eigen || '';
  const naam = `vl-${id}`;
  const rijen = items.map((item) => {
    const vink = h('input', { type: soort, name: naam, disabled: alleenLezen });
    vink.checked = keuzes.includes(item.sleutel);
    vink.addEventListener('change', () => {
      keuzes = soort === 'radio' ? (vink.checked ? [item.sleutel] : []) : (vink.checked ? [...keuzes, item.sleutel] : keuzes.filter((s) => s !== item.sleutel));
      melding();
    });
    return h('label', { class: 'vink' }, vink, h('span', {}, item.label));
  });
  const melding = () => bijWijziging({ gekozen: items.map((i) => i.sleutel).filter((s) => keuzes.includes(s)), eigen: eigen === null ? null : vrij });
  let veld = null;
  if (eigen !== null) {
    veld = h('textarea', { id: `${naam}-eigen`, class: 'field', maxlength: VRIJ_VELD_MAX, readonly: alleenLezen, placeholder: `Maximaal ${VRIJ_VELD_MAX} tekens` });
    veld.value = vrij;
    veld.addEventListener('input', () => { vrij = veld.value; melding(); });
  }
  return h('div', { class: 'vraag', role: soort === 'radio' ? 'radiogroup' : 'group', 'aria-label': label },
    rijen.length ? h('div', { class: 'solid list' }, rijen) : null,
    veld ? h('div', {}, h('label', { class: 'label', for: `${naam}-eigen` }, eigenLabel), veld) : null);
}
