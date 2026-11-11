// Posten met totalen per categorie en saldi (GELD-1, GELD-5 t/m GELD-7).
// Ontwerp: docs/design/Posten.dc.html. Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { kopMetHint } from '../components/hint.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { euro, categorieLabel } from '../../shared/geld.js';
import { datumKort } from '../../shared/datums.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { maakPostBewerken } from './post-bewerken.js';
import { maakAfrekenTabs } from '../components/tabs.js';

const PLUS = ['M12 5v14M5 12h14'];
const POTLOOD = ['M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'];
const BON = ['M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3'];
const SLOT = ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const WIJZE_TEKST = { gelijk: 'gelijk', aandeel: 'aandeel', bedrag: 'bedrag per persoon' };

export function maakPosten({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  const wortel = h('section', { class: 'beheer posten' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const naam = (id) => (g.deelnemers.find((d) => d.id === id) || {}).voornaam || '';

  function bewerk(post) {
    melding.toon('');
    zet(maakPostBewerken({
      g, post, anroep: async (actie, data, schrijft) => {
        const r = await anroep(actie, data, schrijft);
        if (!r) wortel.append(melding.el);
        return r;
      },
      bijKlaar: (tekst) => { bericht = tekst; laad(); },
      bijSluiten: () => teken(),
    }));
  }

  function postRij(p) {
    const wie = p.betalerId === g.ik ? 'Jij' : naam(p.betalerId);
    const mijn = p.aandelen[g.ik] || 0;
    const regel = `${wie} ${p.soort === 'uitgave' ? 'betaalde' : 'ontving'} · ${categorieLabel(p.categorie)} · ${WIJZE_TEKST[p.verdeling.wijze] || ''}`;
    return h('button', { class: 'row post-rij', type: 'button', onclick: () => bewerk(p) },
      h('span', { class: 'post-ico', 'aria-hidden': 'true' }, icoon(BON, 20)),
      h('span', { class: 'rij-tekst' },
        h('span', { class: 'rij-naam' }, p.omschrijving),
        h('span', { class: 't-small t-sec' }, regel),
        h('span', { class: 't-small t-sec' }, `${datumKort(p.datum)} · jouw deel ${euro(mijn)}`),
        p.aangepastDoorOrganisator ? h('span', { class: 't-small t-sec post-aantekening' }, icoon(POTLOOD, 14), 'aangepast door de organisator') : null),
      h('span', { class: 't-num post-bedrag' }, `${p.soort === 'ontvangst' ? '-' : ''}${euro(p.bedrag)}`));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(h('h1', { class: 't-title' }, 'Uitgaven'), h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    const toevoegen = g.alleenLezen || !g.ik ? null
      : h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: () => bewerk(null) }, icoon(PLUS, 22), 'Uitgave toevoegen');
    zet(
      h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, STAPNAMEN.afrekenen), kopMetHint(h('h1', { class: 't-title' }, 'Uitgaven'), 'verdeling')),
      maakAfrekenTabs('posten', g.edities ? editieId : ''),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'po-editie'),
      melding.el, toast,
      // ACC-9: alleen de organisator ziet dit, zolang de verrassing niet onthuld is.
      g.verrassingGeheim ? h('p', { class: 'priv post-verrassing' }, icoon(SLOT, 16), h('span', {}, 'De accommodatie is nog een verrassing. Iedereen ziet de posten, dus een omschrijving met de naam van het huis kan haar verraden.')) : null,
      h('section', { class: 'glass card post-totaal' },
        h('div', {}, h('p', { class: 't-cap' }, 'Totaal'), h('p', { class: 't-h2 t-num' }, euro(g.totaal))),
        g.ik ? h('div', {}, h('p', { class: 't-cap' }, 'Jouw deel'), h('p', { class: 't-h2 t-num' }, euro(g.mijnDeel))) : null),
      toevoegen,
      g.posten.length
        ? h('div', { class: 'solid list', role: 'list', 'aria-label': 'Posten' }, g.posten.map((p) => h('div', { role: 'listitem' }, postRij(p))))
        : h('p', { class: 't-body t-sec' }, 'Nog geen posten.'),
      g.perCategorie.length ? h('section', { class: 'beheer-blok', 'aria-labelledby': 'po-cat' },
        h('h2', { class: 't-h3', id: 'po-cat' }, 'Per categorie'),
        h('div', { class: 'solid list' }, g.perCategorie.map((c) =>
          h('div', { class: 'row' }, h('span', { class: 'rij-naam' }, c.label), h('span', { class: 't-num post-bedrag' }, euro(c.bedrag)))))) : null,
      h('section', { class: 'beheer-blok', 'aria-labelledby': 'po-saldi' },
        h('h2', { class: 't-h3', id: 'po-saldi' }, 'Saldo'),
        h('p', { class: 't-small t-sec' }, 'Positief krijg je terug, negatief betaal je bij.'),
        h('div', { class: 'solid list' }, g.saldi.map((s) =>
          h('div', { class: 'row', 'data-saldo': s.id }, h('span', { class: 'rij-naam' }, s.id === g.ik ? `${s.voornaam} (jij)` : s.voornaam),
            h('span', { class: `t-num post-bedrag ${s.saldo > 0 ? 'plus' : s.saldo < 0 ? 'min' : ''}` }, euro(s.saldo)))))));
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'posten' }, false);
    if (!r) { teken(); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
