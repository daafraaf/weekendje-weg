// Kookbeurten (KOK-1 t/m KOK-4): maaltijden met koks, ingrediënten en de eetwensen voor de koks.
// Ontwerp: docs/design/Kookbeurten.dc.html. Alle tekst, ook de ingevoerde namen, gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { kopMetHint } from '../components/hint.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../components/stappenbalk.js';
import { datumLang } from '../../shared/datums.js';
import { DAGEN, DAGNAMEN, SOORTEN, SOORT_NAMEN, MAALTIJD_GRENZEN } from '../../shared/maaltijden.js';
import { editieKeuze, foutMelding } from './voortgang.js';

const PLUS = ['M12 5v14M5 12h14'];
const SLOT = ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const hoofd = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function maakKookbeurten({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  const wortel = h('section', { class: 'beheer kookbeurten' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Voorbereiding' : 'Voorbereiding'),
    kopMetHint(h('h1', { class: 't-title' }, 'Kookbeurten'), 'kookbeurten'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);

  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) bericht = tekst;
    await laad();
  }

  // KOK-4, §7.10.4: aantallen per eetwens en teksten uit het vrije veld, zonder namen.
  function wensen(m) {
    const w = m.wensen;
    const leeg = !w.aantallen.length && !w.teksten.length;
    return h('div', { class: 'glass panel kk-wensen' },
      h('p', { class: 't-cap kk-privacy' }, icoon(SLOT, 13), 'Eetwensen, zonder namen'),
      leeg ? h('p', { class: 't-small t-sec' }, 'Nog geen eetwensen opgegeven.') : null,
      w.aantallen.length ? h('p', { class: 't-small', 'data-wensen': true }, w.aantallen.flatMap((a, n) => [n ? ' · ' : '', `${a.label} `, h('b', {}, String(a.aantal))])) : null,
      w.teksten.length ? h('p', { class: 't-small t-sec', 'data-teksten': true }, w.teksten.map((t) => `“${t}”`).join(' ')) : null);
  }

  // KOK-3, §7.10.3: een ingrediënt komt met de maaltijdnaam op de boodschappenlijst.
  function ingredient(m) {
    const naam = h('input', { class: 'field', type: 'text', 'aria-label': `Ingrediënt voor ${m.naam.toLowerCase()}`, placeholder: 'Bijvoorbeeld champignons, 500 gram', maxlength: '60', autocomplete: 'off', style: 'min-height:44px' });
    const voegToe = async () => {
      if (!naam.value.trim()) { melding.toon('Geef het ingrediënt een naam.'); return; }
      await schrijf('itemOpslaan', { soort: 'boodschap', naam: naam.value, maaltijdId: m.id }, `${naam.value.trim()} staat op de boodschappenlijst.`);
    };
    naam.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); voegToe(); } });
    return h('div', { class: 'kk-ingredient' },
      m.ingredienten.length ? h('div', { class: 'kk-tags', 'aria-label': `Ingrediënten voor ${m.naam.toLowerCase()}` }, m.ingredienten.map((i) => h('span', { class: 'tag', 'data-ingredient': i.id }, i.naam))) : null,
      g.definitief || g.alleenLezen ? null : h('div', { class: 'row kk-nieuw' }, naam,
        h('button', { class: 'icon-btn mee-plus', type: 'button', 'data-schrijft': true, 'aria-label': `Ingrediënt voor ${m.naam.toLowerCase()} toevoegen`, onclick: voegToe }, icoon(PLUS, 20))));
  }

  // KOK-1: de organisator past de omschrijving aan.
  function beheer(m) {
    const veld = h('input', { class: 'field', type: 'text', 'aria-label': `Omschrijving ${m.naam.toLowerCase()}`, maxlength: String(MAALTIJD_GRENZEN.omschrijvingMax), value: m.omschrijving, placeholder: 'Wat wordt het?', style: 'min-height:44px' });
    return h('div', { class: 'row kk-nieuw' }, veld,
      h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Omschrijving ${m.naam.toLowerCase()} opslaan`,
        onclick: () => schrijf('maaltijdOpslaan', { id: m.id, dag: m.dag, soort: m.soort, omschrijving: veld.value }, `${m.naam} is aangepast.`) }, 'Opslaan'));
  }

  function maaltijd(m) {
    const koks = m.koks.length
      ? h('span', { class: 'mee-chips' }, m.koks.map((k) => h('span', { class: k.ik ? 'chip' : 'chip chip-n', style: 'min-height:24px' }, k.ik ? 'jij' : k.naam)))
      : h('span', { class: 't-small t-sec' }, 'Nog geen kok');
    const sub = [m.omschrijving, m.ingredienten.length ? `${m.ingredienten.length} ${m.ingredienten.length === 1 ? 'ingrediënt' : 'ingrediënten'}` : ''].filter(Boolean).join(' · ');
    const knop = !g.ikDeelnemer || g.alleenLezen ? null : m.kok
      ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Stoppen met koken: ${m.naam.toLowerCase()}`,
        onclick: () => schrijf('kokStoppen', { maaltijdId: m.id }, `Je kookt ${m.naam.toLowerCase()} niet meer.`) }, 'Stoppen')
      : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Ik kook ${m.naam.toLowerCase()}`,
        onclick: () => schrijf('kokWorden', { maaltijdId: m.id }, `Je kookt ${m.naam.toLowerCase()}.`) }, 'Ik kook');
    return h('div', { class: 'kk', 'data-maaltijd': m.id },
      h('div', { class: 'row' },
        h('span', { class: 'mee-tekst' }, h('span', { class: 'rij-naam' }, SOORT_NAMEN[m.soort]), koks, sub ? h('span', { class: 't-small t-sec' }, sub) : null),
        knop),
      m.kok ? h('div', { class: 'kk-uit' }, m.wensen ? wensen(m) : null, ingredient(m)) : null,
      g.organisator && !g.alleenLezen ? h('div', { class: 'kk-uit' }, beheer(m)) : null);
  }

  function dag(d) {
    const lijst = g.maaltijden.filter((m) => m.dag === d);
    if (!lijst.length) return null;
    const titel = lijst[0].datum ? hoofd(datumLang(lijst[0].datum)) : DAGNAMEN[d];
    return h('section', { class: 'mee-sectie', 'aria-labelledby': `kk-${d}` },
      h('h2', { class: 't-cap', id: `kk-${d}` }, titel),
      h('div', { class: 'solid list', role: 'list', 'aria-label': titel }, lijst.map(maaltijd)));
  }

  // KOK-1: een extra maaltijd; verwijderen kan niet (AAN-68).
  function nieuw() {
    const dagKeuze = h('select', { class: 'field', 'aria-label': 'Dag van de nieuwe maaltijd', style: 'min-height:44px' }, DAGEN.map((d) => h('option', { value: d }, DAGNAMEN[d])));
    const soortKeuze = h('select', { class: 'field', 'aria-label': 'Soort maaltijd', style: 'min-height:44px' }, SOORTEN.map((s) => h('option', { value: s }, SOORT_NAMEN[s])));
    const omschrijving = h('input', { class: 'field', type: 'text', 'aria-label': 'Omschrijving van de nieuwe maaltijd', maxlength: String(MAALTIJD_GRENZEN.omschrijvingMax), placeholder: 'Wat wordt het?', style: 'min-height:44px' });
    return h('section', { class: 'glass panel kk-nieuwe' },
      h('h2', { class: 't-h3' }, 'Maaltijd toevoegen'),
      h('div', { class: 'mee-velden' }, dagKeuze, soortKeuze, omschrijving),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, style: 'align-self:flex-start',
        onclick: () => schrijf('maaltijdOpslaan', { dag: dagKeuze.value, soort: soortKeuze.value, omschrijving: omschrijving.value }, 'De maaltijd is toegevoegd.') }, icoon(PLUS, 18), 'Maaltijd toevoegen'));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    zet(
      kop(g.maaltijden.length ? 'Zet je bij een maaltijd als je kookt.' : null),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'kk-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de kookbeurten nog lezen.') : null,
      g.maaltijden.length ? DAGEN.map(dag) : h('p', { class: 't-small t-sec mee-leeg' }, 'De maaltijden verschijnen zodra de organisator het weekend vastlegt.'),
      g.organisator && !g.alleenLezen && g.maaltijden.length ? nieuw() : null);
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'kookbeurten' }, false);
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
