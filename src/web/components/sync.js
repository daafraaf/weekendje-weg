// Eén rustige synchronisatie-indicator in de kopregel (SYNC-4) en de melding na terugdraaien met Opnieuw (SYNC-5).
// Geen melding per klik: de indicator zegt alleen hoe de wachtrij ervoor staat.
import { h } from '../dom.js';
import { SYNC_TEKST } from '../wachtrij.js';

export function maakSyncIndicator(wachtrij) {
  const tekst = h('span', { class: 'sync-tekst' });
  const el = h('p', { class: 'sync t-small', role: 'status', 'aria-live': 'polite', hidden: true }, h('span', { class: 'sync-stip', 'aria-hidden': 'true' }), tekst);
  const melding = h('p', { class: 't-small' });
  const terug = h('div', { class: 'glass toast sync-terug', role: 'status', hidden: true },
    melding,
    h('span', { class: 'sync-knoppen' },
      h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => wachtrij.opnieuw() }, 'Opnieuw'),
      h('button', { class: 'btn btn-plain btn-sm', type: 'button', onclick: () => wachtrij.sluitMelding() }, 'Sluiten')));

  function toon({ status, melding: m, mislukt }) {
    const t = SYNC_TEKST[status] || '';
    el.hidden = !t;
    el.dataset.status = status;
    if (tekst.textContent !== t) tekst.textContent = t;
    terug.hidden = !mislukt;
    melding.textContent = m || '';
  }
  wachtrij.bij(toon);
  toon({ status: wachtrij.status(), melding: wachtrij.melding(), mislukt: 0 });
  return { indicator: el, terugmelding: terug };
}
