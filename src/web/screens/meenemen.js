// Wie neemt wat mee (MEE-1 t/m MEE-4): spullen, uit eigen keuken en boodschappen met de namen van wie ze meeneemt.
// Ontwerp: docs/design/Meenemen.dc.html. Alle tekst, ook de ingevoerde itemnamen, gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { kopMetHint } from '../components/hint.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { stelCategorieVoor } from '../../shared/categorieen.js';
import { onderdeelAan } from '../../shared/onderdelen.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { maakStand, pasItemsToe, ITEM_ACTIES } from '../stand.js';

const PLUS = ['M12 5v14M5 12h14'];
const SLOT = ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const NAAM_MAX = 60;

// MEE-1: de drie secties in de volgorde van het ontwerp. OND-2: de sectie Boodschappen (en wat naar de lijst verwijst) valt weg
// zolang het onderdeel Boodschappen uitstaat.
const sectiesVan = (vlaggen) => (onderdeelAan('boodschappen', vlaggen) ? [
  { soort: 'spullen', kop: 'Spullen', veld: 'Nieuw item', plaatshouder: 'Iets toevoegen' },
  { soort: 'keuken', kop: 'Uit eigen keuken', veld: 'Nieuw item uit je keuken', plaatshouder: 'Iets uit je keuken toevoegen', hint: 'Zonder naam gaat het op de boodschappenlijst.' },
  { soort: 'boodschap', kop: 'Boodschappen die iemand meeneemt', veld: 'Nieuwe boodschap', plaatshouder: 'Een boodschap toevoegen' },
] : [
  { soort: 'spullen', kop: 'Spullen', veld: 'Nieuw item', plaatshouder: 'Iets toevoegen' },
  { soort: 'keuken', kop: 'Uit eigen keuken', veld: 'Nieuw item uit je keuken', plaatshouder: 'Iets uit je keuken toevoegen' },
]);
const SECTIES = sectiesVan();

export function maakMeenemen({ sessie, params = {}, wachtrij, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  let bevestig = ''; // id van het item waarvoor "Verwijderen" om bevestiging vraagt
  const wortel = h('section', { class: 'beheer meenemen' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Voorbereiding' : 'Voorbereiding'),
    kopMetHint(h('h1', { class: 't-title' }, 'Wie neemt wat mee'), 'meenemen'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);

  // Grote acties (item toevoegen of verwijderen) wachten op de Sheet met de bezig-status op de knop (SYNC-8).
  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) bericht = tekst;
    bevestig = '';
    await laad();
  }

  // SYNC-1: claimen en intrekken staan direct in beeld en gaan via de wachtrij; geen lader, geen melding per klik.
  const stand = maakStand({
    wachtrij, toepassen: pasItemsToe, hoort: (a) => a.editieId === editieId && ITEM_ACTIES.includes(a.actie),
    levend: () => wortel.isConnected,
    bijWijziging: (zicht) => { if (zicht) { g = zicht; teken(); } },
  });
  function klein(actie, data) {
    const wie = data.deelnemerId || 'ik';
    stand.zet(actie, data, { sleutel: `claim:${data.itemId}:${wie}`, editieId });
  }

  // Na definitief kan niemand meer claimen of intrekken op boodschap- en keuken-items (§7.8.5).
  const dicht = (i) => g.alleenLezen || (g.definitief && i.soort !== 'spullen');

  function rij(i) {
    const mijn = i.claims.some((c) => c.ik);
    const chips = i.claims.length
      ? i.claims.map((c) => h('span', { class: 'mee-claim' },
        h('span', { class: `chip ${c.ik ? '' : 'chip-n'}`.trim() }, c.ik ? 'jij' : c.naam),
        g.organisator && !c.ik && !dicht(i)
          ? h('button', { class: 'btn btn-plain mee-weg', type: 'button', 'aria-label': `Haal ${c.naam} bij ${i.naam} weg`,
            onclick: () => klein('claimIntrekken', { itemId: i.id, deelnemerId: c.deelnemerId }) }, '×')
          : null))
      : [h('span', { class: 't-small t-sec' }, 'nog niemand')];
    const mag = !dicht(i) && g.ik;
    const knoppen = [];
    if (mag) {
      knoppen.push(mijn
        ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `Claim op ${i.naam} intrekken`,
          onclick: () => klein('claimIntrekken', { itemId: i.id }) }, 'Intrekken')
        : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'aria-label': `Ik neem ${i.naam} mee`,
          onclick: () => klein('claimen', { itemId: i.id }) }, 'Ik neem mee'));
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
    // Na opnieuw tekenen blijft de focus in dezelfde rij, zodat het toetsenbord niet terug naar boven springt.
    const actief = document.activeElement && wortel.contains(document.activeElement) ? document.activeElement.closest('[data-item]') : null;
    const focusItem = actief ? actief.getAttribute('data-item') : '';
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    zet(
      kop(onderdeelAan('boodschappen') ? 'Zet erbij wat je meeneemt. Wat niemand claimt uit de keuken, gaat op de boodschappenlijst.' : 'Zet erbij wat je meeneemt.'),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'mee-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de lijst nog lezen.') : null,
      !g.ik ? h('p', { class: 'hint' }, 'Je bent geen deelnemer van deze editie, dus je kunt niets claimen.') : null,
      SECTIES.map(sectie));
    if (focusItem) {
      const knop = [...wortel.querySelectorAll('[data-item]')].find((x) => x.getAttribute('data-item') === focusItem);
      const doel = knop && knop.querySelector('.mee-knoppen button');
      if (doel) doel.focus();
    }
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'meenemen' }, false);
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    if (r.editie) editieId = r.editie.id;
    g = stand.zetBevestigd(r);
    teken();
  }

  // §7.16.4: terug op het tabblad haalt het scherm de lijst opnieuw op; wat nog onderweg is, blijft erop staan.
  const bijZicht = () => { if (!wortel.isConnected && g) { document.removeEventListener('visibilitychange', bijZicht); return; } if (document.visibilityState === 'visible' && g) laad(); };
  document.addEventListener('visibilitychange', bijZicht);

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
