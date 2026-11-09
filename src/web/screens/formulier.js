// Invulformulier met de vier vaste blokken: Kalender, Budget, Reistijd en Verblijf
// (FRM-1 t/m FRM-4, FRM-8, FRM-9, FRM-10, KAL-1). Ontwerp: docs/design/Formulier.dc.html, T-Gewijzigd, T-AlleenLezen.
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakApi } from '../api.js';
import { scriptUrl } from '../sessie.js';
import { maakKalender } from '../components/kalender.js';
import { maakSchuif } from '../components/schuif.js';
import { maakDrieknop } from '../components/drieknop.js';
import { datumLang } from '../../shared/datums.js';
import { BUDGET_VERBLIJF, BUDGET_WEEKEND, REISTIJD, WOONPLAATS, VERBLIJF_WENSEN, bovengrens, indexVanBovengrens, ontbreekt, schijfTekst } from '../../shared/antwoorden.js';

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const SLOT = ['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const GEWIJZIGD = 'Je antwoorden zijn ergens anders gewijzigd, bijvoorbeeld op een ander apparaat. De nieuwste versie is geladen. Controleer ze en sla zo nodig opnieuw op.';
const WENS_KLEUR = { ja: ['ja', '✓'], lieverWel: ['mis', '~'], nee: ['nee', '✕'], maaktNietUit: ['neutraal', '·'] };

// sessie: { scriptId, sessie, editieId }. bijVerlopen() sluit de sessie af.
export function maakFormulier({ sessie, bijVerlopen, fetchFn }) {
  const api = maakApi({ basisUrl: scriptUrl(sessie.scriptId), sessie: () => sessie.sessie, editieId: () => sessie.editieId || '', ...(fetchFn ? { fetchFn } : {}) });
  let g = null; // antwoord van scherm `formulier`
  let huidig = {}; // antwoorden zoals ze nu in het formulier staan
  let versie = 0;
  let opgeslagen = false; // er is in deze weergave opgeslagen en sindsdien niets gewijzigd
  let melding = '';
  let meldingSoort = 'fout';

  const wortel = h('section', { class: 'formulier' });
  const statusTekst = h('p', { class: 'form-status t-small', 'aria-live': 'polite' });
  const toast = h('p', { class: 'form-toast t-small', role: 'status' });
  const opslaanKnop = h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: () => opslaan() }, 'Opslaan');

  async function anroep(actie, data, schrijft) {
    try {
      return await api.anroep(actie, data, { schrijft });
    } catch (f) {
      if (f.code === 'verlopen' || f.code === 'geen_toegang') { bijVerlopen(); return null; }
      throw f;
    }
  }

  function toonStatus() {
    const mist = ontbreekt(huidig);
    if (mist.length) statusTekst.textContent = `Nog nodig: ${mist.join(', ')}.`;
    else statusTekst.textContent = opgeslagen ? 'Ingevuld' : 'Dit is genoeg om als ingevuld te tellen. Vergeet niet op te slaan.';
    statusTekst.className = `form-status t-small${!mist.length && opgeslagen ? ' klaar' : ''}`;
  }

  function wijzig(velden) {
    huidig = { ...huidig, ...velden };
    for (const [k, w] of Object.entries(huidig)) if (w === null || w === undefined) delete huidig[k];
    opgeslagen = false;
    toast.textContent = '';
    toonStatus();
  }

  function redenTekst() {
    if (g.alleenLezen === 'deadline') return `De deadline was ${datumLang(g.editie.deadline.slice(0, 10))}. Je kunt je antwoorden nog lezen, maar niet meer wijzigen.`;
    return 'De stap Invullen is voorbij. Je kunt je antwoorden nog lezen, maar niet meer wijzigen.';
  }

  async function laad(nieuweMelding = '') {
    let r;
    try { r = await anroep('scherm', { naam: 'formulier' }, false); } catch (f) { melding = f.message; meldingSoort = 'fout'; teken(); return; }
    if (!r) return;
    g = r;
    huidig = { ...(r.antwoorden.data || {}) };
    if (huidig.woonplaats === undefined && r.standaardWoonplaats) huidig.woonplaats = r.standaardWoonplaats; // §7.4.4
    versie = r.antwoorden.versie;
    opgeslagen = false;
    melding = nieuweMelding;
    meldingSoort = 'fout';
    teken();
  }

  async function opslaan() {
    toast.textContent = '';
    const plaats = (huidig.woonplaats || '').trim();
    if (huidig.woonplaats !== undefined && plaats.length < WOONPLAATS.min) { melding = `Vul een woonplaats in van ${WOONPLAATS.min} tot ${WOONPLAATS.max} tekens, of laat hem leeg.`; meldingSoort = 'fout'; teken(); return; }
    let r;
    try {
      r = await anroep('antwoordenOpslaan', { versie, data: huidig }, true);
    } catch (f) {
      if (f.code === 'gewijzigd') { await laad(GEWIJZIGD); return; } // FRM-10
      if (f.code === 'gesloten') { await laad('Opslaan kan niet meer.'); return; }
      melding = f.message || 'Opslaan lukte niet. Probeer het opnieuw.';
      meldingSoort = 'fout';
      teken();
      return;
    }
    if (!r) return;
    versie = r.versie;
    opgeslagen = true;
    if (melding) { melding = ''; teken(); }
    toast.textContent = 'Opgeslagen';
    toonStatus();
  }

  function kaart(titel, ...inhoud) {
    return h('section', { class: 'glass card form-blok' }, h('h2', { class: 't-h2' }, titel), ...inhoud);
  }

  const lezen = () => Boolean(g.alleenLezen);
  const index = (budget, cent) => (cent == null ? null : indexVanBovengrens(budget, cent));

  function blokken() {
    const e = g.editie;
    const kalender = kaart('Kalender',
      h('p', { class: 't-small t-sec' }, 'Het hele jaar in één oogopslag. Weekenden lopen van vrijdag tot en met zondag.'),
      maakKalender({ periodeVan: e.periodeVan, periodeTot: e.periodeTot, voorkeursmaanden: e.voorkeursmaanden, waarden: huidig.beschikbaarheid || {}, alleenLezen: lezen(), bijWijziging: (w) => wijzig({ beschikbaarheid: w }) }));

    const budget = kaart('Budget',
      maakSchuif({
        id: 'bv', label: 'Verblijf, per persoon', aantal: BUDGET_VERBLIJF.aantal, tekstVan: (i) => schijfTekst(BUDGET_VERBLIJF, i), onder: 'schijven van €50',
        waarde: index(BUDGET_VERBLIJF, huidig.budgetVerblijf), alleenLezen: lezen(), bijWijziging: (i) => wijzig({ budgetVerblijf: bovengrens(BUDGET_VERBLIJF, i) }),
      }),
      maakSchuif({
        id: 'bw', label: 'Hele weekend, per persoon', aantal: BUDGET_WEEKEND.aantal, tekstVan: (i) => schijfTekst(BUDGET_WEEKEND, i), onder: 'schijven van €100',
        waarde: index(BUDGET_WEEKEND, huidig.budgetWeekend), alleenLezen: lezen(), bijWijziging: (i) => wijzig({ budgetWeekend: bovengrens(BUDGET_WEEKEND, i) }),
      }));

    const plaats = h('input', { id: 'wp', class: 'field', type: 'text', maxlength: WOONPLAATS.max, autocomplete: 'off', readonly: lezen() });
    plaats.value = huidig.woonplaats || '';
    plaats.addEventListener('input', () => wijzig({ woonplaats: plaats.value }));
    const reistijd = kaart('Reistijd',
      maakSchuif({
        id: 'rt', label: 'Maximaal enkele reis', aantal: REISTIJD.max, tekstVan: (i) => `${i + 1} uur`, onder: `${REISTIJD.min} tot ${REISTIJD.max} uur`,
        waarde: huidig.maxReistijdUur == null ? null : huidig.maxReistijdUur - 1, alleenLezen: lezen(), bijWijziging: (i) => wijzig({ maxReistijdUur: i + 1 }),
      }),
      h('div', {}, h('label', { class: 'label', for: 'wp' }, 'Vertrek vanuit'), plaats));

    const verblijf = kaart('Verblijf',
      h('p', { class: 't-small t-sec' }, 'Je geeft hier je voorkeuren op. Dat is geen garantie: de organisator zoekt wat het best past bij de hele groep.'),
      VERBLIJF_WENSEN.map((w) => h('div', { class: 'wens' },
        h('p', { class: 't-body wens-naam' }, w.label),
        maakDrieknop({
          label: w.label, waarde: (huidig.verblijf || {})[w.sleutel] ?? null, alleenLezen: lezen(),
          opties: w.opties.map(([waarde, tekst]) => ({ waarde, tekst, kleur: WENS_KLEUR[waarde][0], symbool: WENS_KLEUR[waarde][1] })),
          bijWijziging: (waarde) => {
            const nieuw = { ...(huidig.verblijf || {}) };
            if (waarde) nieuw[w.sleutel] = waarde; else delete nieuw[w.sleutel];
            wijzig({ verblijf: nieuw });
          },
        }))));
    return [kalender, budget, reistijd, verblijf];
  }

  function teken() {
    const kop = h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g.editie.titel), h('h1', { class: 't-title' }, 'Wanneer kun je?'));
    const fout = melding ? h('div', { class: 'melding-fout', role: 'alert' }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), h('p', { class: 't-small' }, melding)) : null;
    const slot = g.alleenLezen ? h('div', { class: 'glass panel dl-info', role: 'status' }, h('span', { class: 'ico', style: 'color:var(--accent)' }, icoon(SLOT, 22)), h('p', { class: 't-small' }, redenTekst())) : null;
    wortel.replaceChildren(kop, slot, fout, ...blokken(),
      g.alleenLezen ? null : h('div', { class: 'glass panel form-onder' }, h('div', { class: 'form-tekst' }, statusTekst, toast), opslaanKnop));
    toonStatus();
  }

  wortel.append(h('p', { class: 't-body t-sec' }, 'Laden…'));
  laad();
  return wortel;
}
