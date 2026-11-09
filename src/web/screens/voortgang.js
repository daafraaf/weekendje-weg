// Voortgang (OVZ-1, OVZ-2): wie heeft ingevuld, de deadline en voor de organisator de herinnering.
// Ontwerp: docs/design/Voortgang.dc.html. Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { deelKnoppen } from '../delen.js';
import { STAPNAMEN } from '../components/stappenbalk.js';
import { datumKort, datumLang } from '../../shared/datums.js';
import { herinneringTekst } from '../../shared/whatsapp.js';

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];

// Kiezer voor een organisator met meer edities; ook gebruikt door overzicht en detail.
export function editieKeuze(edities, editieId, bijKeuze, id = 'ed-keuze') {
  if (!edities || edities.length < 2) return null;
  const s = h('select', { id, class: 'field' }, edities.map((e) => h('option', { value: e.id }, e.titel)));
  s.value = editieId;
  s.addEventListener('change', () => bijKeuze(s.value));
  return h('div', {}, h('label', { class: 'label', for: id }, 'Editie'), s);
}

export function foutMelding() {
  const tekst = h('p', { class: 't-small' });
  const el = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), tekst);
  return { el, toon: (t) => { tekst.textContent = t || ''; el.hidden = !t; } };
}

export function maakVoortgang({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  const wortel = h('section', { class: 'beheer voortgang' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));

  function rij(d) {
    const status = d.afgehaakt ? 'Afgehaakt' : d.ingevuld ? (d.ingevuldOp ? `Ingevuld op ${datumKort(d.ingevuldOp.slice(0, 10))}` : 'Ingevuld') : 'Nog niet';
    return h('div', { class: `row${d.afgehaakt ? ' inactief' : ''}` },
      h('span', { class: 'av', 'aria-hidden': 'true' }, d.voornaam.slice(0, 1).toUpperCase()),
      h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, d.voornaam), h('span', { class: 't-small t-sec' }, status)),
      d.ingevuld
        ? h('span', { class: 'st st-ja', role: 'img', 'aria-label': 'ingevuld' }, '✓')
        : h('span', { class: 'st st-leeg', role: 'img', 'aria-label': 'niet ingevuld' }));
  }

  function teken(g) {
    if (!g.editie) { zet(h('h1', { class: 't-title' }, 'Voortgang'), h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.')); return; }
    editieId = g.editie.id;
    const meedoen = g.deelnemers.filter((d) => !d.afgehaakt);
    const klaar = meedoen.filter((d) => d.ingevuld).length;
    const deadline = g.editie.deadline ? `, deadline ${datumLang(g.editie.deadline.slice(0, 10))}` : '';
    const nogNiet = meedoen.filter((d) => !d.ingevuld).map((d) => d.voornaam);
    let herinnering = null;
    // OVZ-2: alleen de organisator ziet de herinneringsknop; zinvol zolang er nog ingevuld kan worden.
    if (g.organisator && g.editie.stap === 'invullen') {
      const tekst = herinneringTekst({ editieTitel: g.editie.titel, namen: nogNiet, deadline: g.editie.deadline });
      herinnering = h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'vg-herinnering' },
        h('h2', { class: 't-h3', id: 'vg-herinnering' }, 'Herinnering'),
        h('div', { class: 'solid panel' }, h('p', { class: 't-body wa-tekst' }, tekst)),
        deelKnoppen({ tekst, soort: 'Herinnering', naam: 'de groep' }));
    }
    zet(
      h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, STAPNAMEN[g.editie.stap] || ''), h('h1', { class: 't-title' }, 'Wie heeft ingevuld'),
        h('p', { class: 't-body t-sec' }, `${klaar} van ${meedoen.length}${deadline}.`)),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'vg-editie'),
      melding.el,
      h('div', { class: 'solid list' }, g.deelnemers.map(rij)),
      herinnering);
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'voortgang' }, false);
    if (r) teken(r);
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
