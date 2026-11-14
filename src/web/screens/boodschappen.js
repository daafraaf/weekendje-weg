// Boodschappen, de tweede tab onder Meenemen (MEE-5 t/m MEE-9, MEE-11 t/m MEE-13): een wensenlijst op supermarktvolgorde.
// Leden zetten er zelf iets op, iedereen vinkt af, de organisator maakt de lijst definitief.
// Ontwerp: docs/design/Boodschappen.dc.html, BoodschappenDicht.dc.html en T-BoodschappenWacht.dc.html.
// Alle tekst, ook de itemnamen, gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { kopMetHint } from '../components/hint.js';
import { maakMeeTabs } from '../components/tabs.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { CATEGORIEEN, stelCategorieVoor } from '../../shared/categorieen.js';
import { kopieer } from '../delen.js';
import { boodschappenLijst, kopieerTekst, personenTekst, tellingenBij, voortgang } from '../../shared/boodschappen.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { weekendLang } from './overzicht.js';
import { maakStand, pasItemsToe, ITEM_ACTIES, NIEUW_ITEM, boodschapSleutel } from '../stand.js';

const SLOT = ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const KOPIE = ['M9 9h10v11H9z', 'M5 15V4h10'];
const KALENDER = ['M6.5 5h11a3 3 0 0 1 3 3v9.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3', 'M3.5 10h17M8 3v4M16 3v4'];
const PLUS = ['M12 5v14M5 12h14'];
const WEG = ['M6 6l12 12M18 6 6 18'];
const NAAM_MAX = 60;

