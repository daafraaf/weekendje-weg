// Carpool (CAR-1, CAR-2): ritten met vrije plaatsen, meerijden en wie nog geen rit heeft; de organisator deelt iedereen in.
// Ontwerp: docs/design/KamersCarpool.dc.html. Alle tekst, ook namen en plaatsen, gaat via textContent (NFR-5).
import { h } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../components/stappenbalk.js';
import { RIT_GRENZEN as G } from '../../shared/kamers.js';
import { editieKeuze, foutMelding } from './voortgang.js';

const plekken = (n) => `${n} ${n === 1 ? 'plek' : 'plekken'}`;

export function maakCarpool({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  let wijzig = ''; // id van de rit die open staat om aan te passen
  const wortel = h('section', { class: 'beheer carpool' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Voorbereiding' : 'Voorbereiding'),
    h('h1', { class: 't-title' }, 'Carpool'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);

  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) { bericht = tekst; wijzig = ''; }
    await laad();
  }

  const beheren = () => g.organisator && !g.alleenLezen;
  const naamTekst = (p) => (p.ik ? `${p.naam} (jij)` : p.naam);
  const plaatsTekst = (p) => (p.woonplaats ? h('span', { class: 't-small t-sec' }, p.woonplaats) : h('span', { class: 't-small t-sec' }, 'Woonplaats onbekend'));

  // CAR-1: vertrekplaats en vrije plaatsen, voor een nieuwe rit of om een bestaande aan te passen.
  function ritFormulier(rit) {
    const plaats = h('input', { class: 'field', type: 'text', maxlength: String(G.plaatsMax), value: rit ? rit.vertrekplaats : g.standaardPlaats, 'aria-label': 'Vertrekplaats', autocomplete: 'off', style: 'min-height:44px' });
    const vrij = h('input', { class: 'field', type: 'number', min: '1', max: String(G.vrijeMax), value: String(rit ? rit.vrijePlaatsen : 3), 'aria-label': 'Vrije plaatsen', style: 'min-height:44px' });
    const opslaan = () => {
      if (!plaats.value.trim()) { melding.toon('Geef een vertrekplaats op.'); return; }
      schrijf('ritOpslaan', { ...(rit ? { id: rit.id } : {}), vertrekplaats: plaats.value, vrijePlaatsen: Number(vrij.value) }, rit ? 'Je rit is aangepast.' : 'Je rit staat erbij.');
    };
    return h('section', { class: 'glass panel kk-nieuwe' },
      h('h2', { class: 't-h3' }, rit ? 'Rit aanpassen' : 'Rit aanbieden'),
      h('div', { class: 'mee-velden' }, plaats, vrij),
      h('div', { class: 'prg-acties' },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, onclick: opslaan }, rit ? 'Opslaan' : 'Rit aanbieden'),
        rit ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', onclick: () => { wijzig = ''; teken(); } }, 'Annuleren') : null));
  }

  function ritKaart(rit) {
    const mijnRit = rit.bestuurder.ik;
    const zit = rit.meerijders.some((p) => p.ik);
    const knop = g.alleenLezen || !g.ikDeelnemer ? null
      : mijnRit ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': 'Mijn rit aanpassen', onclick: () => { wijzig = rit.id; teken(); } }, 'Aanpassen')
        : zit ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Uitstappen bij ${rit.bestuurder.naam}`,
          onclick: () => schrijf('meerijdenStoppen', {}, 'Je rijdt niet meer mee.') }, 'Uitstappen')
          : g.ikBestuurder ? null
            : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, disabled: rit.vrij ? false : true, 'aria-label': `Rij mee met ${rit.bestuurder.naam}`,
              onclick: () => schrijf('meerijden', { ritId: rit.id }, `Je rijdt mee met ${rit.bestuurder.naam}.`) }, rit.vrij ? 'Rij mee' : 'Vol');
    return h('div', { class: 'kk', 'data-rit': rit.bestuurder.naam },
      h('div', { class: 'row' },
        h('span', { class: 'mee-tekst' },
          h('span', { class: 'rij-naam' }, naamTekst(rit.bestuurder)),
          h('span', { class: 't-small t-sec' }, `Vertrekt uit ${rit.vertrekplaats} · ${rit.vrij ? `${plekken(rit.vrij)} vrij` : 'vol'}`)),
        knop),
      rit.meerijders.map((p) => h('div', { class: 'row', 'data-meerijder': p.naam },
        h('span', { class: 'mee-tekst' }, h('span', { class: 'rij-naam' }, naamTekst(p)), plaatsTekst(p)),
        beheren() ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `${p.naam} uit de rit van ${rit.bestuurder.naam} halen`,
          onclick: () => schrijf('meerijdenStoppen', { deelnemerId: p.deelnemerId }, `${p.naam} rijdt niet meer mee.`) }, 'Uitdelen') : null)),
      mijnRit && wijzig === rit.id ? ritFormulier(rit) : null,
      mijnRit && wijzig === rit.id ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': 'Mijn rit annuleren',
        onclick: () => schrijf('ritOpslaan', { id: rit.id, verwijderen: true }, 'Je rit is geannuleerd.') }, 'Rit annuleren') : null,
      beheren() && !mijnRit ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Rit van ${rit.bestuurder.naam} verwijderen`,
        onclick: () => schrijf('ritOpslaan', { id: rit.id, verwijderen: true }, `De rit van ${rit.bestuurder.naam} is verwijderd.`) }, 'Rit verwijderen') : null);
  }

  // CAR-2: de organisator deelt iemand zonder rit in bij een rit met een vrije plek.
  function indeler(p) {
    const open = g.ritten.filter((r) => r.vrij > 0);
    const keuze = h('select', { class: 'field', 'aria-label': `Rit voor ${p.naam}`, style: 'min-height:44px' }, open.map((r) => h('option', { value: r.id }, `${r.bestuurder.naam} (${r.vrij} vrij)`)));
    return h('span', { class: 'mee-knoppen' }, keuze,
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, disabled: open.length ? false : true, 'aria-label': `${p.naam} indelen`,
        onclick: () => schrijf('meerijden', { ritId: keuze.value, deelnemerId: p.deelnemerId }, `${p.naam} is ingedeeld.`) }, 'Indelen'));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    const aanbieden = g.ikDeelnemer && !g.alleenLezen && !g.ikBestuurder && !g.ikMeerijder;
    zet(
      kop(g.ritten.length ? 'Bied een rit aan of rij mee.' : null),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'cp-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de ritten nog lezen.') : null,
      h('section', { class: 'mee-sectie', 'aria-labelledby': 'cp-ritten' },
        h('h2', { class: 't-cap', id: 'cp-ritten' }, 'Ritten'),
        g.ritten.length ? h('div', { class: 'solid list', role: 'list', 'aria-label': 'Ritten' }, g.ritten.map(ritKaart))
          : h('p', { class: 't-small t-sec mee-leeg' }, 'Nog niemand biedt een rit aan.')),
      aanbieden ? ritFormulier(null) : null,
      h('section', { class: 'mee-sectie', 'aria-labelledby': 'cp-zonder' },
        h('h2', { class: 't-cap', id: 'cp-zonder' }, 'Nog geen rit'),
        g.zonderRit.length
          ? h('div', { class: 'solid list', role: 'list', 'aria-label': 'Nog geen rit' }, g.zonderRit.map((p) => h('div', { class: 'row', 'data-zonder': p.naam },
            h('span', { class: 'mee-tekst' }, h('span', { class: 'rij-naam' }, naamTekst(p)), plaatsTekst(p)),
            beheren() ? indeler(p) : null)))
          : h('p', { class: 't-small t-sec mee-leeg' }, 'Iedereen heeft een rit.')));
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'carpool' }, false);
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
