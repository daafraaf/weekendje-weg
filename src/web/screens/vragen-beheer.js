// Beheer van de eigen vragen van een editie (EDI-3). Tot de stap Overzicht; met antwoorden kan alleen de tekst nog wijzigen.
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { maakTagveld } from '../components/tagveld.js';
import { VRAAGTYPEN, VRAAGTYPE_NAMEN, VRAAG_OPTIES, VRAAG_TEKST_MAX, LABEL_MAX } from '../../shared/lijsten.js';

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const SLOT = ['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];

export function maakVragenBeheer({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let gegevens = null;
  let editieId = params.editie || '';
  let bewerk = null; // vraag die wordt gewijzigd, of null voor een nieuwe

  const wortel = h('section', { class: 'beheer' });
  const meldingTekst = h('p', { class: 't-small' });
  const melding = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), meldingTekst);
  const toonMelding = (t) => { meldingTekst.textContent = t || ''; melding.hidden = !t; };
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding, fetchFn });
  const editie = () => gegevens.edities.find((e) => e.id === editieId);

  async function laad() {
    const r = await anroep('scherm', { naam: 'beheer' }, false);
    if (!r) return;
    gegevens = r;
    if (!gegevens.edities.some((e) => e.id === editieId)) editieId = gegevens.edities.length ? gegevens.edities[gegevens.edities.length - 1].id : '';
    teken();
  }

  async function verstuur(data) {
    toonMelding('');
    const r = await anroep('vragenBeheren', data, true);
    if (!r) return;
    bewerk = null;
    await laad();
  }

  function formulier(vast) {
    const vraag = bewerk;
    const slotTekst = Boolean(vraag && vraag.heeftAntwoord); // alleen de tekst mag nog
    const tekst = h('input', { id: 'vb-tekst', class: 'field', type: 'text', maxlength: VRAAG_TEKST_MAX, disabled: vast });
    tekst.value = vraag ? vraag.tekst : '';
    const type = h('select', { id: 'vb-type', class: 'field', disabled: vast || slotTekst }, VRAAGTYPEN.map((t) => h('option', { value: t }, VRAAGTYPE_NAMEN[t])));
    type.value = vraag ? vraag.type : 'janee';
    // TAG-10: de opties zijn taginvoer; de volgorde is de volgorde van invoeren.
    let optieTags = vraag ? vraag.opties.map((o) => o.label) : [];
    const optiesLabel = `Antwoordopties (${VRAAG_OPTIES.min} tot ${VRAAG_OPTIES.max})`;
    const optiesVeld = maakTagveld({ id: 'vb-opties', label: optiesLabel, tags: optieTags, max: VRAAG_OPTIES.max, alleenLezen: vast || slotTekst, bijWijziging: (t) => { optieTags = t; } });
    const optiesBlok = h('div', {}, h('label', { class: 'label', for: 'vb-opties' }, optiesLabel), optiesVeld.el);
    const zichtbaar = () => { optiesBlok.hidden = !['keuze', 'meerkeuze'].includes(type.value); };
    type.addEventListener('change', zichtbaar);
    zichtbaar();
    const opslaan = () => {
      const lijst = optiesBlok.hidden ? [] : optieTags;
      const bestaand = vraag ? vraag.opties : [];
      const opties = lijst.map((label, i) => (bestaand[i] && bestaand[i].label === label ? { sleutel: bestaand[i].sleutel, label } : { label }));
      if (vraag) verstuur({ actie: 'wijzigen', id: vraag.id, tekst: tekst.value, ...(slotTekst ? {} : { type: type.value, opties }) });
      else verstuur({ actie: 'toevoegen', type: type.value, tekst: tekst.value, opties });
    };
    return h('section', { class: 'solid panel beheer-blok' },
      h('h2', { class: 't-h2' }, vraag ? 'Vraag wijzigen' : 'Vraag toevoegen'),
      slotTekst ? h('p', { class: 't-small t-sec' }, 'Deze vraag heeft al antwoorden: je kunt alleen de tekst nog wijzigen of de vraag verwijderen.') : null,
      h('div', {}, h('label', { class: 'label', for: 'vb-tekst' }, 'Vraag'), tekst),
      h('div', {}, h('label', { class: 'label', for: 'vb-type' }, 'Type'), type),
      optiesBlok,
      h('div', { class: 'dl-knoppen' },
        h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, disabled: vast, onclick: opslaan }, vraag ? 'Opslaan' : 'Toevoegen'),
        vraag ? h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { bewerk = null; teken(); } }, 'Annuleren') : null));
  }

  function rij(q, vast) {
    return h('div', { class: 'row vraag-rij' },
      h('div', { class: 'dl-inhoud' }, h('span', {}, q.tekst),
        h('span', { class: 't-small t-sec' }, VRAAGTYPE_NAMEN[q.type], q.opties.length ? `: ${q.opties.map((o) => o.label).join(', ')}` : '', q.heeftAntwoord ? ' (heeft antwoorden)' : '')),
      h('button', { class: 'btn btn-sm btn-plain', type: 'button', disabled: vast, 'aria-label': `Wijzig ${q.tekst}`, onclick: () => { bewerk = q; teken(); } }, 'Wijzig'),
      h('button', { class: 'btn btn-sm btn-plain', type: 'button', disabled: vast, 'data-schrijft': true, 'aria-label': `Verwijder ${q.tekst}`, onclick: () => verstuur({ actie: 'verwijderen', id: q.id }) }, 'Verwijder'));
  }

  function teken() {
    const kop = (...extra) => h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Eigen vragen'), ...extra);
    if (!gegevens.edities.length) {
      zet(kop(), melding, h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.'), h('a', { class: 'btn btn-primary', href: '#/editie-nieuw' }, 'Nieuwe editie maken'));
      return;
    }
    const e = editie();
    const vast = e.stap !== 'invullen';
    let keuze = null;
    if (gegevens.edities.length > 1) {
      const s = h('select', { id: 'vb-editie', class: 'field' }, gegevens.edities.map((x) => h('option', { value: x.id }, x.titel)));
      s.value = editieId;
      s.addEventListener('change', () => { editieId = s.value; bewerk = null; teken(); });
      keuze = h('div', {}, h('label', { class: 'label', for: 'vb-editie' }, 'Editie'), s);
    }
    zet(
      kop(h('p', { class: 't-body t-sec' }, e.titel)), keuze, melding,
      vast ? h('div', { class: 'glass panel dl-info', role: 'status' }, h('span', { class: 'ico', style: 'color:var(--accent)' }, icoon(SLOT, 22)), h('p', { class: 't-small' }, 'De stap Invullen is voorbij. De vragen staan nu vast.')) : null,
      e.vragen.length ? h('div', { class: 'solid list' }, e.vragen.map((q) => rij(q, vast))) : h('p', { class: 't-body t-sec' }, 'Nog geen eigen vragen.'),
      formulier(vast));
  }

  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  wortel.append(h('p', { class: 't-body t-sec' }, 'Laden…'), melding);
  laad();
  return wortel;
}