export function maakBoodschappen({ sessie, params = {}, wachtrij, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  const wortel = h('section', { class: 'beheer boodschappen' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat(Infinity).filter((x) => x != null && x !== false));
  // NAV-15: het bovenschrift is de schermnaam van het menu-item, Meenemen.
  const kop = (sub, chip) => h('header', { class: 'wz-kop bd-kop' },
    h('div', {}, h('p', { class: 't-cap' }, STAPNAMEN.voorbereiding),
      kopMetHint(h('h1', { class: 't-title' }, 'Boodschappen'), 'boodschappen'), sub ? h('p', { class: 't-body t-sec' }, sub) : null), chip);

  // Grote acties (weghalen, definitief) wachten op de Sheet met de bezig-status op de knop (SYNC-8).
  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) bericht = tekst;
    await laad();
  }

  // MEE-12: het invoerblok blijft hetzelfde element, zodat wat je typt blijft staan als de lijst opnieuw tekent.
  const naamVeld = h('input', { class: 'field', id: 'bd-naam', type: 'text', maxlength: String(NAAM_MAX), autocomplete: 'off', placeholder: 'Bijvoorbeeld speciaalbier' });
  const catVeld = h('select', { class: 'field', id: 'bd-cat' }, CATEGORIEEN.map((c) => h('option', { value: c }, c)));
  const catHint = h('p', { class: 'hint' });
  const invoerStatus = h('p', { class: 'form-toast t-small', role: 'status', hidden: true });
  let eigenKeuze = false;
  const stelVoor = () => {
    if (!eigenKeuze) catVeld.value = stelCategorieVoor(naamVeld.value);
    catHint.textContent = naamVeld.value.trim() && !eigenKeuze ? 'Voorgesteld op basis van de naam.' : '';
  };
  const meld = (t) => { invoerStatus.textContent = t || ''; invoerStatus.hidden = !t; };
  naamVeld.addEventListener('input', () => { meld(''); stelVoor(); });
  catVeld.addEventListener('change', () => { eigenKeuze = true; catHint.textContent = ''; });
  // AAN-83: toevoegen is een kleine handeling; het item staat direct op de lijst en gaat via de wachtrij.
  function voegToe() {
    const naam = naamVeld.value.trim().replace(/\s+/g, ' ');
    if (!naam) { meld('Geef de boodschap een naam.'); naamVeld.focus(); return; }
    stand.zet('boodschapToevoegen', { naam, categorie: catVeld.value }, { sleutel: `boodschap:${boodschapSleutel(naam)}`, editieId });
    naamVeld.value = '';
    eigenKeuze = false;
    stelVoor();
    meld(`${naam} staat op de lijst.`);
    naamVeld.focus();
  }
  stelVoor();
  naamVeld.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); voegToe(); } });
  const invoer = h('section', { class: 'glass card bd-invoer', 'aria-labelledby': 'bd-invoer-kop' },
    h('h2', { class: 't-h3', id: 'bd-invoer-kop' }, 'Zet iets op de lijst'),
    h('p', { class: 't-small t-sec' }, 'Speciaalbier, je favoriete chips, iets voor het ontbijt. Wat niemand meeneemt, wordt gekocht.'),
    h('div', {}, h('label', { class: 'label', for: 'bd-naam' }, 'Boodschap'), naamVeld),
    h('div', {}, h('label', { class: 'label', for: 'bd-cat' }, 'Categorie'), catVeld, catHint),
    h('button', { class: 'btn btn-primary', type: 'button', onclick: voegToe }, icoon(PLUS, 20), 'Op de lijst'),
    invoerStatus);

  // SYNC-1: afvinken en toevoegen staan direct in beeld en gaan via de wachtrij (de laatste klik wint).
  const stand = maakStand({
    wachtrij, toepassen: pasItemsToe, hoort: (a) => a.editieId === editieId && ITEM_ACTIES.includes(a.actie),
    levend: () => wortel.isConnected,
    bijWijziging: (zicht, e) => {
      const nieuw = e && (e.acties || []).some((a) => a.actie === 'boodschapToevoegen');
      // Een bevestigde boodschap krijgt zijn echte id en versie uit de Sheet; een weigering (`gesloten`) meldt het rustig.
      if (nieuw && e.soort === 'bevestigd') { laad(); return; }
      if (nieuw && e.soort === 'teruggedraaid') meld(e.melding || 'Niet op de lijst gezet.');
      if (zicht) { g = zicht; teken(); }
    },
  });

  // MEE-9, MEE-12: bij elk item wie hem toevoegde ("jij" voor jezelf) of "uit eigen keuken", en de tellingen uit eten en drinken.
  function rij(i) {
    const voorlopig = i.id.startsWith(NIEUW_ITEM);
    const tellingen = tellingenBij(i.naam, g.wensen);
    const vink = h('input', { type: 'checkbox', 'aria-label': i.naam, disabled: g.alleenLezen || voorlopig,
      onchange: (e) => stand.zet('afvinken', { itemId: i.id, afgevinkt: e.target.checked }, { sleutel: `vink:${i.id}`, editieId }) });
    vink.checked = i.afgevinkt;
    const wie = i.soort === 'keuken' ? h('span', { class: 'tag' }, 'uit eigen keuken')
      : i.eigen ? h('span', { class: 't-small t-sec', 'data-door': true }, 'jij')
        : i.door ? h('span', { class: 't-small t-sec', 'data-door': true }, i.door) : null;
    // §7.8.4, AAN-26: je eigen boodschap haal je weg zolang de lijst open is; de organisator elke boodschap.
    const weg = i.soort === 'boodschap' && (i.eigen || g.organisator) && !g.definitief && !g.alleenLezen && !voorlopig
      ? h('button', { class: 'icon-btn', type: 'button', 'data-schrijft': true, 'aria-label': `${i.naam} weghalen`,
        onclick: () => schrijf('itemVerwijderen', { id: i.id, versie: i.versie }, `${i.naam} is van de lijst.`) }, icoon(WEG, 18))
      : null;
    return h('div', { class: 'vink bd-rij', 'data-item': i.id },
      h('label', { class: 'bd-vink' },
        vink,
        h('span', { class: 'bd-tekst' },
          h('span', { class: i.afgevinkt ? 'bd-naam klaar' : 'bd-naam' }, i.naam),
          h('span', { class: 'bd-labels' },
            wie,
            i.maaltijd ? h('span', { class: 'tag', 'data-maaltijd': true }, i.maaltijd) : null, // KOK-3
            tellingen.map((t) => h('span', { class: 'tag tag-acc' }, `${t.label}: ${personenTekst(t.aantal)}`))))),
      weg);
  }

  function categorie(groep, n) {
    return h('section', { class: 'mee-sectie', 'aria-labelledby': `bd-${n}` },
      h('h2', { class: 't-cap', id: `bd-${n}` }, groep.categorie),
      h('div', { class: 'solid list', role: 'list', 'aria-label': groep.categorie }, groep.items.map(rij)));
  }

  function teken() {
    if (!g) return;
    const tabs = maakMeeTabs('boodschappen', params.editie ? editieId : '');
    if (!g.editie) { zet(kop('Je hebt nog geen editie.'), tabs); return; }
    const actief = document.activeElement && wortel.contains(document.activeElement) ? document.activeElement : null;
    const focusItem = actief && actief.closest('[data-item]') ? actief.closest('[data-item]').getAttribute('data-item') : '';
    const groepen = boodschappenLijst(g.items);
    const { klaar, totaal } = voortgang(groepen);
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    // MEE-13, §7.8.11: zonder vastgelegd weekend geen invoer; na losmaken blijven de wensen staan die er al waren.
    const wacht = !g.vastgelegdWeekend;
    const wensen = g.items.some((i) => i.soort === 'boodschap');
    const open = !wacht && !g.definitief && !g.alleenLezen;
    const status = h('span', { class: 'hint', role: 'status' });
    const kopieerKnop = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: async () => {
      status.textContent = (await kopieer(kopieerTekst(groepen))) ? 'Gekopieerd.' : 'Kopiëren lukte niet, selecteer de tekst zelf.';
    } }, icoon(KOPIE, 18), 'Kopieer als tekst');
    const chip = g.definitief ? h('span', { class: 'chip chip-n' }, icoon(SLOT, 14), 'Definitief') : null;
    // MEE-6, §7.8.5: alleen de organisator zet de lijst definitief of draait dat terug.
    const wissel = g.organisator && !g.alleenLezen && !(wacht && !wensen)
      ? h('button', { class: g.definitief ? 'btn btn-ghost' : 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true,
        onclick: () => schrijf('boodschappenDefinitief', { definitief: !g.definitief }, g.definitief ? 'De lijst is niet meer definitief.' : 'De lijst is definitief.') },
      g.definitief ? 'Definitief terugdraaien' : 'Lijst definitief maken')
      : null;
    const sub = wacht ? null : `Voor ${weekendLang(g.vastgelegdWeekend)}.${g.definitief ? '' : ' Open tot de organisator de lijst definitief maakt.'}`;
    zet(
      kop(sub, chip),
      tabs,
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'bd-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de lijst nog lezen.') : null,
      wacht ? h('div', { class: 'glass panel bd-wacht', role: 'status' }, h('span', { class: 'bd-wacht-ico' }, icoon(KALENDER, 22)),
        h('div', {}, h('p', { class: 't-h3' }, 'Komt zodra het weekend vastligt'),
          h('p', { class: 't-body t-sec' }, wensen
            ? 'De lijst blijft staan. Iets toevoegen kan weer zodra er een nieuw weekend vastligt.'
            : 'Dan kun je hier je boodschappen op de lijst zetten, tot de organisator hem sluit.'))) : null,
      g.definitief ? h('div', { class: 'glass panel bd-wacht', role: 'status' }, h('span', { class: 'bd-wacht-ico' }, icoon(SLOT, 20)),
        h('p', { class: 't-small' }, 'De lijst is definitief. Toevoegen en claimen kan niet meer, afvinken kan nog.')) : null,
      wissel,
      open ? invoer : null,
      wacht && !wensen ? null : [
        h('section', { class: 'glass panel bd-balk' },
          h('span', { class: 'bd-voortgang' }, h('span', { class: 't-num bd-getal' }, `${klaar} van ${totaal}`), ' ', h('span', { class: 't-sec' }, 'afgevinkt')),
          kopieerKnop, status),
        groepen.length ? groepen.map(categorie) : h('p', { class: 't-small t-sec mee-leeg' }, 'Er staat nog niets op de lijst.'),
      ]);
    // Na opnieuw tekenen blijft de focus waar hij was: in het invoerblok of in dezelfde rij.
    if (actief && invoer.contains(actief) && invoer.isConnected) actief.focus();
    else if (focusItem) {
      const terug = [...wortel.querySelectorAll('[data-item]')].find((x) => x.getAttribute('data-item') === focusItem);
      if (terug && terug.querySelector('input')) terug.querySelector('input').focus();
    }
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
