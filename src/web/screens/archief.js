// Archief (ARC-1, spec §7.15): alle edities van de groep, nieuwste bovenaan.
// Alle tekst gaat via textContent; de link van een accommodatie alleen als hij met https:// begint (NFR-3).
import { h } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../components/stappenbalk.js';
import { weekendLang } from './overzicht.js';

const veiligeLink = (l) => /^https:\/\//.test(l || '');

function editieKaart(e) {
  const acc = e.accommodatie;
  return h('section', { class: 'glass card beheer-blok', 'data-editie': e.titel },
    h('p', { class: 't-cap' }, `${e.jaar} · ${STAPNAMEN[e.stap] || e.stap}`),
    h('h2', { class: 't-h3' }, e.titel),
    h('p', { class: 't-body' }, e.vastgelegdWeekend ? `Weekend: ${weekendLang(e.vastgelegdWeekend)}` : 'Het weekend lag niet vast.'),
    acc
      ? h('p', { class: 't-body' }, `Accommodatie: ${acc.naam}${acc.plaats ? `, ${acc.plaats}` : ''}`, veiligeLink(acc.link) ? ' · ' : null, veiligeLink(acc.link) ? h('a', { href: acc.link, target: '_blank', rel: 'noopener noreferrer' }, 'Link') : null)
      : h('p', { class: 't-body' }, 'Geen accommodatie geboekt.'),
    h('p', { class: 't-small t-sec' }, `Organisatie: ${e.organisatoren.join(', ') || 'onbekend'}`),
    h('p', { class: 't-small t-sec' }, `Deelnemers: ${e.deelnemers.join(', ')}`));
}

export function maakArchief({ sessie, bijVerlopen, fetchFn }) {
  const wortel = h('section', { class: 'beheer archief' });
  const fout = h('p', { class: 't-small t-sec', hidden: true });
  // Zonder editieId: het archief hoort bij de groep, ook voor een organisator.
  const anroep = maakBeheerApi({ sessie, editieId: () => '', bijVerlopen, toonMelding: (t) => { fout.textContent = t || ''; fout.hidden = !t; }, fetchFn });
  const kop = h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Groep'), h('h1', { class: 't-title' }, 'Archief'));
  wortel.append(kop, fout, h('p', { class: 't-body t-sec' }, 'Laden…'));
  anroep('scherm', { naam: 'archief' }, false).then((g) => {
    if (!g) { wortel.lastChild.remove(); return; }
    wortel.replaceChildren(kop, fout, ...(g.edities.length ? g.edities.map(editieKaart) : [h('p', { class: 't-body t-sec' }, 'Er zijn nog geen edities.')]));
  });
  return wortel;
}
