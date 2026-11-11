// Weekend vastleggen en Ander weekend kiezen (ACC-1, ACC-6, ACC-7, §7.6.8, BV-01), gedeeld door Weekendje prikker en
// Accommodaties beheren. `g` is het antwoord van het scherm `accommodaties` voor de organisator. De acties wachten op de
// Sheet met data-schrijft (SYNC-8). Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { STAPNAMEN, LOSMAKEN_STAPPEN, stapIndex } from '../../shared/stappen.js';
import { aftelTekst } from '../../shared/start.js';
import { weekendLang, weekendKort, tellers } from '../screens/overzicht.js';
import { lokaalNu } from '../screens/programma.js';

const VINK = ['m5 12.5 4.5 4.5L19 7.5'];

// schrijf(actie, data, tekst, bijOk) doet de schrijfactie en laadt het scherm opnieuw; teken() tekent zonder te laden.
export function maakWeekendKeuze({ schrijf, teken }) {
  let losmaken = false; // "Ander weekend kiezen" vraagt om bevestiging

  const losMaken = () => schrijf('weekendLosmaken', {}, 'Het weekend is losgemaakt. Kies een nieuw weekend.', () => { losmaken = false; });
  const legVast = (vrijdag) => schrijf('weekendVastleggen', { vrijdag }, `Het weekend is vastgelegd: ${weekendLang(vrijdag)}.`);

  // ACC-7, AAN-81, K3: de bevestiging toont wat losmaken raakt. §7.6.8: vanaf Weekend een link naar Stappen.
  function losmakenBlok(g) {
    const stap = g.editie.stap;
    if (!g.losmakenMogelijk) {
      if (stapIndex(stap) > stapIndex('voorbereiding')) {
        const naarStappen = `#/stappen?editie=${encodeURIComponent(g.editie.id)}`;
        return h('p', { class: 'hint' }, `Het weekend wijzigen kan tot en met de stap ${STAPNAMEN.voorbereiding}. Zet de stap terug onder `, h('a', { href: naarStappen }, 'Stappen'), '.');
      }
      return h('p', { class: 'hint' }, `Het weekend losmaken kan in de stappen ${LOSMAKEN_STAPPEN.map((s) => STAPNAMEN[s]).join(', ').replace(/, ([^,]*)$/, ' en $1')}.`);
    }
    if (!losmaken) return h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { losmaken = true; teken(); } }, 'Ander weekend kiezen');
    const geboekt = (g.accommodaties || []).find((a) => a.id === g.geboektId);
    const raakt = [];
    if (aftelTekst(lokaalNu().datum, g.vastgelegdWeekend)) raakt.push('De aftelteller op het startscherm verdwijnt.');
    raakt.push('De datums bij de maaltijden en het programma verdwijnen tot je een nieuw weekend kiest.');
    if (geboekt) raakt.push(`${geboekt.naam} blijft op geboekt staan, maar die boeking hoort bij ${weekendLang(g.vastgelegdWeekend)}. Controleer of de boeking past bij het nieuwe weekend.`);
    return h('div', { class: 'solid panel', role: 'group', 'aria-label': 'Ander weekend kiezen' },
      h('p', { class: 't-body' }, `Weet je zeker dat je ${weekendLang(g.vastgelegdWeekend)} wilt loslaten?`),
      h('ul', { class: 't-small' }, raakt.map((t) => h('li', {}, t))),
      h('div', { class: 'dl-knoppen' },
        h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: losMaken }, 'Ja, maak los'),
        h('button', { class: 'btn btn-plain', type: 'button', onclick: () => { losmaken = false; teken(); } }, 'Annuleren')));
  }

  // ACC-1: vanuit de top 5 of uit alle weekenden van de periode (AAN-63).
  function blok(g) {
    if (!g.vastgelegdWeekend) losmaken = false;
    const vast = Boolean(g.vastgelegdWeekend);
    const keuze = h('select', { id: 'acc-weekend', class: 'field' }, g.weekenden.map((w) => h('option', { value: w }, weekendLang(w))));
    keuze.disabled = vast;
    if (vast) keuze.value = g.vastgelegdWeekend;
    return h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'acc-weekend-kop' },
      h('h2', { class: 't-h3', id: 'acc-weekend-kop' }, 'Weekend vastleggen'),
      vast ? h('p', { class: 't-body' }, 'Vastgelegd: ', h('b', {}, weekendLang(g.vastgelegdWeekend))) : h('p', { class: 't-small t-sec' }, 'Er is nog geen weekend vastgelegd.'),
      g.top.length ? h('div', { class: 'solid list', role: 'list', 'aria-label': 'Top weekenden' }, g.top.map((t) => h('div', { class: 'row', role: 'listitem' },
        h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, `${t.plek}. ${weekendKort(t.vrijdag)}`), tellers(t)),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-schrijft': true, disabled: g.alleenLezen || vast, 'aria-label': t.vrijdag === g.vastgelegdWeekend ? `${weekendKort(t.vrijdag)} is vastgelegd` : `Leg ${weekendKort(t.vrijdag)} vast`, onclick: () => legVast(t.vrijdag) },
          t.vrijdag === g.vastgelegdWeekend ? 'Vastgelegd' : 'Leg vast')))) : null,
      g.weekenden.length ? h('div', {}, h('label', { class: 'label', for: 'acc-weekend' }, 'Of kies uit alle weekenden'), keuze) : null,
      g.weekenden.length ? h('div', { class: 'dl-knoppen' }, h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, disabled: g.alleenLezen || vast,
        onclick: () => legVast(keuze.value) }, icoon(VINK, 20), 'Leg dit weekend vast')) : null,
      vast && !g.alleenLezen ? losmakenBlok(g) : null);
  }

  return { blok, reset: () => { losmaken = false; } };
}
