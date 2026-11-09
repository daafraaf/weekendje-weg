// Accommodaties voor de groep (ACC-3, ACC-4, ACC-5): lijst, favoriet kiezen en de geboekte accommodatie.
// Ontwerp: docs/design/Accommodaties.dc.html. Alle tekst, ook de ingevoerde link, gaat via textContent of attributen (NFR-3, NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../components/stappenbalk.js';
import { heleEuro, isHttpsLink } from '../../shared/accommodatie.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { weekendLang } from './overzicht.js';

const PIN = ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z', 'M14.3 10a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0'];
const VINK = ['m5 12.5 4.5 4.5L19 7.5'];
const KALENDER = ['M3.5 8a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v9.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3z', 'M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4'];
const EXTERN = ['M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'];
const INFO = ['M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0', 'M12 11v5M12 8h.01'];
const SLOT = ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];

// Prijsregel: per persoon vet, totaal rechts; zonder prijs geen regel.
export function prijsRegel(a) {
  if (!(a.prijsTotaal > 0)) return null;
  return h('div', { class: 'acc-prijs' },
    a.prijsPerPersoon ? h('span', { class: 't-h2 t-num' }, heleEuro(a.prijsPerPersoon), h('span', { class: 't-small t-sec acc-pp' }, ' p.p.')) : h('span', {}),
    h('span', { class: 't-small t-sec t-num' }, `${heleEuro(a.prijsTotaal)} totaal`));
}

// NFR-3: alleen een https-link wordt een anker, met rel="noopener noreferrer".
export function siteLink(a) {
  if (!isHttpsLink(a.link)) return null;
  return h('a', { class: 'btn btn-plain', href: a.link, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Website van ${a.naam} openen` }, icoon(EXTERN, 18), 'Site');
}

export function maakAccommodaties({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let bericht = '';
  const wortel = h('section', { class: 'beheer accommodaties' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Accommodatie' : 'Accommodatie'),
    h('h1', { class: 't-title' }, 'Waar gaan we heen?'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);

  async function stem(a) {
    melding.toon('');
    const r = await anroep('stemmen', { accommodatieId: a.id }, true);
    if (r) bericht = `Je favoriet is ${a.naam}.`;
    await laad();
  }

  function kaart(a) {
    const stemt = g.deelvorm === 'stemmen';
    const geboekt = g.deelvorm === 'geboekt' && a.id === g.geboektId;
    const mijn = a.id === g.mijnStem;
    const balken = Math.max(1, g.aantal, a.stemmen);
    return h('article', { class: 'glass card acc-kaart', 'data-accommodatie': a.id },
      h('div', { class: 'acc-kop' },
        h('div', {},
          h('h2', { class: 't-h3' }, a.naam),
          a.plaats ? h('p', { class: 't-small t-sec acc-plaats' }, icoon(PIN, 14), a.plaats) : null),
        geboekt ? h('span', { class: 'chip' }, icoon(VINK, 14), 'Geboekt')
          : stemt ? h('span', { class: 't-small t-num acc-stemmen' }, a.stemmen === 1 ? '1 stem' : `${a.stemmen} stemmen`) : null),
      a.notitie ? h('p', { class: 't-small' }, a.notitie) : null,
      prijsRegel(a),
      stemt ? h('div', { class: 'acc-balk', 'aria-hidden': 'true' }, Array.from({ length: balken }, (_, i) => h('span', { class: `seg${i < a.stemmen ? ' done' : ''}` }))) : null,
      h('div', { class: 'acc-acties' },
        stemt && g.ik && !g.alleenLezen
          ? h('button', { class: `btn ${mijn ? 'btn-primary' : 'btn-ghost'}`, type: 'button', 'aria-pressed': String(mijn), 'data-schrijft': true, onclick: () => stem(a) },
            mijn ? [icoon(VINK, 20), 'Jouw favoriet'] : 'Kies als favoriet')
          : null,
        siteLink(a)));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    const zichtbaar = g.deelvorm === 'geboekt' ? g.accommodaties.filter((a) => a.id === g.geboektId) : g.accommodaties;
    const sub = g.deelvorm === 'stemmen' ? 'Kies je favoriet. Je kunt je keuze nog wijzigen.'
      : g.deelvorm === 'geboekt' ? 'Dit is geboekt.' : 'Dit zijn de plekken die in beeld zijn.';
    zet(
      kop(sub),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'acc-editie'),
      melding.el, toast,
      g.vastgelegdWeekend ? h('div', {}, h('span', { class: 'chip' }, icoon(KALENDER, 16), `${weekendLang(g.vastgelegdWeekend)} vastgelegd`)) : null,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de accommodaties nog lezen.') : null,
      zichtbaar.length ? zichtbaar.map(kaart) : h('p', { class: 't-body t-sec' }, g.organisator ? 'Er staan nog geen accommodaties in. Voeg ze toe bij Accommodaties beheren.' : 'Er staan nog geen accommodaties in.'),
      g.organisator ? h('a', { class: 'btn btn-ghost', href: `#/accommodatie-beheer?editie=${encodeURIComponent(editieId)}` }, 'Accommodaties beheren') : null,
      g.aantal ? h('p', { class: 'priv' }, icoon(INFO, 16), h('span', {}, `Prijs per persoon is het totaal gedeeld door ${g.aantal}.`)) : null,
      g.deelvorm === 'stemmen' ? h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Je ziet aantallen stemmen, geen namen.')) : null);
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'accommodaties' }, false);
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
