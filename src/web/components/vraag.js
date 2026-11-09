// Eigen vraag met het invoerelement dat bij zijn type hoort (FRM-7). Het antwoord is een tekst (AAN-54):
// janee 'ja'/'nee', keuze de sleutel, meerkeuze de sleutels met komma's, schaal '1' tot '5', tekst de tekst zelf.
import { h } from '../dom.js';
import { VRIJ_VELD_MAX } from '../../shared/antwoorden.js';
import { maakDrieknop } from './drieknop.js';
import { maakVinkjeslijst } from './vinkjeslijst.js';

// bijWijziging(waarde): een tekst, of null als het antwoord leeg is.
export function maakVraag({ vraag, waarde = null, alleenLezen = false, bijWijziging = () => {} }) {
  const invoer = (() => {
    switch (vraag.type) {
      case 'janee':
        return maakDrieknop({ label: vraag.tekst, waarde, alleenLezen, bijWijziging, opties: [{ waarde: 'ja', tekst: 'Ja', kleur: 'ja', symbool: '✓' }, { waarde: 'nee', tekst: 'Nee', kleur: 'nee', symbool: '✕' }] });
      case 'schaal':
        return maakDrieknop({ label: vraag.tekst, waarde, alleenLezen, bijWijziging, klasse: 'vijf', opties: ['1', '2', '3', '4', '5'].map((n) => ({ waarde: n, tekst: n, kleur: 'neutraal' })) });
      case 'keuze':
      case 'meerkeuze': {
        const meer = vraag.type === 'meerkeuze';
        return maakVinkjeslijst({
          id: vraag.id, label: vraag.tekst, items: vraag.opties, soort: meer ? 'checkbox' : 'radio', alleenLezen,
          gekozen: waarde ? (meer ? waarde.split(',') : [waarde]) : [],
          bijWijziging: ({ gekozen }) => bijWijziging(gekozen.length ? gekozen.join(',') : null),
        });
      }
      default: {
        const veld = h('textarea', { id: `vr-${vraag.id}`, class: 'field', maxlength: VRIJ_VELD_MAX, readonly: alleenLezen, 'aria-label': vraag.tekst, placeholder: `Maximaal ${VRIJ_VELD_MAX} tekens` });
        veld.value = waarde || '';
        veld.addEventListener('input', () => bijWijziging(veld.value === '' ? null : veld.value));
        return veld;
      }
    }
  })();
  return h('div', { class: 'vraag' }, h('p', { class: 't-body wens-naam' }, vraag.tekst), invoer);
}
