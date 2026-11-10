// Vraagteken met een korte hint (NAV-7). Een tik of Enter klapt de tekst open, nog een tik of Escape sluit. Geen hover: een telefoon heeft die niet.
// kopMetHint(kop, sleutel) geeft [rij met kop en knop, tekstvak] terug om in een container te zetten. Alle tekst gaat via textContent (NFR-5).
import { h } from '../dom.js';
import { HINTS } from '../hints.js';

let teller = 0;

export function kopMetHint(kop, sleutel, titel = (kop.textContent || '').trim()) {
  teller += 1;
  const id = `hint-${sleutel}-${teller}`;
  const paneel = h('p', { class: 't-small t-sec hint-tekst', id, hidden: true }, HINTS[sleutel]);
  const knop = h('button', { class: 'hint-knop', type: 'button', 'aria-expanded': 'false', 'aria-controls': id, 'aria-label': `Uitleg bij ${titel}` }, '?');
  // Escape sluit de hint ook als de focus niet op de knop staat (Safari focust een knop niet bij een tik).
  const bijEscape = (e) => { if (e.key === 'Escape') zet(false); };
  const zet = (open) => {
    paneel.hidden = !open;
    knop.setAttribute('aria-expanded', String(open));
    if (open) document.addEventListener('keydown', bijEscape); else document.removeEventListener('keydown', bijEscape);
  };
  knop.addEventListener('click', () => zet(paneel.hidden));
  return [h('div', { class: 'hint-kop' }, kop, knop), paneel];
}
