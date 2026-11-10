// Boodschappenlijst (MEE-5 t/m MEE-9): op supermarktvolgorde, gedeeld afvinken, definitief en kopiëren als tekst.
// Ontwerp: docs/design/Boodschappen.dc.html. Alle tekst, ook de itemnamen, gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { kopMetHint } from '../components/hint.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { kopieer } from '../delen.js';
import { boodschappenLijst, kopieerTekst, personenTekst, tellingenBij, voortgang } from '../../shared/boodschappen.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { maakStand, pasItemsToe, ITEM_ACTIES } from '../stand.js';

const SLOT = ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const KOPIE = ['M9 9h10v11H9z', 'M5 15V4h10'];

export function maakBoodschappen({ sessie, params = {}, wachtrij, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  const wortel = h('section', { class: 'beheer boodschappen' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub, chip) => h('header', { class: 'wz-kop bd-kop' },
    h('div', {}, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Voorbereiding' : 'Voorbereiding'),
      kopMetHint(h('h1', { class: 't-title' }, 'Boodschappen'), 'boodschappen'), sub ? h('p', { class: 't-body t-sec' }, sub) : null), chip);

  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) bericht = tekst;
    await laad();
  }

  // SYNC-1: afvinken staat direct in beeld en gaat via de wachtrij (de laatste klik wint).
  const stand = maakStand({
    wachtrij, toepassen: pasItemsToe, hoort: (a) => a.editieId === editieId && ITEM_ACTIES.includes(a.actie),
    levend: () => wortel.isConnected,
    bijWijziging: (zicht) => { if (zicht) { g = zicht; teken(); } },
  });

  // MEE-9: de tellingen uit eten en drinken staan als label bij het item.
  function rij(i) {
    const tellingen = tellingenBij(i.naam, g.wensen);
    const vink = h('input', { type: 'checkbox', 'aria-label': i.naam, disabled: g.alleenLezen,
      onchange: (e) => stand.zet('afvinken', { itemId: i.id, afgevinkt: e.target.checked }, { sleutel: `vink:${i.id}`, editieId }) });
    vink.checked = i.afgevinkt;
    return h('label', { class: 'vink', 'data-item': i.id },
      vink,
      h('span', { class: i.afgevinkt ? 'bd-naam klaar' : 'bd-naam' }, i.naam),
      i.maaltijd ? h('span', { class: 'tag', 'data-maaltijd': true }, i.maaltijd) : null, // KOK-3
      tellingen.map((t) => h('span', { class: 'tag tag-acc' }, `${t.label}: ${personenTekst(t.aantal)}`)),
      i.soort === 'keuken' ? h('span', { class: 'tag' }, 'uit eigen keuken, geen naam') : null);
  }

  function categorie(groep, n) {
    return h('section', { class: 'mee-sectie', 'aria-labelledby': `bd-${n}` },
      h('h2', { class: 't-cap', id: `bd-${n}` }, groep.categorie),
      h('div', { class: 'solid list', role: 'list', 'aria-label': groep.categorie }, groep.items.map(rij)));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    const actief = document.activeElement && wortel.contains(document.activeElement) ? document.activeElement.closest('[data-item]') : null;
    const focusItem = actief ? actief.getAttribute('data-item') : '';
    const groepen = boodschappenLijst(g.items);
    const { klaar, totaal } = voortgang(groepen);
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    const status = h('span', { class: 'hint', role: 'status' });
    const kopieerKnop = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: async () => {
      status.textContent = (await kopieer(kopieerTekst(groepen))) ? 'Gekopieerd.' : 'Kopiëren lukte niet, selecteer de tekst zelf.';
    } }, icoon(KOPIE, 18), 'Kopieer als tekst');
    const chip = g.definitief ? h('span', { class: 'chip chip-n' }, icoon(SLOT, 14), 'Definitief') : null;
    // MEE-6, §7.8.5: alleen de organisator zet de lijst definitief of draait dat terug.
    const wissel = g.organisator && !g.alleenLezen
      ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true,
        onclick: () => schrijf('boodschappenDefinitief', { definitief: !g.definitief }, g.definitief ? 'De lijst is niet meer definitief.' : 'De lijst is definitief.') },
      g.definitief ? 'Definitief terugdraaien' : 'Lijst definitief maken')
      : null;
    zet(
      kop(g.definitief ? 'De lijst is definitief. Afvinken kan nog.' : 'Wat niemand meeneemt, koop je hier.', chip),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'bd-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de lijst nog lezen.') : null,
      h('section', { class: 'glass panel bd-balk' },
        h('span', { class: 'bd-voortgang' }, h('span', { class: 't-num bd-getal' }, `${klaar} van ${totaal}`), ' ', h('span', { class: 't-sec' }, 'afgevinkt')),
        kopieerKnop, status),
      wissel,
      groepen.length ? groepen.map(categorie) : h('p', { class: 't-small t-sec mee-leeg' }, 'Er staat nog niets op de lijst.'),
      g.definitief ? null : h('p', { class: 'hint' }, h('a', { href: '#/meenemen' }, 'Een boodschap toevoegen'), ' kan bij Wie neemt wat mee.'));
    const terug = focusItem ? [...wortel.querySelectorAll('[data-item]')].find((x) => x.getAttribute('data-item') === focusItem) : null;
    if (terug && terug.querySelector('input')) terug.querySelector('input').focus();
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'meenemen' }, false);
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    if (r.editie) editieId = r.editie.id;
    g = stand.zetBevestigd(r);
    teken();
  }

  // §7.16.4: terug op het tabblad haalt het scherm de lijst opnieuw op.
  const bijZicht = () => { if (!wortel.isConnected && g) { document.removeEventListener('visibilitychange', bijZicht); return; } if (document.visibilityState === 'visible' && g) laad(); };
  document.addEventListener('visibilitychange', bijZicht);

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
