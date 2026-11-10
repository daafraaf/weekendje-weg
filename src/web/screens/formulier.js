// Invulformulier met de vier vaste blokken: Kalender, Budget, Reistijd en Verblijf
// (FRM-1 t/m FRM-4, FRM-8, FRM-9, FRM-10, FRM-11, DDL-1, KAL-1). K4: elk veld gaat apart via de wachtrij, zonder knop Opslaan. Ontwerp: docs/design/Formulier.dc.html, T-Gewijzigd, T-AlleenLezen.
// Alle tekst gaat via textContent (NFR-5).
import { tagsUitTekst } from '../../shared/tags.js';
import { kopMetHint } from '../components/hint.js';
import { h, icoon } from '../dom.js';
import { maakApi } from '../api.js';
import { scriptUrl } from '../sessie.js';
import { maakStand, pasAntwoordToe } from '../stand.js';
import { maakKalender } from '../components/kalender.js';
import { maakSchuif } from '../components/schuif.js';
import { maakDrieknop } from '../components/drieknop.js';
import { maakVinkjeslijst } from '../components/vinkjeslijst.js';
import { maakVraag } from '../components/vraag.js';
import { WENSBLOKKEN } from '../../shared/lijsten.js';
import { datumLang } from '../../shared/datums.js';
import { BUDGET_VERBLIJF, BUDGET_WEEKEND, REISTIJD, WOONPLAATS, VERBLIJF_WENSEN, bovengrens, indexVanBovengrens, ontbreekt, schijfTekst } from '../../shared/antwoorden.js';

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const SLOT = ['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const WENS_KLEUR = { ja: ['ja', '✓'], lieverWel: ['mis', '~'], nee: ['nee', '✕'], maaktNietUit: ['neutraal', '·'] };

// sessie: { scriptId, sessie, editieId }. bijVerlopen() sluit de sessie af.
export function maakFormulier({ sessie, wachtrij, bijVerlopen, fetchFn }) {
  const api = maakApi({ basisUrl: scriptUrl(sessie.scriptId), sessie: () => sessie.sessie, editieId: () => sessie.editieId || '', ...(fetchFn ? { fetchFn } : {}) });
  let g = null; // antwoord van scherm `formulier`
  let huidig = {}; // antwoorden zoals ze nu in het formulier staan
  let standaardPlaats = false; // de woonplaats komt uit het lid en staat nog niet in de Sheet
  let melding = '';
  let meldingSoort = 'fout';

  const wortel = h('section', { class: 'formulier' });
  const statusTekst = h('p', { class: 'form-status t-small', 'aria-live': 'polite' });
  const toast = h('p', { class: 'form-toast t-small', role: 'status' });

  // FRM-10: per veld wint de laatste schrijfactie. Een veld dat de wachtrij terugdraait, gaat terug in beeld.
  const stand = maakStand({
    wachtrij, toepassen: pasAntwoordToe,
    hoort: (a) => a.actie === 'antwoordZetten' && (!g || a.editieId === g.editie.id),
    levend: () => wortel.isConnected,
    bijWijziging: (zicht, e) => {
      if (!zicht) return;
      g = zicht;
      if (e.soort === 'teruggedraaid' || e.soort === 'opnieuw') { neemOver(zicht); teken(); } else toonStatus();
    },
  });

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
    const opgeslagen = !stand.open().length;
    if (mist.length) statusTekst.textContent = `Nog nodig: ${mist.join(', ')}.`;
    else statusTekst.textContent = opgeslagen ? 'Ingevuld' : 'Dit is genoeg om als ingevuld te tellen.'; // FRM-11
    statusTekst.className = `form-status t-small${!mist.length && opgeslagen ? ' klaar' : ''}`;
  }

  // K4, FRM-8: elk gewijzigd veld gaat apart de wachtrij in; de vorige waarde van hetzelfde veld vervalt.
  function bewaarVeld(k) {
    let w = huidig[k] === undefined ? null : huidig[k];
    if (k === 'woonplaats' && w !== null) {
      const plaats = w.trim();
      if (!plaats) w = null;
      else if (plaats.length < WOONPLAATS.min) { toast.textContent = `Vul een woonplaats in van ${WOONPLAATS.min} tot ${WOONPLAATS.max} tekens, of laat hem leeg.`; return; }
    }
    if (k === 'woonplaats') toast.textContent = '';
    stand.zet('antwoordZetten', { veld: k, waarde: w }, { sleutel: `veld:${k}`, editieId: g.editie.id });
  }

  function wijzig(velden) {
    const oud = huidig;
    huidig = { ...huidig, ...velden };
    for (const [k, w] of Object.entries(huidig)) if (w === null || w === undefined) delete huidig[k];
    const anders = Object.keys(velden).filter((k) => JSON.stringify(oud[k]) !== JSON.stringify(huidig[k]));
    // §7.4.4: de voorgestelde woonplaats gaat mee met de eerste wijziging, zoals vroeger bij Opslaan.
    if (anders.length && standaardPlaats && !anders.includes('woonplaats')) anders.push('woonplaats');
    if (anders.length) standaardPlaats = false;
    for (const k of anders) bewaarVeld(k);
    toonStatus();
  }

  // Wat in beeld staat: de antwoorden uit de Sheet met de velden die nog onderweg zijn.
  function neemOver(zicht) {
    huidig = { ...(zicht.antwoorden.data || {}) };
    for (const k of ['activiteitenEigen', 'programmaEigen', 'etenDrinkenEigen']) if (huidig[k] !== undefined) huidig[k] = tagsUitTekst(huidig[k]); // AAN-76
    standaardPlaats = huidig.woonplaats === undefined && Boolean(zicht.standaardWoonplaats);
    if (standaardPlaats) huidig.woonplaats = zicht.standaardWoonplaats; // §7.4.4
  }

  function redenTekst() {
    return 'De stap Invullen is voorbij. Je kunt je antwoorden nog lezen, maar niet meer wijzigen.';
  }

  async function laad(nieuweMelding = '') {
    let r;
    try { r = await anroep('scherm', { naam: 'formulier' }, false); } catch (f) { melding = f.message; meldingSoort = 'fout'; teken(); return; }
    if (!r) return;
    g = stand.zetBevestigd(r);
    neemOver(g);
    melding = nieuweMelding;
    meldingSoort = 'fout';
    teken();
  }

  function kaart(titel, ...inhoud) {
    return h('section', { class: 'glass card form-blok' }, h('h2', { class: 't-h2' }, titel), ...inhoud);
  }

  // NAV-7: dezelfde kaart met een vraagteken achter de kop.
  function kaartMetHint(titel, hint, ...inhoud) {
    return h('section', { class: 'glass card form-blok' }, kopMetHint(h('h2', { class: 't-h2' }, titel), hint), ...inhoud);
  }

  const lezen = () => Boolean(g.alleenLezen);
  const index = (budget, cent) => (cent == null ? null : indexVanBovengrens(budget, cent));

  function blokken() {
    const e = g.editie;
    const kalender = kaartMetHint('Kalender', 'kalender',
      h('p', { class: 't-small t-sec' }, 'Het hele jaar in één oogopslag. Weekenden lopen van vrijdag tot en met zondag.'),
      maakKalender({ periodeVan: e.periodeVan, periodeTot: e.periodeTot, voorkeursmaanden: e.voorkeursmaanden, waarden: huidig.beschikbaarheid || {}, alleenLezen: lezen(), bijWijziging: (w) => wijzig({ beschikbaarheid: w }) }));

    const budget = kaartMetHint('Budget (optioneel)', 'budget',
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
    const reistijd = kaart('Reistijd (optioneel)',
      maakSchuif({
        id: 'rt', label: 'Maximaal enkele reis', aantal: REISTIJD.max, tekstVan: (i) => `${i + 1} uur`, onder: `${REISTIJD.min} tot ${REISTIJD.max} uur`,
        waarde: huidig.maxReistijdUur == null ? null : huidig.maxReistijdUur - 1, alleenLezen: lezen(), bijWijziging: (i) => wijzig({ maxReistijdUur: i + 1 }),
      }),
      h('div', {}, h('label', { class: 'label', for: 'wp' }, 'Vertrek vanuit'), plaats));

    const verblijf = kaart('Verblijf (optioneel)',
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
    // FRM-5: vinkjeslijsten uit de editielijsten, elk met een vrij veld; een blok dat de organisator uitzette, ontbreekt.
    const wensen = WENSBLOKKEN.filter((b) => e.blokken[b.blok]).map((b) => kaartMetHint(b.kop, 'tags',
      h('p', { class: 't-small t-sec' }, b.uitleg),
      maakVinkjeslijst({
        id: b.blok, label: b.kop, items: e.lijsten[b.blok], gekozen: huidig[b.blok] || [], eigen: tagsUitTekst(huidig[`${b.blok}Eigen`]), eigenLabel: b.eigenLabel, alleenLezen: lezen(),
        bijWijziging: ({ gekozen, eigen }) => wijzig({ [b.blok]: gekozen, [`${b.blok}Eigen`]: eigen }),
      })));
    // FRM-6: alleen als de organisator het aanzet.
    const samenwerken = e.blokken.samenwerken ? [kaart('Samenwerken op vrijdag',
      h('p', { class: 't-body' }, "Wil je vrijdag overdag op de locatie werken? Dan kom je 's ochtends al aan."),
      maakDrieknop({
        label: 'Samenwerken op vrijdag', waarde: huidig.samenwerken ?? null, alleenLezen: lezen(),
        opties: [['ja', 'Ja', 'ja', '✓'], ['misschien', 'Misschien', 'mis', '~'], ['nee', 'Nee', 'nee', '✕']].map(([waarde, tekst, kleur, symbool]) => ({ waarde, tekst, kleur, symbool })),
        bijWijziging: (waarde) => wijzig({ samenwerken: waarde }),
      }))] : [];
    // FRM-7: eigen vragen met het invoerelement van hun type; het blok verschijnt alleen als er vragen zijn.
    const eigen = g.vragen.length ? [kaart('Eigen vragen', g.vragen.map((vraag) => maakVraag({
      vraag, waarde: (huidig.eigenVragen || {})[vraag.id] ?? null, alleenLezen: lezen(),
      bijWijziging: (waarde) => {
        const nieuw = { ...(huidig.eigenVragen || {}) };
        if (waarde === null) delete nieuw[vraag.id]; else nieuw[vraag.id] = waarde;
        wijzig({ eigenVragen: nieuw });
      },
    })))] : [];
    return [kalender, budget, reistijd, verblijf, ...wensen, ...samenwerken, ...eigen];
  }

  function teken() {
    // DDL-1: de deadline is informatief; opslaan lukt ook erna.
    const deadline = g.editie.deadline && !g.alleenLezen ? h('p', { class: 't-small t-sec', 'data-deadline': true }, `Graag ingevuld vóór ${datumLang(g.editie.deadline.slice(0, 10))}`) : null;
    const kop = h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g.editie.titel), h('h1', { class: 't-title' }, 'Wanneer kun je?'), deadline);
    const fout = melding ? h('div', { class: 'melding-fout', role: 'alert' }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), h('p', { class: 't-small' }, melding)) : null;
    const slot = g.alleenLezen ? h('div', { class: 'glass panel dl-info', role: 'status' }, h('span', { class: 'ico', style: 'color:var(--accent)' }, icoon(SLOT, 22)), h('p', { class: 't-small' }, redenTekst())) : null;
    zet(kop, slot, fout, ...blokken(),
      g.alleenLezen ? null : h('div', { class: 'glass panel form-onder' }, h('div', { class: 'form-tekst' }, statusTekst, toast)));
    toonStatus();
  }

  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  // §7.16.4: terug op het tabblad laadt het formulier de nieuwste antwoorden, bijvoorbeeld van een ander apparaat.
  const bijZicht = () => { if (!wortel.isConnected && g) { document.removeEventListener('visibilitychange', bijZicht); return; } if (document.visibilityState === 'visible' && g) laad(); };
  document.addEventListener('visibilitychange', bijZicht);

  wortel.append(h('p', { class: 't-body t-sec' }, 'Laden…'));
  laad();
  return wortel;
}
