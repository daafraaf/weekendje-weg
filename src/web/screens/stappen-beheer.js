// Stappen van een editie beheren (EDI-7, EDI-10, DDL-1): stap vooruit of terug met daarna de WhatsApp-tekst
// van de nieuwe stap en de deadline verlengen (de enige datum; die van de stappen zijn vervallen). Alle tekst gaat via textContent (NFR-5).
// STA-8: de stappenbalk staat in de schil en leest de editie uit de Sheet; na een stapwijziging vraagt bijStap hem opnieuw op.
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { deelKnoppen } from '../delen.js';
import { STAPNAMEN, volgendeStap, vorigeStap } from '../../shared/stappen.js';
import { datumLang } from '../../shared/datums.js';
import { deadlineIso } from '../../shared/editie.js';
import { stapTekst } from '../../shared/whatsapp.js';
import { editieKeuze, foutMelding } from './voortgang.js';

const VOORUIT = 'm9.5 6 6 6-6 6';
const TERUG = 'm14.5 6-6 6 6 6';

export function maakStappenBeheer({ sessie, params = {}, bijVerlopen, bijStap = () => {}, fetchFn }) {
  let gegevens = null;
  let editieId = params.editie || '';
  let gedeeld = null; // { stap, tekst } na een stapwijziging
  let bericht = '';

  const wortel = h('section', { class: 'beheer stappen-beheer' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const editie = () => gegevens.edities.find((e) => e.id === editieId);
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));

  async function laad() {
    const r = await anroep('scherm', { naam: 'beheer' }, false);
    if (!r) return;
    gegevens = r;
    if (!gegevens.edities.some((e) => e.id === editieId)) editieId = gegevens.edities.length ? gegevens.edities[gegevens.edities.length - 1].id : '';
    teken();
  }

  // EDI-7: na elke stapwijziging verschijnt de tekst van de nieuwe stap.
  async function zetStap(stap) {
    melding.toon('');
    const r = await anroep('stapZetten', { stap }, true);
    if (!r) return;
    gedeeld = { stap: r.editie.stap, tekst: stapTekst({ editieTitel: r.editie.titel, stap: r.editie.stap, deadline: r.editie.deadline }) };
    bericht = '';
    bijStap();
    await laad();
  }

  async function bijwerken(data, klaar) {
    melding.toon('');
    const r = await anroep('editieBijwerken', data, true);
    if (!r) return;
    bericht = klaar;
    bijStap();
    await laad();
  }

  function stapKnoppen(e) {
    if (e.stap === 'afgerond') return h('p', { class: 't-small t-sec' }, 'De editie is afgerond en staat nu vast.');
    const verder = volgendeStap(e.stap);
    const terug = vorigeStap(e.stap);
    return h('div', { class: 'beheer-blok' },
      verder ? h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: () => zetStap(verder) }, `Naar ${STAPNAMEN[verder]}`, icoon(VOORUIT)) : null,
      verder === 'overzicht' ? h('p', { class: 'hint' }, `Naar ${STAPNAMEN.overzicht} sluit het invullen, ook als de deadline nog niet voorbij is.`) : null,
      terug ? h('button', { class: 'btn btn-ghost', type: 'button', 'data-schrijft': true, onclick: () => zetStap(terug) }, icoon(TERUG), `Terug naar ${STAPNAMEN[terug]}`) : null,
      e.stap === 'accommodatie' ? h('p', { class: 'hint' }, 'Terug naar Invullen kan vanaf hier niet meer.') : null);
  }

  // EDI-10: verlengen zolang de stap Invullen is.
  function deadline(e) {
    if (e.stap !== 'invullen') return null;
    const el = h('input', { id: 'st-deadline', class: 'field', type: 'date' });
    el.value = e.deadline ? e.deadline.slice(0, 10) : '';
    return h('section', { class: 'solid panel beheer-blok', 'aria-labelledby': 'st-dl' },
      h('h2', { class: 't-h3', id: 'st-dl' }, 'Deadline'),
      h('p', { class: 't-small t-sec' }, e.deadline ? `Invullen kan nu tot ${datumLang(e.deadline.slice(0, 10))}, 23:59.` : 'Nog geen deadline.'),
      h('div', {}, h('label', { class: 'label', for: el.id }, 'Nieuwe deadline'), el),
      h('div', { class: 'dl-knoppen' }, h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true,
        onclick: () => { if (!el.value) { melding.toon('Kies een nieuwe deadline.'); return; } bijwerken({ deadline: deadlineIso(el.value) }, 'De deadline is verlengd.'); } }, 'Deadline verlengen')));
  }

  function teken() {
    const kop = h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Stappen'));
    if (!gegevens.edities.length) {
      zet(kop, melding.el, h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.'), h('a', { class: 'btn btn-primary', href: '#/editie-nieuw' }, 'Nieuwe editie maken'));
      return;
    }
    const e = editie();
    const tekstKaart = gedeeld && gedeeld.stap === e.stap ? h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'st-wa' },
      h('h2', { class: 't-h3', id: 'st-wa' }, `Bericht voor de groep: ${STAPNAMEN[e.stap]}`),
      h('div', { class: 'solid panel' }, h('p', { class: 't-body wa-tekst' }, gedeeld.tekst)),
      deelKnoppen({ tekst: gedeeld.tekst, soort: 'Stapbericht', naam: 'de groep' })) : null;
    zet(
      kop,
      editieKeuze(gegevens.edities, editieId, (id) => { editieId = id; gedeeld = null; bericht = ''; teken(); }, 'st-editie'),
      melding.el,
      bericht ? h('p', { class: 't-small t-sec', role: 'status' }, bericht) : null,
      tekstKaart,
      h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'st-nu' },
        h('h2', { class: 't-h3', id: 'st-nu' }, `Nu: ${STAPNAMEN[e.stap]}`),
        stapKnoppen(e)),
      deadline(e));
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
