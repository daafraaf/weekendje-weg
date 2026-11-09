// Verdeelinvoer (GELD-2, GELD-3): gelijk met de knop "Iedereen", aandeel met een teller per persoon,
// bedrag per persoon met het verschil met het totaal. Ontwerp: docs/design/UitgaveToevoegen.dc.html (`.segm` plus de rijen).
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { euro, invoerTekst, leesBedrag } from '../../shared/geld.js';
import { AANDEEL_MAX, verdeel, verdelingFout, iedereen } from '../../shared/verdeling.js';

const MIN = ['M5 12h14'];
const PLUS = ['M12 5v14M5 12h14'];
const VINK = ['m5 12.5 4.5 4.5L19 7.5'];
const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const WIJZEN = [['gelijk', 'Gelijk'], ['aandeel', 'Aandeel'], ['bedrag', 'Bedrag']];

// deelnemers: [{ id, voornaam, afgehaakt }]; verdeling: bestaande verdeling of de standaardverdeling;
// bedrag() en betalerId() geven de huidige waarden van het formulier; bijWijzig() na elke wijziging.
export function maakVerdeelinvoer({ deelnemers, verdeling, bedrag, betalerId, alleenLezen = false, bijWijzig = () => {} }) {
  const naamVan = (id) => (deelnemers.find((d) => d.id === id) || {}).voornaam || '';
  let wijze = verdeling.wijze;
  const gekozen = new Set(verdeling.wijze === 'gelijk' ? verdeling.deelnemers : iedereen(deelnemers));
  const aandelen = Object.fromEntries(deelnemers.map((d) => [d.id, verdeling.wijze === 'aandeel' ? verdeling.aandelen[d.id] || 0 : d.afgehaakt ? 0 : 1]));
  const bedragTekst = Object.fromEntries(deelnemers.map((d) => [d.id, verdeling.wijze === 'bedrag' && verdeling.bedragen[d.id] ? invoerTekst(verdeling.bedragen[d.id]) : '']));

  const segm = h('div', { class: 'segm', role: 'group', 'aria-label': 'Verdeelwijze' });
  const rijen = h('div', { class: 'verdeel-rijen' });
  const status = h('p', { class: 'verdeel-status', 'aria-live': 'polite' });
  const el = h('div', { class: 'verdeelinvoer' }, h('p', { class: 'label' }, 'Verdelen'), segm, rijen, status);
  const bedragen = {}; // id -> span met het aandeel in euro

  function waarde() {
    if (wijze === 'gelijk') return { wijze, deelnemers: deelnemers.filter((d) => gekozen.has(d.id)).map((d) => d.id) };
    if (wijze === 'aandeel') return { wijze, aandelen: { ...aandelen } };
    const uit = {};
    for (const [id, t] of Object.entries(bedragTekst)) { if (t.trim()) uit[id] = leesBedrag(t) ?? -1; }
    return { wijze, bedragen: uit };
  }

  const fout = () => {
    const w = waarde();
    if (w.wijze === 'bedrag' && Object.values(w.bedragen).some((c) => c < 0)) return 'Een bedrag per persoon is bijvoorbeeld 12,50.';
    return verdelingFout(bedrag(), w);
  };

  function bijwerken() {
    const totaal = bedrag();
    const delen = totaal ? verdeel(totaal, waarde(), { betalerId: betalerId(), naamVan }) : {};
    for (const [id, span] of Object.entries(bedragen)) span.textContent = euro(delen[id] || 0);
    const f = totaal ? fout() : 'Vul eerst het bedrag in.';
    status.className = `verdeel-status ${f ? 'fout' : 'ok'}`;
    status.replaceChildren(icoon(f ? WAARSCHUWING : VINK, 18), h('span', {}, f || `Verdeeld: ${euro(totaal)}`));
  }

  const wijzig = () => { bijwerken(); bijWijzig(); };

  function rijGelijk(d) {
    const vak = h('input', { type: 'checkbox', disabled: alleenLezen });
    vak.checked = gekozen.has(d.id);
    vak.addEventListener('change', () => { if (vak.checked) gekozen.add(d.id); else gekozen.delete(d.id); wijzig(); });
    bedragen[d.id] = h('span', { class: 't-num' });
    return h('label', { class: 'vink' }, vak, h('span', { class: 'verdeel-naam' }, d.voornaam),
      d.afgehaakt ? h('span', { class: 't-small t-sec' }, 'afgehaakt') : null, bedragen[d.id]);
  }

  function rijAandeel(d) {
    const getal = h('span', { class: 't-num verdeel-teller', 'aria-label': `aandeel ${d.voornaam}` }, String(aandelen[d.id]));
    const stap = (n) => () => { aandelen[d.id] = Math.max(0, Math.min(AANDEEL_MAX, aandelen[d.id] + n)); getal.textContent = String(aandelen[d.id]); wijzig(); };
    bedragen[d.id] = h('span', { class: 't-num t-sec verdeel-bedrag' });
    return h('div', { class: 'row' }, h('span', { class: 'verdeel-naam' }, d.voornaam),
      h('button', { class: 'icon-btn verdeel-knop', type: 'button', 'aria-label': `Aandeel ${d.voornaam} lager`, disabled: alleenLezen, onclick: stap(-1) }, icoon(MIN, 18)),
      getal,
      h('button', { class: 'icon-btn verdeel-knop', type: 'button', 'aria-label': `Aandeel ${d.voornaam} hoger`, disabled: alleenLezen, onclick: stap(1) }, icoon(PLUS, 18)),
      bedragen[d.id]);
  }

  function rijBedrag(d) {
    const id = `vb-${d.id}`;
    const veld = h('input', { id, class: 'field t-num verdeel-veld', inputmode: 'decimal', placeholder: '0,00', disabled: alleenLezen });
    veld.value = bedragTekst[d.id];
    veld.addEventListener('input', () => { bedragTekst[d.id] = veld.value; wijzig(); });
    return h('div', { class: 'row' }, h('span', { class: 'av av-sm', 'aria-hidden': 'true' }, d.voornaam.slice(0, 1).toUpperCase()),
      h('label', { for: id, class: 'verdeel-naam' }, d.voornaam), veld);
  }

  function teken() {
    segm.replaceChildren(...WIJZEN.map(([w, label]) => h('button', {
      type: 'button', 'aria-pressed': String(w === wijze), disabled: alleenLezen, onclick: () => { wijze = w; teken(); bijWijzig(); },
    }, label)));
    for (const k of Object.keys(bedragen)) delete bedragen[k];
    const rij = wijze === 'gelijk' ? rijGelijk : wijze === 'aandeel' ? rijAandeel : rijBedrag;
    const lijst = h('div', { class: 'solid list' }, deelnemers.map(rij));
    // "Iedereen" volgt `iedereen` uit shared/verdeling.js.
    const knop = wijze === 'gelijk' && !alleenLezen
      ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { gekozen.clear(); for (const id of iedereen(deelnemers)) gekozen.add(id); teken(); bijWijzig(); } }, 'Iedereen')
      : null;
    rijen.replaceChildren(...[knop, lijst].filter(Boolean));
    bijwerken();
  }

  teken();
  return { el, waarde, fout, bijwerken };
}
