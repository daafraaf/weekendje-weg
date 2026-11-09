// Beheer van de formulierblokken en de lijsten van een editie (EDI-2, AAN-21). Tot de stap Overzicht aan te passen.
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { BLOKKEN_NAMEN } from '../../shared/editie.js';
import { LIJSTEN_NAMEN, LIJST_MAX, LABEL_MAX } from '../../shared/lijsten.js';

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const SLOT = ['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];

// sessie: { scriptId, sessie }. params.editie kiest de editie; zonder krijgt de nieuwste.
export function maakLijstenBeheer({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let gegevens = null;
  let editieId = params.editie || '';
  let blokken = {};
  let lijsten = {};
  let toast = '';

  const wortel = h('section', { class: 'beheer' });
  const meldingTekst = h('p', { class: 't-small' });
  const melding = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), meldingTekst);
  const toonMelding = (t) => { meldingTekst.textContent = t || ''; melding.hidden = !t; };
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding, fetchFn });
  const editie = () => gegevens.edities.find((e) => e.id === editieId);

  function neemOver() {
    const e = editie();
    blokken = e ? { ...e.blokken } : {};
    lijsten = e ? Object.fromEntries(Object.entries(e.lijsten).map(([k, l]) => [k, l.map((o) => ({ ...o }))])) : {};
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'beheer' }, false);
    if (!r) return false;
    gegevens = r;
    if (!gegevens.edities.some((e) => e.id === editieId)) editieId = gegevens.edities.length ? gegevens.edities[gegevens.edities.length - 1].id : '';
    neemOver();
    teken();
    return true;
  }

  async function opslaan() {
    toonMelding('');
    toast = '';
    const schoon = Object.fromEntries(Object.entries(lijsten).map(([k, l]) => [k, l.filter((o) => o.label.trim()).map((o) => (o.sleutel ? { sleutel: o.sleutel, label: o.label.trim() } : { label: o.label.trim() }))]));
    const r = await anroep('editieBijwerken', { blokken, lijsten: schoon }, true);
    if (!r) return;
    toast = 'Opgeslagen';
    await laad();
  }

  function lijstKaart(sleutel, vast) {
    const items = lijsten[sleutel];
    const nieuw = h('input', { class: 'field', type: 'text', maxlength: LABEL_MAX, 'aria-label': `Nieuw onderdeel bij ${LIJSTEN_NAMEN[sleutel]}`, placeholder: 'Nieuw onderdeel', disabled: vast });
    const voegToe = () => {
      const label = nieuw.value.trim();
      if (!label || items.length >= LIJST_MAX) return;
      items.push({ label });
      teken();
      wortel.querySelector(`[data-lijst="${sleutel}"] input[aria-label^="Nieuw onderdeel"]`)?.focus();
    };
    nieuw.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); voegToe(); } });
    return h('section', { class: 'solid panel beheer-blok', 'data-lijst': sleutel },
      h('h2', { class: 't-h2' }, LIJSTEN_NAMEN[sleutel]),
      items.length ? h('div', { class: 'list' }, items.map((o, i) => {
        const veld = h('input', { class: 'field', type: 'text', maxlength: LABEL_MAX, 'aria-label': `${LIJSTEN_NAMEN[sleutel]}, onderdeel ${i + 1}`, disabled: vast });
        veld.value = o.label;
        veld.addEventListener('input', () => { o.label = veld.value; });
        return h('div', { class: 'lijst-rij' }, veld,
          h('button', { class: 'btn btn-sm btn-plain', type: 'button', disabled: vast, 'aria-label': `Verwijder ${o.label} uit ${LIJSTEN_NAMEN[sleutel]}`, onclick: () => { items.splice(i, 1); teken(); } }, 'Verwijder'));
      })) : h('p', { class: 't-small t-sec' }, 'Deze lijst is leeg.'),
      h('div', { class: 'lijst-rij' }, nieuw, h('button', { class: 'btn btn-sm btn-plain', type: 'button', disabled: vast, onclick: voegToe }, 'Toevoegen')));
  }

  function teken() {
    const kop = (...extra) => h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Lijsten'), ...extra);
    if (!gegevens.edities.length) {
      zet(kop(), melding, h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.'), h('a', { class: 'btn btn-primary', href: '#/editie-nieuw' }, 'Nieuwe editie maken'));
      return;
    }
    const e = editie();
    const vast = e.stap !== 'invullen';
    let keuze = null;
    if (gegevens.edities.length > 1) {
      const s = h('select', { id: 'ls-editie', class: 'field' }, gegevens.edities.map((x) => h('option', { value: x.id }, x.titel)));
      s.value = editieId;
      s.addEventListener('change', () => { editieId = s.value; toast = ''; neemOver(); teken(); });
      keuze = h('div', {}, h('label', { class: 'label', for: 'ls-editie' }, 'Editie'), s);
    }
    const blokVinkjes = Object.keys(BLOKKEN_NAMEN).map((k) => {
      const vink = h('input', { type: 'checkbox', disabled: vast });
      vink.checked = Boolean(blokken[k]);
      vink.addEventListener('change', () => { blokken[k] = vink.checked; });
      return h('label', { class: 'ed-vink' }, vink, h('span', {}, BLOKKEN_NAMEN[k]));
    });
    zet(
      kop(h('p', { class: 't-body t-sec' }, e.titel)),
      keuze, melding,
      vast ? h('div', { class: 'glass panel dl-info', role: 'status' }, h('span', { class: 'ico', style: 'color:var(--accent)' }, icoon(SLOT, 22)), h('p', { class: 't-small' }, 'De stap Invullen is voorbij. Blokken en lijsten staan nu vast.')) : null,
      h('section', { class: 'solid panel beheer-blok' }, h('h2', { class: 't-h2' }, 'Onderdelen van het formulier'),
        h('p', { class: 't-small t-sec' }, 'Kalender, Budget, Reistijd en Verblijf staan altijd aan.'), blokVinkjes),
      Object.keys(LIJSTEN_NAMEN).map((k) => lijstKaart(k, vast)),
      vast ? null : h('div', { class: 'glass panel form-onder' }, h('div', { class: 'form-tekst' }, h('p', { class: 'form-toast t-small', role: 'status' }, toast)),
        h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: opslaan }, 'Opslaan')));
  }

  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  wortel.append(h('p', { class: 't-body t-sec' }, 'Laden…'), melding);
  laad();
  return wortel;
}
