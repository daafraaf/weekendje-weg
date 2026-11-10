// Profielmenu (NAV-2, NAV-3, NAV-8): één knop in de kopregel, op mobiel en desktop op dezelfde plek.
// Bevat Uitleg, Installeren (alleen als de browser dat toestaat) en Uitloggen. Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';

const PERSOON = ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M4.5 20.5c.9-3.7 3.8-6 7.5-6s6.6 2.3 7.5 6'];

// soort: 'deelnemer' of 'beheer'. kanInstalleren() en installeer() komen uit platform.js.
export function maakProfielmenu({ soort, kanInstalleren, installeer, uitloggen }) {
  const knop = h('button', { class: 'profiel-knop', type: 'button', 'aria-expanded': 'false', 'aria-haspopup': 'true', 'aria-controls': 'profielmenu', 'aria-label': 'Profiel en uitleg' }, icoon(PERSOON, 24));
  const sluitEn = (f) => () => { sluit(); f(); };
  const installeren = h('button', { class: 'profiel-item', type: 'button', hidden: true, onclick: sluitEn(installeer) }, 'Installeren');
  const uitleg = h('a', { class: 'profiel-item', href: '#/uitleg', onclick: () => sluit() }, 'Uitleg');
  const uit = h('button', { class: 'profiel-item', type: 'button', onclick: sluitEn(uitloggen) }, 'Uitloggen');
  const lijst = h('div', { class: 'glass profiel-menu', id: 'profielmenu', hidden: true },
    h('p', { class: 't-cap profiel-rol' }, soort === 'beheer' ? 'Organisator (beheer)' : 'Deelnemer'), uitleg, installeren, uit);
  const wortel = h('div', { class: 'profiel' }, knop, lijst);

  function open() {
    installeren.hidden = !kanInstalleren();
    lijst.hidden = false;
    knop.setAttribute('aria-expanded', 'true');
    uitleg.focus();
  }
  function sluit(terug = false) {
    if (lijst.hidden) return;
    lijst.hidden = true;
    knop.setAttribute('aria-expanded', 'false');
    if (terug) knop.focus();
  }
  knop.addEventListener('click', () => (lijst.hidden ? open() : sluit(true)));
  wortel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); sluit(true); } });
  document.addEventListener('click', (e) => { if (!wortel.contains(e.target)) sluit(); });
  wortel.addEventListener('focusout', (e) => { if (e.relatedTarget && !wortel.contains(e.relatedTarget)) sluit(); });
  return wortel;
}
