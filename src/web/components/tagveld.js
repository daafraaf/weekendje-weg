// Taginvoer (TAG-1 t/m TAG-6). Een tag is een los onderdeel met een kruisje. Alle tekst gaat via textContent (NFR-5).
// Enter, komma of de knop Toevoegen maken een tag; wat nog in het veld staat bij het verlaten ook. Tab maakt zelf geen tag (AAN-74).
// vinkjes: [{ sleutel, label }] van het blok. Is een term gelijk aan een vinkje, dan wordt dat aangezet in plaats van een tag te maken.
// Suggesties komen alleen uit de nog niet aangevinkte vinkjes (AAN-75).
import { h } from '../dom.js';
import { TAG_MAX, TAGS_MAX, schoonTag, tagSleutel, splitsTekst, voegToe, tagsFout } from '../../shared/tags.js';

export function maakTagveld({ id, label, tags = [], vinkjes = [], aangevinkt = () => [], alleenLezen = false, bijWijziging = () => {}, bijVinkje = () => {} }) {
  let lijst = [...tags];
  const lijstEl = h('ul', { class: 'tags', 'aria-label': `${label}, ingevoerde onderdelen` });
  const invoer = h('input', { id, class: 'field tag-invoer', type: 'text', maxlength: TAG_MAX, autocomplete: 'off', list: `${id}-sug`, readonly: alleenLezen, 'aria-describedby': `${id}-melding`, placeholder: 'Typ en druk op Enter' });
  const sug = h('datalist', { id: `${id}-sug` });
  const melding = h('p', { id: `${id}-melding`, class: 't-small t-sec', role: 'status', 'aria-live': 'polite' });
  const toevoegKnop = h('button', { class: 'btn btn-ghost tag-plus', type: 'button', hidden: true, disabled: alleenLezen }, 'Toevoegen');

  const zeg = (t) => { melding.textContent = t; };

  function teken() {
    lijstEl.replaceChildren(...lijst.map((t) => h('li', { class: 'tag' },
      h('span', {}, t),
      alleenLezen ? null : h('button', { class: 'tag-x', type: 'button', 'aria-label': `Verwijder ${t}`, onclick: () => verwijder(t) }, '×'))));
    lijstEl.hidden = !lijst.length;
    const gekozen = new Set(aangevinkt());
    const gebruikt = new Set(lijst.map(tagSleutel));
    sug.replaceChildren(...vinkjes.filter((v) => !gekozen.has(v.sleutel) && !gebruikt.has(tagSleutel(v.label))).map((v) => h('option', { value: v.label })));
    const fout = tagsFout(lijst);
    if (fout && !melding.textContent) zeg(fout);
  }

  function verwijder(t) {
    lijst = lijst.filter((x) => x !== t);
    zeg(`${t} verwijderd.`);
    teken();
    bijWijziging([...lijst]);
    invoer.focus();
  }

  // Maakt van de tekst in het veld (of een plak met komma's) tags. Geeft terug of er iets gebeurde.
  function bevestig(tekst) {
    const stukken = splitsTekst(tekst);
    if (!stukken.length) return false;
    const meldingen = [];
    const nieuw = [];
    for (const s of stukken) {
      const vink = vinkjes.find((v) => tagSleutel(v.label) === tagSleutel(s) || tagSleutel(v.sleutel) === tagSleutel(s));
      if (vink) {
        if (aangevinkt().includes(vink.sleutel)) meldingen.push(`${vink.label} is al aangevinkt.`);
        else { bijVinkje(vink.sleutel); meldingen.push(`${vink.label} is aangevinkt.`); }
      } else nieuw.push(s);
    }
    const knip = nieuw.map(schoonTag).filter((s) => s.length > TAG_MAX);
    if (knip.length) meldingen.push(`Maximaal ${TAG_MAX} tekens per onderdeel: ${knip.join(', ')} is niet toegevoegd.`);
    const pas = nieuw.filter((s) => schoonTag(s).length <= TAG_MAX);
    const r = voegToe(lijst, pas);
    if (r.dubbel.length) meldingen.push(`${r.dubbel.join(', ')} staat er al.`);
    if (r.tags.length > TAGS_MAX) meldingen.push(`Maximaal ${TAGS_MAX} onderdelen per veld.`);
    else if (r.tags.length > lijst.length) {
      const toegevoegd = r.tags.slice(lijst.length);
      lijst = r.tags;
      meldingen.unshift(`${toegevoegd.join(', ')} toegevoegd.`);
      bijWijziging([...lijst]);
    }
    zeg(meldingen.join(' '));
    teken();
    return true;
  }

  function neemOver() {
    const tekst = invoer.value;
    if (!schoonTag(tekst)) { invoer.value = ''; toevoegKnop.hidden = true; return; }
    bevestig(tekst);
    invoer.value = '';
    toevoegKnop.hidden = true;
  }

  invoer.addEventListener('input', () => {
    toevoegKnop.hidden = alleenLezen || !schoonTag(invoer.value);
    // Een komma of een plak met scheidingstekens maakt direct tags; wat achter de laatste komma staat, blijft in het veld.
    if (/[,;\n]/.test(invoer.value)) {
      const rest = /[,;\n]\s*$/.test(invoer.value) ? '' : (invoer.value.split(/[,;\n]/).pop() || '');
      bevestig(invoer.value.slice(0, invoer.value.length - rest.length));
      invoer.value = rest;
      toevoegKnop.hidden = !schoonTag(rest);
    }
  });
  invoer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); neemOver(); }
    else if (e.key === 'Backspace' && invoer.value === '' && lijst.length && !alleenLezen) verwijder(lijst[lijst.length - 1]);
  });
  invoer.addEventListener('blur', () => { if (!toevoegKnop.matches(':active')) neemOver(); });
  toevoegKnop.addEventListener('click', () => { neemOver(); invoer.focus(); });

  teken();
  return {
    // Voor het vinkje dat de term zelf aanzet: het veld tekent de suggesties opnieuw.
    ververs: teken,
    el: h('div', { class: 'tagveld', role: 'group', 'aria-label': label },
      lijstEl,
      alleenLezen ? null : h('div', { class: 'tag-rij' }, invoer, toevoegKnop),
      sug, melding),
  };
}
