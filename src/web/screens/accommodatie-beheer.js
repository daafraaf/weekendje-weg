// Accommodaties beheren (ACC-1, ACC-2, ACC-6 t/m ACC-14): weekend vastleggen, kiezen tussen Verrassing en Samen
// kiezen, opties toevoegen, wijzigen en verwijderen, de ranglijst, boeken en onthullen. Deze acties wachten op de
// Sheet met data-schrijft (SYNC-8). Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { DEELVORMEN, DEELVORM_NAMEN, ACC_GRENZEN, isHttpsLink, heleEuro, beddenTekst, beddenFout } from '../../shared/accommodatie.js';
import { invoerTekst, leesBedrag } from '../../shared/geld.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { siteLink, geboektPil, puntenBalk, gavenPil, opPunten } from './accommodaties.js';
import { maakWeekendKeuze } from '../components/weekendkeuze.js';

const PLUS = ['M12 5v14M5 12h14'];

export function maakAccommodatieBeheer({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || '';
  let g = null;
  let bericht = '';
  let berichtBijVorm = false; // het bericht hoort bij de deelvorm
  let vormBericht = '';
  let bewerk = null; // null, {} voor een nieuwe of de accommodatie die wordt gewijzigd
  let bevestig = ''; // id van de accommodatie waarvoor "Verwijderen" om bevestiging vraagt
  let onthullen = false; // "Verrassing onthullen" vraagt om bevestiging
  const wortel = h('section', { class: 'beheer accommodatie-beheer' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));

  async function schrijf(actie, data, tekst, bijOk) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (!r) return false;
    bericht = tekst;
    bevestig = '';
    onthullen = false;
    if (bijOk) bijOk();
    await laad();
    return true;
  }

  // ACC-1, ACC-7, §7.6.8: dezelfde knoppen en bevestiging als op Weekendje prikker (BV-01).
  const weekend = maakWeekendKeuze({ schrijf, teken: () => teken() });

  // ACC-8, ACC-13: Verrassing of Samen kiezen; wisselen kan tot er geboekt is, de voorkeuren blijven bewaard.
  function deelvormBlok() {
    const uitleg = {
      verrassing: 'Deelnemers zien geen naam, plaats of link tot jij onthult.',
      samen: 'Iedereen geeft een top 3. Wisselen kan tot je boekt; voorkeuren blijven bewaard.',
    };
    return h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'acc-vorm-kop' },
      h('h2', { class: 't-h3', id: 'acc-vorm-kop' }, 'Hoe kiezen we?'),
      h('div', { class: 'segm', role: 'group', 'aria-label': 'Hoe kiezen we?' }, DEELVORMEN.map((d) => h('button', { type: 'button', 'aria-pressed': String(g.deelvorm === d),
        disabled: g.alleenLezen || g.geboekt, 'data-schrijft': true,
        onclick: () => { if (g.deelvorm !== d) schrijf('deelvormZetten', { deelvorm: d }, `We kiezen nu: ${DEELVORM_NAMEN[d].toLowerCase()}.`, () => { berichtBijVorm = true; }); } }, DEELVORM_NAMEN[d]))),
      h('p', { class: 't-small t-sec' }, g.geboekt ? 'Er is geboekt. Wisselen kan alleen zolang er niets geboekt is.' : uitleg[g.deelvorm]),
      vormBericht ? h('p', { class: 'form-toast t-small', role: 'status' }, vormBericht) : null); // SYNC-8: bij de knoppen
  }

  // ACC-10: onthullen gebeurt nooit vanzelf, is definitief en vraagt een bevestiging. Kan in elke latere stap.
  function onthulBlok() {
    if (g.deelvorm !== 'verrassing') return null;
    const kaart = (...k) => h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'acc-onthul-kop' }, h('h2', { class: 't-h3', id: 'acc-onthul-kop' }, 'Onthullen'), ...k);
    if (g.onthuld) return kaart(h('p', { class: 't-body' }, '✓ Onthuld. Iedereen ziet naam, plaats en link.'));
    if (!g.geboekt) return kaart(h('p', { class: 't-small t-sec' }, 'Boek eerst een accommodatie. Daarna onthul je hem wanneer jij wilt, of nooit.'));
    if (!onthullen) {
      return kaart(h('p', { class: 't-small t-sec' }, `Nog geheim. Na onthullen zien alle ${g.aantal} deelnemers naam, plaats en link. Dat kun je niet terugdraaien.`),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { onthullen = true; teken(); } }, 'Verrassing onthullen'));
    }
    return h('div', { class: 'solid panel', role: 'group', 'aria-label': 'Verrassing onthullen' },
      h('p', { class: 't-body' }, 'Weet je zeker dat je de verrassing onthult? Iedereen ziet daarna waar jullie heen gaan, en dat blijft zo.'),
      h('div', { class: 'dl-knoppen' },
        h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: () => schrijf('verrassingOnthullen', {}, 'De verrassing is onthuld.') }, 'Ja, onthul'),
        h('button', { class: 'btn btn-plain', type: 'button', onclick: () => { onthullen = false; teken(); } }, 'Annuleren')));
  }

  function formulier() {
    const a = bewerk;
    const veld = (id, label, attrs = {}) => { const el = h('input', { id, class: 'field', type: 'text', ...attrs }); return { el, rij: h('div', {}, h('label', { class: 'label', for: id }, label), el) }; };
    const naam = veld('acc-naam', 'Naam', { maxlength: String(ACC_GRENZEN.naamMax), autocomplete: 'off' });
    const plaats = veld('acc-plaats', 'Plaats', { maxlength: String(ACC_GRENZEN.plaatsMax), autocomplete: 'off' });
    const link = veld('acc-link', 'Link (begint met https://)', { type: 'url', inputmode: 'url', maxlength: String(ACC_GRENZEN.linkMax), autocomplete: 'off' });
    const prijs = veld('acc-prijs', 'Totaalprijs in euro', { inputmode: 'decimal', autocomplete: 'off' });
    const notitie = h('textarea', { id: 'acc-notitie', class: 'field', maxlength: String(ACC_GRENZEN.notitieMax), rows: '3' });
    // ACC-14: optioneel; leeg betekent niet ingevuld.
    const bedden = veld('acc-bedden', 'Aantal bedden', { inputmode: 'numeric', autocomplete: 'off', maxlength: '2' });
    const kamers = veld('acc-kamers', 'Eigen kamers (kamers voor één persoon)', { inputmode: 'numeric', autocomplete: 'off', maxlength: '2' });
    bedden.el.value = Number.isInteger(a.bedden) ? String(a.bedden) : '';
    kamers.el.value = Number.isInteger(a.eigenKamers) ? String(a.eigenKamers) : '';
    const aantal = (el) => { const s = el.value.trim(); return s === '' ? null : /^\d{1,2}$/.test(s) ? Number(s) : NaN; };
    naam.el.value = a.naam || '';
    plaats.el.value = a.plaats || '';
    link.el.value = a.link || '';
    prijs.el.value = a.prijsTotaal ? invoerTekst(a.prijsTotaal) : '';
    notitie.value = a.notitie || '';
    const opslaan = async () => {
      melding.toon('');
      const totaal = prijs.el.value.trim() ? leesBedrag(prijs.el.value) : 0;
      if (!naam.el.value.trim()) { melding.toon('Geef de accommodatie een naam.'); return; }
      if (link.el.value.trim() && !isHttpsLink(link.el.value.trim())) { melding.toon('Een link begint met https://.'); return; }
      if (totaal === null) { melding.toon('Vul de totaalprijs in als bedrag, bijvoorbeeld 1380.'); return; }
      const b = aantal(bedden.el), k = aantal(kamers.el);
      const fout = beddenFout(Number.isNaN(b) ? -1 : b, Number.isNaN(k) ? -1 : k);
      if (fout) { melding.toon(fout); return; }
      const data = { naam: naam.el.value, plaats: plaats.el.value, link: link.el.value, prijsTotaal: totaal, notitie: notitie.value };
      if (b !== null) data.bedden = b;
      if (k !== null) data.eigenKamers = k;
      if (a.id) { data.id = a.id; data.versie = a.versie; }
      await schrijf('accommodatieOpslaan', data, a.id ? 'De accommodatie is gewijzigd.' : 'De accommodatie is toegevoegd.', () => { bewerk = null; });
    };
    return h('section', { class: 'solid panel beheer-blok', 'aria-labelledby': 'acc-form-kop' },
      h('h2', { class: 't-h3', id: 'acc-form-kop' }, a.id ? 'Optie wijzigen' : 'Optie toevoegen'),
      naam.rij, plaats.rij, link.rij, prijs.rij, bedden.rij, kamers.rij,
      h('div', {}, h('label', { class: 'label', for: 'acc-notitie' }, 'Notitie'), notitie),
      h('div', { class: 'dl-knoppen' },
        h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: opslaan }, 'Opslaan'),
        h('button', { class: 'btn btn-plain', type: 'button', onclick: () => { bewerk = null; melding.toon(''); teken(); } }, 'Annuleren')));
  }

  // ACC-12: per optie de punten, een balk en het aantal mensen; ACC-13: Boeken, Wijzigen en Verwijderen.
  function rij(a, plek, max) {
    const geboekt = a.id === g.geboektId;
    const samen = g.deelvorm === 'samen';
    const knoppen = [];
    if (!g.alleenLezen) {
      if (!geboekt) knoppen.push(h('button', { class: `btn ${plek === 1 && samen && !g.geboekt ? 'btn-primary' : 'btn-ghost'} btn-sm`, type: 'button', 'data-schrijft': true, 'aria-label': `Boek ${a.naam}`,
        onclick: () => schrijf('accommodatieBoeken', { accommodatieId: a.id }, `✓ ${a.naam} is geboekt.`) }, 'Boeken'));
      knoppen.push(h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `${a.naam} wijzigen`, onclick: () => { bewerk = a; bevestig = ''; teken(); } }, 'Wijzigen'));
      knoppen.push(bevestig === a.id
        ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `${a.naam} definitief verwijderen`,
          onclick: () => schrijf('accommodatieVerwijderen', { id: a.id, versie: a.versie }, geboekt ? `${a.naam} is verwijderd. Er is nog geen accommodatie gekozen.` : `${a.naam} is verwijderd.`) }, 'Ja, verwijderen')
        : h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `${a.naam} verwijderen`, onclick: () => { bevestig = a.id; teken(); } }, 'Verwijderen'));
    }
    const meta = [a.plaats, a.prijsTotaal > 0 ? heleEuro(a.prijsTotaal) : '', samen ? (a.mensen === 1 ? '1 persoon' : `${a.mensen} mensen`) : '', beddenTekst(a)].filter(Boolean).join(' · ');
    return h('article', { class: 'glass card acc-kaart', 'data-accommodatie': a.id },
      h('div', { class: 'acc-kop' },
        h('h3', { class: 't-h3' }, samen ? `${plek}. ${a.naam}` : a.naam),
        geboekt ? geboektPil() : samen ? h('span', { class: 't-num acc-pt' }, `${a.punten} pt`) : null),
      meta ? h('p', { class: 't-small t-sec' }, meta) : null,
      samen ? puntenBalk(a.punten, max) : null,
      a.notitie ? h('p', { class: 't-small' }, a.notitie) : null,
      bevestig === a.id && geboekt ? h('p', { class: 't-small' }, 'Dit is de geboekte. Na verwijderen is er weer geen accommodatie gekozen en vervallen de voorkeuren ervoor.') : null,
      bevestig === a.id && !geboekt && samen && a.mensen ? h('p', { class: 't-small' }, 'De voorkeuren voor deze optie vervallen.') : null,
      h('div', { class: 'acc-acties' }, siteLink(a)),
      h('div', { class: 'af-knoppen' }, knoppen));
  }

  function lijstBlok() {
    const samen = g.deelvorm === 'samen';
    const lijst = samen ? opPunten(g.accommodaties) : g.accommodaties;
    const max = Math.max(0, ...lijst.map((a) => a.punten));
    return h('section', { class: 'beheer-blok', 'aria-labelledby': 'acc-lijst-kop' },
      h('div', { class: 'acc-kop' }, h('h2', { class: 't-h3 acc-lijstkop', id: 'acc-lijst-kop' }, samen ? 'Ranglijst' : 'Jouw opties'), samen && lijst.length ? gavenPil(g) : null),
      lijst.length ? lijst.map((a, n) => rij(a, n + 1, max)) : h('p', { class: 't-body t-sec' }, 'Nog geen opties.'));
  }

  function teken() {
    if (!g) return;
    const titel = h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Accommodaties'));
    if (!g.editie) { zet(titel, melding.el, h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.'), h('a', { class: 'btn btn-primary', href: '#/editie-nieuw' }, 'Nieuwe editie maken')); return; }
    // SYNC-8, BV-35: de bevestiging van de deelvorm staat in het blok Hoe kiezen we?, de rest bovenaan.
    vormBericht = berichtBijVorm ? bericht : '';
    const toast = bericht && !berichtBijVorm ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    berichtBijVorm = false;
    zet(
      titel,
      h('p', { class: 't-small t-sec' }, STAPNAMEN[g.editie.stap] ? `Nu: ${STAPNAMEN[g.editie.stap]}` : ''),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; weekend.reset(); bewerk = null; bevestig = ''; onthullen = false; laad(); }, 'accb-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt niets meer wijzigen.') : null,
      weekend.blok(g),
      deelvormBlok(),
      lijstBlok(),
      bewerk ? formulier() : (g.alleenLezen ? null : h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { bewerk = {}; teken(); } }, icoon(PLUS, 20), 'Optie toevoegen')),
      onthulBlok(),
      h('a', { class: 'btn btn-ghost', href: `#/accommodaties?editie=${encodeURIComponent(editieId)}` }, 'Zo ziet de groep het'));
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'accommodaties' }, false);
    if (!r) { if (!g) zet(h('p', { class: 't-body t-sec' }, 'Laden mislukt.'), melding.el); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
