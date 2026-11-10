// Kamers (KMR-1): kamers met bewoners en de wens voor een eigen kamer; de organisator maakt kamers en deelt in.
// Ontwerp: docs/design/KamersCarpool.dc.html. Alle tekst, ook namen, gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { KAMER_GRENZEN as G, eigenKamerLabel } from '../../shared/kamers.js';
import { editieKeuze, foutMelding } from './voortgang.js';

const PLUS = ['M12 5v14M5 12h14'];

export function maakKamers({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  let bevestig = '';
  const wortel = h('section', { class: 'beheer kamers' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Voorbereiding' : 'Voorbereiding'),
    h('h1', { class: 't-title' }, 'Kamers'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);

  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) { bericht = tekst; bevestig = ''; }
    await laad();
  }

  const wens = (p) => (eigenKamerLabel(p.eigenKamer) ? h('span', { class: 'chip chip-n', style: 'min-height:24px', 'data-wens': true }, `Eigen kamer: ${eigenKamerLabel(p.eigenKamer).toLowerCase()}`) : null);
  const beheren = () => g.organisator && !g.alleenLezen;

  function bewoner(k, p) {
    return h('div', { class: 'row', 'data-bewoner': p.naam },
      h('span', { class: 'mee-tekst' }, h('span', { class: 'rij-naam' }, p.ik ? `${p.naam} (jij)` : p.naam), wens(p)),
      beheren() ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `${p.naam} uit ${k.naam} halen`,
        onclick: () => schrijf('kamerIndelen', { deelnemerId: p.deelnemerId }, `${p.naam} slaapt niet meer in ${k.naam}.`) }, 'Uit kamer') : null);
  }

  // KMR-1: naam en slaapplaatsen wijzigen of de kamer weghalen; de bewoners komen dan weer bij "Zonder kamer".
  function kamerBeheer(k) {
    const naam = h('input', { class: 'field', type: 'text', value: k.naam, maxlength: String(G.naamMax), 'aria-label': `Naam van ${k.naam}`, style: 'min-height:44px' });
    const plaatsen = h('input', { class: 'field', type: 'number', min: '1', max: String(G.slaapplaatsenMax), value: String(k.slaapplaatsen), 'aria-label': `Slaapplaatsen van ${k.naam}`, style: 'min-height:44px' });
    return h('div', { class: 'row kk-nieuw' }, naam, plaatsen,
      h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `${k.naam} opslaan`,
        onclick: () => schrijf('kamersOpslaan', { id: k.id, naam: naam.value, slaapplaatsen: Number(plaatsen.value) }, `${naam.value.trim() || k.naam} is aangepast.`) }, 'Opslaan'),
      bevestig === k.id
        ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `${k.naam} definitief verwijderen`,
          onclick: () => schrijf('kamersOpslaan', { id: k.id, verwijderen: true }, `${k.naam} is verwijderd.`) }, 'Ja, verwijderen')
        : h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `${k.naam} verwijderen`, onclick: () => { bevestig = k.id; teken(); } }, 'Verwijderen'));
  }

  function kamer(k) {
    return h('section', { class: 'mee-sectie', 'data-kamer': k.naam, 'aria-labelledby': `km-${k.id}` },
      h('h2', { class: 't-cap', id: `km-${k.id}` }, `${k.naam} · ${k.bewoners.length} van ${k.slaapplaatsen}`, k.vrij ? '' : ' · vol'),
      h('div', { class: 'solid list', role: 'list', 'aria-label': k.naam },
        k.bewoners.length ? k.bewoners.map((p) => bewoner(k, p)) : h('p', { class: 't-small t-sec mee-leeg' }, 'Nog niemand in deze kamer.'),
        beheren() ? kamerBeheer(k) : null));
  }

  function indeler(p) {
    const open = g.kamers.filter((k) => k.vrij > 0);
    const keuze = h('select', { class: 'field', 'aria-label': `Kamer voor ${p.naam}`, style: 'min-height:44px' }, open.map((k) => h('option', { value: k.id }, `${k.naam} (${k.vrij} vrij)`)));
    return h('span', { class: 'mee-knoppen' }, keuze,
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, disabled: open.length ? false : true, 'aria-label': `${p.naam} indelen`,
        onclick: () => schrijf('kamerIndelen', { deelnemerId: p.deelnemerId, kamerId: keuze.value }, `${p.naam} is ingedeeld.`) }, 'Indelen'));
  }

  function zonder() {
    return h('section', { class: 'mee-sectie', 'aria-labelledby': 'km-zonder' },
      h('h2', { class: 't-cap', id: 'km-zonder' }, 'Zonder kamer'),
      g.zonderKamer.length
        ? h('div', { class: 'solid list', role: 'list', 'aria-label': 'Zonder kamer' }, g.zonderKamer.map((p) => h('div', { class: 'row', 'data-zonder': p.naam },
          h('span', { class: 'mee-tekst' }, h('span', { class: 'rij-naam' }, p.ik ? `${p.naam} (jij)` : p.naam), wens(p)),
          beheren() ? indeler(p) : null)))
        : h('p', { class: 't-small t-sec mee-leeg' }, 'Iedereen heeft een kamer.'));
  }

  function nieuw() {
    const naam = h('input', { class: 'field', type: 'text', 'aria-label': 'Naam van de nieuwe kamer', maxlength: String(G.naamMax), placeholder: 'Bijvoorbeeld Zolderkamer', style: 'min-height:44px' });
    const plaatsen = h('input', { class: 'field', type: 'number', min: '1', max: String(G.slaapplaatsenMax), value: '2', 'aria-label': 'Slaapplaatsen van de nieuwe kamer', style: 'min-height:44px' });
    return h('section', { class: 'glass panel kk-nieuwe' },
      h('h2', { class: 't-h3' }, 'Kamer toevoegen'),
      h('div', { class: 'mee-velden' }, naam, plaatsen),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, style: 'align-self:flex-start',
        onclick: () => (naam.value.trim() ? schrijf('kamersOpslaan', { naam: naam.value, slaapplaatsen: Number(plaatsen.value) }, 'De kamer is toegevoegd.') : melding.toon('Geef de kamer een naam.')) }, icoon(PLUS, 18), 'Kamer toevoegen'));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    zet(
      kop(g.kamers.length ? 'Wie slaapt waar, met ieders wens voor een eigen kamer.' : null),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'km-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de indeling nog lezen.') : null,
      g.kamers.length ? g.kamers.map(kamer) : h('p', { class: 't-small t-sec mee-leeg' }, 'De organisator maakt de kamers zodra de accommodatie bekend is.'),
      zonder(),
      beheren() ? nieuw() : null);
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'kamers' }, false);
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
