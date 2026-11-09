// Teksten delen en kopiëren (spec §7.12.1): het deelmenu van het apparaat waar dat er is, anders
// WhatsApp op het web, en altijd een kopieerknop. Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from './dom.js';
import { waLink } from './navigatie.js';

const DEEL = ['M12 15V4', 'm8 8 4-4 4 4', 'M5 13v6h14v-6'];
const KOPIE = ['M9 9h10v11H9z', 'M5 15V4h10'];

export async function kopieer(tekst, schrijf = (t) => navigator.clipboard.writeText(t)) {
  try { await schrijf(tekst); return true; } catch { return false; }
}

// Geeft true als de tekst is doorgegeven aan het deelmenu of aan WhatsApp, false bij annuleren.
export async function deel(tekst, { share = typeof navigator.share === 'function' ? (d) => navigator.share(d) : null, open = (u) => window.open(u, '_blank', 'noopener') } = {}) {
  if (share) {
    try { await share({ text: tekst }); return true; } catch (e) { if (e && e.name === 'AbortError') return false; }
  }
  open(waLink(tekst));
  return true;
}

// Twee knoppen (delen en kopiëren) voor één tekst, met een regel voor de uitkomst.
// soort is bijvoorbeeld 'Uitnodiging' of 'Pincode'; naam de voornaam voor de schermlezer.
export function deelKnoppen({ tekst, soort, naam, bijGedeeld = () => {} }) {
  const status = h('span', { class: 'hint', role: 'status' });
  const delen = h('button', { class: 'btn btn-sm btn-ghost', type: 'button', 'aria-label': `${soort} voor ${naam} delen`, onclick: async () => {
    if (await deel(tekst)) { status.textContent = ''; bijGedeeld(); }
  } }, icoon(DEEL, 18), 'Delen');
  const kopie = h('button', { class: 'btn btn-sm btn-plain', type: 'button', 'aria-label': `${soort} voor ${naam} kopiëren`, onclick: async () => {
    status.textContent = (await kopieer(tekst)) ? 'Gekopieerd.' : 'Kopiëren lukte niet, selecteer de tekst zelf.';
  } }, icoon(KOPIE, 18), 'Kopieer');
  return h('div', { class: 'dl-knoppen' }, delen, kopie, status);
}
