// Afrekening (GELD-8 t/m GELD-11, EDI-9): wie betaalt wie, betalingen afvinken in rondes, betaalverzoek
// en voor de organisator afhaken. Ontwerp: docs/design/Afrekening.dc.html en D-Afrekening.dc.html.
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { deelKnoppen } from '../delen.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { euro } from '../../shared/geld.js';
import { betaalverzoekTekst } from '../../shared/whatsapp.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { maakAfrekenTabs } from '../components/tabs.js';

const VINK = ['m5 12.5 4.5 4.5L19 7.5'];
const SLOT = ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];

export function maakAfrekening({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  let verzoek = null; // de open betaling waarvoor het betaalverzoek open staat
  const wortel = h('section', { class: 'beheer afrekening' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const deelnemer = (id) => g.deelnemers.find((d) => d.id === id) || { voornaam: '' };
  const naam = (id) => deelnemer(id).voornaam;
  const wie = (id) => (id === g.ik ? 'Jij' : naam(id));

  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) bericht = tekst;
    verzoek = null;
    await laad();
  }

  const markeer = (b) => schrijf('betalingMarkeren', { vanId: b.vanId, naarId: b.naarId, bedrag: b.bedrag }, 'De betaling staat op betaald.');
  const terug = (b) => schrijf('betalingTerugdraaien', { id: b.id }, 'De betaling staat weer open.');

  function mijnKaart() {
    if (!g.ik) return null;
    const teBetalen = g.open.filter((b) => b.vanId === g.ik);
    if (teBetalen.length) {
      return teBetalen.map((b) => h('section', { class: 'glass card af-kaart', 'aria-label': `Jij betaalt ${naam(b.naarId)}` },
        h('p', { class: 't-cap' }, 'Jij betaalt'),
        h('p', { class: 't-display t-num' }, euro(b.bedrag)),
        h('p', { class: 't-body af-aan' }, 'aan ', h('span', { class: 'av av-sm', 'aria-hidden': 'true' }, naam(b.naarId).slice(0, 1).toUpperCase()), h('b', {}, naam(b.naarId))),
        b.magMarkeren ? h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: () => markeer(b) }, icoon(VINK, 20), 'Markeer als betaald') : null));
    }
    const krijgen = g.open.filter((b) => b.naarId === g.ik).reduce((s, b) => s + b.bedrag, 0);
    return h('section', { class: 'glass card af-kaart' },
      h('p', { class: 't-cap' }, krijgen ? 'Jij krijgt nog' : 'Jij'),
      krijgen ? h('p', { class: 't-display t-num' }, euro(krijgen)) : h('p', { class: 't-body' }, 'Je hoeft niets meer te betalen.'));
  }

  function betalingRij(b, betaald) {
    const knoppen = [];
    if (!betaald && !g.alleenLezen && b.naarId === g.ik) {
      knoppen.push(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'aria-label': `Betaalverzoek aan ${naam(b.vanId)}`,
        onclick: () => { verzoek = b; teken(); } }, 'Betaalverzoek'));
    }
    if (!betaald && b.magMarkeren) {
      knoppen.push(h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Betaling van ${naam(b.vanId)} aan ${naam(b.naarId)} betaald`, onclick: () => markeer(b) }, 'Betaald'));
    }
    if (betaald && b.magTerugdraaien) {
      knoppen.push(h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Betaling van ${naam(b.vanId)} aan ${naam(b.naarId)} terugdraaien`, onclick: () => terug(b) }, 'Terugdraaien'));
    }
    return h('div', { class: `row af-rij${betaald ? ' betaald' : ''}`, role: 'listitem', 'data-betaling': `${b.vanId}>${b.naarId}` },
      h('span', { class: 'rij-tekst' },
        h('span', { class: 'rij-naam' }, `${wie(b.vanId)} → ${wie(b.naarId)}`),
        deelnemer(b.vanId).afgehaakt ? h('span', { class: 't-small t-sec' }, 'afgehaakt, deelt in eerdere posten') : null),
      h('span', { class: 't-num post-bedrag af-bedrag' }, euro(b.bedrag)),
      betaald
        ? h('span', { class: 'af-status' }, h('span', { class: 'st st-ja st-sm', role: 'img', 'aria-label': 'betaald' }, '✓'), 'betaald')
        : h('span', { class: 'chip chip-n' }, 'open'),
      knoppen.length ? h('span', { class: 'af-knoppen' }, knoppen) : null);
  }

  function verzoekKaart() {
    if (!verzoek) return null;
    const tekst = betaalverzoekTekst({ bedrag: verzoek.bedrag, editieTitel: g.editie.titel });
    return h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'af-verzoek' },
      h('h2', { class: 't-h3', id: 'af-verzoek' }, `Betaalverzoek aan ${naam(verzoek.vanId)}`),
      h('div', { class: 'solid panel' }, h('p', { class: 't-body wa-tekst' }, tekst)),
      h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Zonder rekeningnummer. Dat spreek je zelf af.')),
      deelKnoppen({ tekst, soort: 'Betaalverzoek', naam: naam(verzoek.vanId) }));
  }

  // EDI-9: de organisator markeert afhaken en draait het terug.
  function afhakenBlok() {
    if (!g.organisator || g.alleenLezen) return null;
    return h('section', { class: 'beheer-blok', 'aria-labelledby': 'af-afhaken' },
      h('h2', { class: 't-h3', id: 'af-afhaken' }, 'Wie doet mee'),
      h('p', { class: 't-small t-sec' }, 'Wie afhaakt, blijft meebetalen aan de posten die al met hem gedeeld zijn. Nieuwe posten verdelen standaard zonder hem.'),
      h('div', { class: 'solid list' }, g.deelnemers.map((d) => h('div', { class: `row${d.afgehaakt ? ' inactief' : ''}`, 'data-deelnemer': d.id },
        h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, d.voornaam), h('span', { class: 't-small t-sec' }, d.afgehaakt ? 'afgehaakt' : 'doet mee')),
        h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': d.afgehaakt ? `${d.voornaam} doet weer mee` : `${d.voornaam} afhaken`,
          onclick: () => schrijf('afhakenMarkeren', { deelnemerId: d.id, afgehaakt: !d.afgehaakt }, d.afgehaakt ? `${d.voornaam} doet weer mee.` : `${d.voornaam} is afgehaakt.`) },
        d.afgehaakt ? 'Doet weer mee' : 'Afhaken')))));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(h('h1', { class: 't-title' }, 'Afrekening'), h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    const aantal = g.open.length + g.betaald.length;
    const betalingen = aantal
      ? h('section', { class: 'solid list', 'aria-labelledby': 'af-betalingen' },
        h('p', { class: 't-cap af-cap', id: 'af-betalingen' }, `Alle betalingen · ${g.betaald.length} van ${aantal} betaald`),
        h('div', { role: 'list', 'aria-label': 'Betalingen' }, g.open.map((b) => betalingRij(b, false)), g.betaald.map((b) => betalingRij(b, true))))
      : h('p', { class: 't-body t-sec' }, 'Er valt niets af te rekenen.');
    zet(
      h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, STAPNAMEN.afrekenen), h('h1', { class: 't-title' }, 'Eindafrekening')),
      maakAfrekenTabs('afrekening', g.edities ? editieId : ''),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; verzoek = null; laad(); }, 'af-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de afrekening nog lezen.') : null,
      mijnKaart(),
      betalingen,
      verzoekKaart(),
      h('section', { class: 'solid list', 'aria-labelledby': 'af-saldo' },
        h('p', { class: 't-cap af-cap', id: 'af-saldo' }, 'Saldo nu'),
        g.saldi.map((s) => h('div', { class: 'row', 'data-saldo': s.id },
          h('span', { class: 'rij-naam' }, s.id === g.ik ? `${s.voornaam} (jij)` : s.voornaam),
          h('span', { class: `t-num post-bedrag ${s.saldo > 0 ? 'plus' : s.saldo < 0 ? 'min' : ''}` }, euro(s.saldo))))),
      h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Rekeningnummers staan nooit in de app. Spreek die onderling af.')),
      afhakenBlok());
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'afrekening' }, false);
    if (!r) { teken(); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
