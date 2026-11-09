// Wie neemt wat mee (MEE-1 t/m MEE-4): spullen, uit eigen keuken en boodschappen met de namen van wie ze meeneemt.
// Ontwerp: docs/design/Meenemen.dc.html. Alle tekst, ook de ingevoerde itemnamen, gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../components/stappenbalk.js';
import { stelCategorieVoor } from '../../shared/categorieen.js';
import { editieKeuze, foutMelding } from './voortgang.js';

const PLUS = ['M12 5v14M5 12h14'];
const SLOT = ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const NAAM_MAX = 60;

// MEE-1: de drie secties in de volgorde van het ontwerp.
const SECTIES = [
  { soort: 'spullen', kop: 'Spullen', veld: 'Nieuw item', plaatshouder: 'Iets toevoegen' },
  { soort: 'keuken', kop: 'Uit eigen keuken', veld: 'Nieuw item uit je keuken', plaatshouder: 'Iets uit je keuken toevoegen', hint: 'Zonder naam gaat het op de boodschappenlijst.' },
  { soort: 'boodschap', kop: 'Boodschappen die iemand meeneemt', veld: 'Nieuwe boodschap', plaatshouder: 'Een boodschap toevoegen' },
];

export function maakMeenemen({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  let bevestig = ''; // id van het item waarvoor "Verwijderen" om bevestiging vraagt
  const wortel = h('section', { class: 'beheer meenemen' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Voorbereiding' : 'Voorbereiding'),
    h('h1', { class: 't-title' }, 'Wie neemt wat mee'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);

  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) bericht = tekst;
    bevestig = '';
    await laad();
  }

  // Na definitief kan niemand meer claimen of intrekken op boodschap- en keuken-items (§7.8.5).
  const dicht = (i) => g.alleenLezen || (g.definitief && i.soort !== 'spullen');

  function rij(i) {
    const mijn = i.claims.some((c) => c.ik);
    const chips = i.claims.length
      ? i.claims.map((c) => h('span', { class: 'mee-claim' },
        h('span', { class: `chip ${c.ik ? '' : 'chip-n'}`.trim() }, c.ik ? 'jij' : c.naam),
        g.organisator && !c.ik && !dicht(i)
          ? h('button', { class: 'btn btn-plain mee-weg', type: 'button', 'data-schrijft': true, 'aria-label': `Haal ${c.naam} bij ${i.naam} weg`,
            onclick: () => schrijf('claimIntrekken', { itemId: i.id, deelnemerId: c.deelnemerId }, `${c.naam} neemt ${i.naam} niet meer mee.`) }, '×')
          : null))
      : [h('span', { class: 't-small t-sec' }, 'nog niemand')];
    const mag = !dicht(i) && g.ik;
    const knoppen = [];
    if (mag) {
      knoppen.push(mijn
        ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Claim op ${i.naam} intrekken`,
          onclick: () => schrijf('claimIntrekken', { itemId: i.id }, `Je neemt ${i.naam} niet meer mee.`) }, 'Intrekken')
        : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Ik neem ${i.naam} mee`,
          onclick: () => schrijf('claimen', { itemId: i.id }, `Je neemt ${i.naam} mee.`) }, 'Ik neem mee'));
    }
    // AAN-26: een eigen item tot definitief, de organisator elk item.
    if ((i.eigen || g.organisator) && !g.definitief && !g.alleenLezen) {
      knoppen.push(bevestig === i.id
        ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `${i.naam} definitief verwijderen`,
          onclick: () => schrijf('itemVerwijderen', { id: i.id, versie: i.versie }, `${i.naam} is verwijderd.`) }, 'Ja, verwijderen')
        : h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `${i.naam} verwijderen`, onclick: () => { bevestig = i.id; teken(); } }, 'Verwijderen'));
    }
    return h('div', { class: 'row mee-rij', role: 'listitem', 'data-item': i.id },
      h('span', { class: 'mee-tekst' }, h('span', { class: 'rij-naam' }, i.naam), h('span', { class: 'mee-chips' }, chips)),
      knoppen.length ? h('span', { class: 'mee-knoppen' }, knoppen) : null);
  }

  // MEE-4: naam, soort (de sectie) en categorie; de categorie wordt voorgesteld volgens §7.8.3.
  function toevoeg(sectie) {
    const naam = h('input', { class: 'field', type: 'text', 'aria-label': sectie.veld, placeholder: sectie.plaatshouder, maxlength: String(NAAM_MAX), autocomplete: 'off', style: 'min-height:44px' });
    const cat = h('select', { class: 'field mee-cat', 'aria-label': `Categorie van ${sectie.veld.toLowerCase()}`, style: 'min-height:44px' }, g.categorieen.map((c) => h('option', { value: c }, c)));
    let eigenKeuze = false;
    cat.value = stelCategorieVoor('');
    cat.addEventListener('change', () => { eigenKeuze = true; });
    naam.addEventListener('input', () => { if (!eigenKeuze) cat.value = stelCategorieVoor(naam.value); });
    const voegToe = async () => {
      if (!naam.value.trim()) { melding.toon('Geef het item een naam.'); return; }
      await schrijf('itemOpslaan', { soort: sectie.soort, naam: naam.value, categorie: cat.value }, `${naam.value.trim()} staat op de lijst.`);
    };
    naam.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); voegToe(); } });
    return h('div', { class: 'row mee-nieuw' },
      h('span', { class: 'mee-velden' }, naam, sectie.soort === 'spullen' ? null : cat),
      h('button', { class: 'icon-btn mee-plus', type: 'button', 'data-schrijft': true, 'aria-label': `${sectie.veld} toevoegen`, onclick: voegToe }, icoon(PLUS, 20)));
  }

  function sectie(s) {
    const items = g.items.filter((i) => i.soort === s.soort);
    const dichtSectie = g.definitief && s.soort !== 'spullen';
    return h('section', { class: 'mee-sectie', 'aria-labelledby': `mee-${s.soort}` },
      h('h2', { class: 't-h3', id: `mee-${s.soort}` }, s.kop),
      dichtSectie ? h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Boodschappen zijn definitief. Claimen kan niet meer.')) : null,
      h('div', { class: 'solid list', role: 'list', 'aria-label': s.kop },
        items.length ? items.map(rij) : h('p', { class: 't-small t-sec mee-leeg' }, 'Nog niets op deze lijst.'),
        g.definitief || g.alleenLezen ? null : toevoeg(s)),
      s.hint ? h('p', { class: 'hint' }, s.hint) : null);
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    zet(
      kop('Zet erbij wat je meeneemt. Wat niemand claimt uit de keuken, gaat op de boodschappenlijst.'),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'mee-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de lijst nog lezen.') : null,
      !g.ik ? h('p', { class: 'hint' }, 'Je bent geen deelnemer van deze editie, dus je kunt niets claimen.') : null,
      SECTIES.map(sectie));
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'meenemen' }, false);
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
