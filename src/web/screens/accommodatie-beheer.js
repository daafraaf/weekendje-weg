// Accommodaties beheren (ACC-1, ACC-2, ACC-3, ACC-5): weekend vastleggen, accommodaties toevoegen, wijzigen en
// verwijderen, de deelvorm kiezen en één accommodatie op geboekt zetten. Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { DEELVORMEN, DEELVORM_NAMEN, ACC_GRENZEN, isHttpsLink } from '../../shared/accommodatie.js';
import { invoerTekst, leesBedrag } from '../../shared/geld.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { weekendLang, weekendKort, tellers } from './overzicht.js';
import { prijsRegel, siteLink } from './accommodaties.js';

const VINK = ['m5 12.5 4.5 4.5L19 7.5'];
const PLUS = ['M12 5v14M5 12h14'];

export function maakAccommodatieBeheer({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || '';
  let g = null;
  let bericht = '';
  let bewerk = null; // null, {} voor een nieuwe of de accommodatie die wordt gewijzigd
  let bevestig = ''; // id van de accommodatie waarvoor "Verwijderen" om bevestiging vraagt
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
    if (bijOk) bijOk();
    await laad();
    return true;
  }

  const legVast = (vrijdag) => schrijf('weekendVastleggen', { vrijdag }, `Het weekend is vastgelegd: ${weekendLang(vrijdag)}.`);

  // ACC-1: vanuit de top 5 of uit alle weekenden van de periode (AAN-63).
  function weekendBlok() {
    const keuze = h('select', { id: 'acc-weekend', class: 'field' }, g.weekenden.map((w) => h('option', { value: w }, weekendLang(w))));
    if (g.vastgelegdWeekend) keuze.value = g.vastgelegdWeekend;
    return h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'acc-weekend-kop' },
      h('h2', { class: 't-h3', id: 'acc-weekend-kop' }, 'Weekend vastleggen'),
      g.vastgelegdWeekend ? h('p', { class: 't-body' }, 'Vastgelegd: ', h('b', {}, weekendLang(g.vastgelegdWeekend))) : h('p', { class: 't-small t-sec' }, 'Er is nog geen weekend vastgelegd.'),
      g.top.length ? h('div', { class: 'solid list', role: 'list', 'aria-label': 'Top weekenden' }, g.top.map((t) => h('div', { class: 'row', role: 'listitem' },
        h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, `${t.plek}. ${weekendKort(t.vrijdag)}`), tellers(t)),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, disabled: g.alleenLezen, 'aria-label': `Leg ${weekendKort(t.vrijdag)} vast`, onclick: () => legVast(t.vrijdag) },
          t.vrijdag === g.vastgelegdWeekend ? 'Vastgelegd' : 'Leg vast')))) : null,
      g.weekenden.length ? h('div', {}, h('label', { class: 'label', for: 'acc-weekend' }, 'Of kies uit alle weekenden'), keuze) : null,
      g.weekenden.length ? h('div', { class: 'dl-knoppen' }, h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, disabled: g.alleenLezen,
        onclick: () => legVast(keuze.value) }, icoon(VINK, 20), 'Leg dit weekend vast')) : null);
  }

  // ACC-3: info, stemmen of geboekt. Geboekt hoort bij één accommodatie; die kies je in de lijst hieronder.
  function deelvormBlok() {
    const uitleg = { info: 'Iedereen ziet de lijst.', stemmen: 'Iedereen kiest één favoriet en ziet de aantallen.', geboekt: 'De groep ziet één accommodatie met "Geboekt".' };
    return h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'acc-vorm-kop' },
      h('h2', { class: 't-h3', id: 'acc-vorm-kop' }, 'Hoe tonen we de accommodaties?'),
      h('div', { class: 'segm', role: 'group', 'aria-label': 'Deelvorm' }, DEELVORMEN.map((d) => h('button', { type: 'button', 'aria-pressed': String(g.deelvorm === d), disabled: g.alleenLezen,
        'data-schrijft': true,
        onclick: () => {
          if (g.deelvorm === d) return;
          if (d === 'geboekt' && !g.geboektId) { melding.toon('Kies hieronder bij een accommodatie "Zet op geboekt".'); return; }
          schrijf('deelvormZetten', { deelvorm: d }, `De deelvorm is ${DEELVORM_NAMEN[d].toLowerCase()}.`);
        } }, DEELVORM_NAMEN[d]))),
      h('p', { class: 't-small t-sec' }, uitleg[g.deelvorm]));
  }

  function formulier() {
    const a = bewerk;
    const veld = (id, label, attrs = {}) => { const el = h('input', { id, class: 'field', type: 'text', ...attrs }); return { el, rij: h('div', {}, h('label', { class: 'label', for: id }, label), el) }; };
    const naam = veld('acc-naam', 'Naam', { maxlength: String(ACC_GRENZEN.naamMax), autocomplete: 'off' });
    const plaats = veld('acc-plaats', 'Plaats', { maxlength: String(ACC_GRENZEN.plaatsMax), autocomplete: 'off' });
    const link = veld('acc-link', 'Link (begint met https://)', { type: 'url', inputmode: 'url', maxlength: String(ACC_GRENZEN.linkMax), autocomplete: 'off' });
    const prijs = veld('acc-prijs', 'Totaalprijs in euro', { inputmode: 'decimal', autocomplete: 'off' });
    const notitie = h('textarea', { id: 'acc-notitie', class: 'field', maxlength: String(ACC_GRENZEN.notitieMax), rows: '3' });
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
      const data = { naam: naam.el.value, plaats: plaats.el.value, link: link.el.value, prijsTotaal: totaal, notitie: notitie.value };
      if (a.id) { data.id = a.id; data.versie = a.versie; }
      await schrijf('accommodatieOpslaan', data, a.id ? 'De accommodatie is gewijzigd.' : 'De accommodatie is toegevoegd.', () => { bewerk = null; });
    };
    return h('section', { class: 'solid panel beheer-blok', 'aria-labelledby': 'acc-form-kop' },
      h('h2', { class: 't-h3', id: 'acc-form-kop' }, a.id ? 'Accommodatie wijzigen' : 'Accommodatie toevoegen'),
      naam.rij, plaats.rij, link.rij, prijs.rij,
      h('div', {}, h('label', { class: 'label', for: 'acc-notitie' }, 'Notitie'), notitie),
      h('div', { class: 'dl-knoppen' },
        h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: opslaan }, 'Opslaan'),
        h('button', { class: 'btn btn-plain', type: 'button', onclick: () => { bewerk = null; melding.toon(''); teken(); } }, 'Annuleren')));
  }

  function rij(a) {
    const geboekt = g.deelvorm === 'geboekt' && a.id === g.geboektId;
    const knoppen = [];
    if (!g.alleenLezen) {
      if (!geboekt) knoppen.push(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `Zet ${a.naam} op geboekt`,
        onclick: () => schrijf('deelvormZetten', { deelvorm: 'geboekt', accommodatieId: a.id }, `${a.naam} staat op geboekt.`) }, 'Zet op geboekt'));
      knoppen.push(h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `${a.naam} wijzigen`, onclick: () => { bewerk = a; bevestig = ''; teken(); } }, 'Wijzigen'));
      knoppen.push(bevestig === a.id
        ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `${a.naam} definitief verwijderen`,
          onclick: () => schrijf('accommodatieVerwijderen', { id: a.id, versie: a.versie }, `${a.naam} is verwijderd.`) }, 'Ja, verwijderen')
        : h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `${a.naam} verwijderen`, onclick: () => { bevestig = a.id; teken(); } }, 'Verwijderen'));
    }
    return h('article', { class: 'glass card acc-kaart', 'data-accommodatie': a.id },
      h('div', { class: 'acc-kop' },
        h('div', {}, h('h3', { class: 't-h3' }, a.naam), a.plaats ? h('p', { class: 't-small t-sec' }, a.plaats) : null),
        geboekt ? h('span', { class: 'chip' }, icoon(VINK, 14), 'Geboekt')
          : g.deelvorm === 'stemmen' ? h('span', { class: 't-small t-num acc-stemmen' }, a.stemmen === 1 ? '1 stem' : `${a.stemmen} stemmen`) : null),
      a.notitie ? h('p', { class: 't-small' }, a.notitie) : null,
      prijsRegel(a),
      h('div', { class: 'acc-acties' }, siteLink(a)),
      h('div', { class: 'af-knoppen' }, knoppen));
  }

  function teken() {
    if (!g) return;
    const titel = h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Accommodaties'));
    if (!g.editie) { zet(titel, melding.el, h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.'), h('a', { class: 'btn btn-primary', href: '#/editie-nieuw' }, 'Nieuwe editie maken')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    zet(
      titel,
      h('p', { class: 't-small t-sec' }, STAPNAMEN[g.editie.stap] ? `Nu: ${STAPNAMEN[g.editie.stap]}` : ''),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; bewerk = null; bevestig = ''; laad(); }, 'accb-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt niets meer wijzigen.') : null,
      weekendBlok(),
      deelvormBlok(),
      h('h2', { class: 't-h3 acc-lijstkop' }, `Accommodaties (${g.accommodaties.length})`),
      g.accommodaties.length ? g.accommodaties.map(rij) : h('p', { class: 't-body t-sec' }, 'Nog geen accommodaties.'),
      bewerk ? formulier() : (g.alleenLezen ? null : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { bewerk = {}; teken(); } }, icoon(PLUS, 20), 'Accommodatie toevoegen')),
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
