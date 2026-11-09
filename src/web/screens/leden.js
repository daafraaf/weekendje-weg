// Beheerscherm: leden toevoegen, woonplaats wijzigen en inactief maken (GRP-5). Leden worden nooit verwijderd.
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakApi } from '../api.js';
import { scriptUrl } from '../sessie.js';

const PLUS = 'M12 5v14M5 12h14';
const POTLOOD = 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4';
const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];

// sessie: { scriptId, sessie, editieId }. bijVerlopen() wordt aangeroepen als de beheersessie niet meer geldt.
export function maakLeden({ sessie, uitloggen, bijVerlopen, fetchFn }) {
  const api = maakApi({ basisUrl: scriptUrl(sessie.scriptId), sessie: () => sessie.sessie, editieId: () => sessie.editieId, ...(fetchFn ? { fetchFn } : {}) });
  let gegevens = null;
  let wijzigId = null;

  const wortel = h('section', { class: 'beheer' });
  const meldingTekst = h('p', { class: 't-small' });
  const melding = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), meldingTekst);
  const toonMelding = (t) => { meldingTekst.textContent = t || ''; melding.hidden = !t; };

  async function anroep(actie, data, schrijft) {
    try {
      return await api.anroep(actie, data, { schrijft });
    } catch (f) {
      if (f.code === 'verlopen' || f.code === 'geen_toegang') { bijVerlopen(); return null; }
      toonMelding(f.message || 'Er ging iets mis. Probeer het later opnieuw.');
      return null;
    }
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'beheer' }, false);
    if (r) { gegevens = r; toonMelding(''); teken(); }
  }

  async function wijzig(data) {
    toonMelding('');
    const r = await anroep('ledenBeheren', data, true);
    if (r) { wijzigId = null; await laad(); }
  }

  const naam = h('input', { id: 'lid-naam', class: 'field', type: 'text', maxlength: '40', autocomplete: 'off' });
  const plaats = h('input', { id: 'lid-plaats', class: 'field', type: 'text', maxlength: '60', autocomplete: 'off' });
  const voeg = h('button', { class: 'btn btn-ghost', type: 'button', 'data-schrijft': true }, icoon(PLUS, 20), 'Lid toevoegen');
  voeg.addEventListener('click', async () => {
    if (!naam.value.trim()) { toonMelding('Vul een naam in.'); return; }
    await wijzig({ soort: 'toevoegen', voornaam: naam.value.trim(), woonplaats: plaats.value.trim() });
    if (melding.hidden) { naam.value = ''; plaats.value = ''; }
  });
  const nieuw = h('section', { class: 'solid panel wz-nieuw' },
    h('h2', { class: 't-h2' }, 'Lid toevoegen'),
    h('div', { class: 'wz-twee' },
      h('div', {}, h('label', { class: 'label', for: 'lid-naam' }, 'Naam'), naam),
      h('div', {}, h('label', { class: 'label', for: 'lid-plaats' }, 'Woonplaats'), plaats)),
    voeg);

  function rij(l) {
    const eigen = l.id === gegevens.eigenLidId;
    if (wijzigId === l.id) {
      const veld = h('input', { class: 'field', type: 'text', maxlength: '60', value: l.woonplaats, 'aria-label': `Woonplaats van ${l.voornaam}` });
      return h('div', { class: 'row' },
        h('span', { class: 'av', 'aria-hidden': 'true' }, l.voornaam.slice(0, 1).toUpperCase()),
        h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, l.voornaam), veld),
        h('button', { class: 'btn-plain', type: 'button', 'data-schrijft': true, onclick: () => wijzig({ soort: 'woonplaats', id: l.id, woonplaats: veld.value.trim() }) }, 'Opslaan'),
        h('button', { class: 'btn-plain', type: 'button', onclick: () => { wijzigId = null; teken(); } }, 'Annuleer'));
    }
    return h('div', { class: l.actief ? 'row' : 'row inactief' },
      h('span', { class: 'av', 'aria-hidden': 'true' }, l.voornaam.slice(0, 1).toUpperCase()),
      h('span', { class: 'rij-tekst' },
        h('span', { class: 'rij-naam' }, l.voornaam, eigen ? h('span', { class: 'chip' }, 'jij') : null, l.actief ? null : h('span', { class: 'chip chip-n' }, 'inactief')),
        h('span', { class: 't-small t-sec' }, l.woonplaats || 'Woonplaats onbekend')),
      l.actief ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Woonplaats van ${l.voornaam} wijzigen`, onclick: () => { wijzigId = l.id; teken(); } }, icoon(POTLOOD, 18)) : null,
      l.actief ? h('button', { class: 'btn-plain', type: 'button', 'data-schrijft': true, 'aria-label': `${l.voornaam} inactief maken`, onclick: () => wijzig({ soort: 'inactief', id: l.id }) }, 'Inactief') : null);
  }

  function teken() {
    wortel.replaceChildren(
      h('div', { class: 'wz-kop' },
        h('p', { class: 't-cap' }, 'Beheren'),
        h('h1', { class: 't-title' }, 'Leden'),
        h('p', { class: 't-body t-sec' }, `Groep ${gegevens.groep.naam}. Leden worden nooit verwijderd, alleen inactief gemaakt.`)),
      melding,
      h('div', { class: 'solid list' }, gegevens.leden.map(rij)),
      nieuw,
      h('div', { class: 'start-acties' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: uitloggen }, 'Uitloggen')));
  }

  wortel.append(h('p', { class: 't-body t-sec' }, 'Laden…'), melding);
  laad();
  return wortel;
}
