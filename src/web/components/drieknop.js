// Drieknop (FRM-4): drie knoppen naast elkaar, hooguit één ingedrukt. Nogmaals tikken haalt de keuze weg.
// opties: [{ waarde, tekst, kleur: 'ja' | 'mis' | 'nee' | 'neutraal', symbool }]
import { h } from '../dom.js';

export function maakDrieknop({ label, opties, waarde = null, bijWijziging = () => {}, alleenLezen = false }) {
  let gekozen = waarde;
  const knoppen = opties.map((o) => h('button', {
    type: 'button', class: o.kleur, disabled: alleenLezen, 'aria-pressed': 'false',
    onclick: () => { /* AAN-51 */ gekozen = gekozen === o.waarde ? null : o.waarde; toon(); bijWijziging(gekozen); },
  }, o.symbool ? h('span', { 'aria-hidden': 'true' }, o.symbool) : null, o.tekst));

  function toon() {
    opties.forEach((o, i) => knoppen[i].setAttribute('aria-pressed', String(gekozen === o.waarde)));
  }
  toon();
  return h('div', { class: 'drie', role: 'group', 'aria-label': label }, knoppen);
}
