// Overlapoverzicht (OVZ-3 t/m OVZ-5): voorkeursdatum, top 5, heatmap, bandbreedte en wensen, zonder namen.
// Ontwerp: docs/design/Overlap.dc.html en D-Overlap.dc.html. Alle tekst gaat via textContent (NFR-5);
// breedtes van balken gaan via el.style (CSSOM), niet via een style-attribuut (CSP, NFR-4).
import vakantieBestand from '../../../data/vakanties.json' with { type: 'json' };
import { h, icoon } from '../dom.js';
import { maakApi } from '../api.js';
import { scriptUrl } from '../sessie.js';
import { MAANDNAMEN, datumPlus, dagVan, jaarVan, maandVan } from '../../shared/datums.js';
import { feestdagTabel } from '../../shared/feestdagen.js';
import { REGIO_LETTER, weekendKenmerken } from '../../shared/vakanties.js';
import { BUDGET_VERBLIJF, BUDGET_WEEKEND, REISTIJD } from '../../shared/antwoorden.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { maakKomtIn } from '../components/komtin.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { maakWeekendKeuze } from '../components/weekendkeuze.js';

const STER = 'm12 4 2.4 4.9 5.3.8-3.9 3.8.9 5.3L12 16.3l-4.7 2.5.9-5.3-3.9-3.8 5.3-.8z';
const SLOT = ['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const NOG_NIET_VRIJ = 'Het overzicht verschijnt als de organisator het vrijgeeft';

// '2027-06-11' wordt '11 tot 13 juni 2027'; over een maandgrens '30 april tot 2 mei 2027'.
export function weekendLang(vrijdag) {
  const zo = datumPlus(vrijdag, 2);
  const van = maandVan(vrijdag) === maandVan(zo) ? `${dagVan(vrijdag)}` : `${dagVan(vrijdag)} ${MAANDNAMEN[maandVan(vrijdag) - 1]}`;
  return `${van} tot ${dagVan(zo)} ${MAANDNAMEN[maandVan(zo) - 1]} ${jaarVan(zo)}`;
}

// '11 – 13 juni'.
export function weekendKort(vrijdag) {
  const zo = datumPlus(vrijdag, 2);
  const van = maandVan(vrijdag) === maandVan(zo) ? `${dagVan(vrijdag)}` : `${dagVan(vrijdag)} ${MAANDNAMEN[maandVan(vrijdag) - 1]}`;
  return `${van} – ${dagVan(zo)} ${MAANDNAMEN[maandVan(zo) - 1]}`;
}

// Drie tellers ✓ ~ ✕ met hun aantal.
export function tellers({ ja, misschien, nee }) {
  const een = (klasse, teken, label, n) => h('span', { class: 'teller' }, h('span', { class: `st st-sm ${klasse}`, role: 'img', 'aria-label': label }, teken), String(n));
  return h('span', { class: 'tellers t-small t-num' }, een('st-ja', '✓', 'ja', ja), een('st-mis', '~', 'misschien', misschien), een('st-nee', '✕', 'nee', nee));
}

const euro = (cent) => `€ ${(cent / 100).toLocaleString('nl-NL')}`;

// Bandbreedte van een budget: van de ondergrens van de laagste tot de bovengrens van de hoogste schijf.
export function budgetBereik(budget, b) {
  const van = b.min - budget.stapCent;
  return van > 0 ? `${euro(van)} tot ${euro(b.max)}` : `tot ${euro(b.max)}`;
}

function balk(naam, tekst, links, rechts, schaal) {
  const vulling = h('span', { class: 'bb-vul' });
  vulling.style.left = `${links * 100}%`;
  vulling.style.right = `${rechts * 100}%`;
  return h('div', { class: 'bb' },
    h('div', { class: 'bb-kop' }, h('span', { class: 'bb-naam' }, naam), h('span', { class: 't-num bb-waarde' }, tekst)),
    h('div', { class: 'bb-balk', role: 'img', 'aria-label': `${naam}: ${tekst}` }, vulling),
    h('div', { class: 'bb-schaal t-small t-sec' }, h('span', {}, schaal[0]), h('span', {}, schaal[1])));
}

function bandbreedte(g) {
  const rijen = [];
  for (const [naam, budget, b] of [['Verblijf p.p.', BUDGET_VERBLIJF, g.budgetVerblijf], ['Hele weekend p.p.', BUDGET_WEEKEND, g.budgetWeekend]]) {
    if (!b) continue;
    const totaal = budget.stapCent * budget.aantal;
    rijen.push(balk(naam, budgetBereik(budget, b), (b.min - budget.stapCent) / totaal, 1 - b.max / totaal, [euro(0), euro(totaal)]));
  }
  if (g.reistijd) {
    const r = g.reistijd;
    const span = REISTIJD.max - REISTIJD.min;
    const tekst = r.min === r.max ? `${r.min} uur` : `${r.min} tot ${r.max} uur`;
    rijen.push(balk('Reistijd', tekst, (r.min - REISTIJD.min) / span, (REISTIJD.max - r.max) / span, [`${REISTIJD.min} uur`, `${REISTIJD.max} uur`]));
  }
  if (!rijen.length) return null;
  return h('section', { class: 'glass card ovz-blok', 'aria-labelledby': 'ovz-band' }, h('h2', { class: 't-h3', id: 'ovz-band' }, 'Bandbreedte van de groep'), rijen);
}

function aantalRij(label, aantal, max) {
  const vul = h('span', { class: 'aantal-vul' });
  vul.style.width = `${max ? Math.round((aantal / max) * 100) : 0}%`;
  return h('div', { class: 'row' }, h('span', { class: 'rij-tekst' }, label), h('span', { class: 't-num aantal-getal' }, String(aantal)), h('span', { class: 'aantal-balk', 'aria-hidden': 'true' }, vul));
}

function wensen(g) {
  const blokken = g.wensen.map((b) => {
    const items = b.items.filter((i) => i.aantal > 0).sort((x, y) => y.aantal - x.aantal);
    return h('section', { class: 'solid list', 'aria-label': b.kop },
      h('p', { class: 't-cap lijst-kop' }, b.kop),
      items.length ? items.map((i) => aantalRij(i.label, i.aantal, g.aantal)) : h('p', { class: 'row t-small t-sec' }, 'Nog niemand heeft hier iets aangevinkt.'));
  });
  const vragen = g.vragen.map((q) => h('section', { class: 'solid list', 'aria-label': q.tekst },
    h('p', { class: 't-cap lijst-kop' }, q.tekst), q.opties.map((o) => aantalRij(o.label, o.aantal, g.aantal))));
  return [...blokken, ...vragen];
}

function kenmerkTags(k, voorkeursmaand, gelijk) {
  return h('span', { class: 'tags' },
    voorkeursmaand ? h('span', { class: 'tag tag-acc' }, 'voorkeursmaand') : null,
    k.langWeekend ? h('span', { class: 'tag' }, 'lang weekend') : null,
    k.regios.length ? h('span', { class: 'tag' }, `vakantie ${k.regios.map((r) => REGIO_LETTER[r]).join(' ')}`) : null,
    gelijk ? h('span', { class: 'tag' }, 'gelijke stand') : null);
}

// OVZ-4: per weekend een vakje met het aantal ja, de dag, misschien en nee, en de vakantiekenmerken.
function heatmap(g, kenmerk) {
  const max = Math.max(1, g.aantal);
  const perMaand = new Map();
  for (const w of g.weekenden) {
    const sleutel = w.vrijdag.slice(0, 7);
    if (!perMaand.has(sleutel)) perMaand.set(sleutel, []);
    perMaand.get(sleutel).push(w);
  }
  const voorkeur = new Set(g.editie.voorkeursmaanden || []);
  const rijen = [...perMaand.entries()].map(([sleutel, lijst]) => {
    const maand = +sleutel.slice(5, 7);
    const vakjes = lijst.map((w) => {
      const k = kenmerk(w.vrijdag);
      const extra = [k.langWeekend ? 'lang weekend' : '', k.feestdagen.length ? k.feestdagen.join(', ') : '', k.regios.length ? `schoolvakantie ${k.regios.map((r) => REGIO_LETTER[r]).join(', ')}` : ''].filter(Boolean);
      const label = `${weekendKort(w.vrijdag)}: ${w.ja} ja, ${w.misschien} misschien, ${w.nee} nee, ${w.leeg} niet ingevuld${extra.length ? `; ${extra.join('; ')}` : ''}`;
      return h('div', { class: `heat h${Math.round((w.ja / max) * 6)}${k.regios.length ? ' vak' : ''}`, role: 'img', 'aria-label': label, title: label },
        k.feestdagen.length || k.langWeekend ? h('span', { class: 'bm', 'aria-hidden': 'true' }) : null,
        h('span', { class: 'heat-ja' }, String(w.ja)),
        h('span', { class: 'heat-dag' }, String(dagVan(w.vrijdag))),
        h('span', { class: 'heat-rest' }, `~${w.misschien} ✕${w.nee}`));
    });
    return h('div', { class: 'heat-rij' },
      h('span', { class: 'heat-maand t-small' }, `${KORT[maand - 1]}${jaarVan(sleutel) !== jaarVan(g.editie.periodeVan || sleutel) ? ` ${String(jaarVan(sleutel)).slice(2)}` : ''}`, voorkeur.has(maand) ? h('span', { class: 'prefmerk', 'aria-label': 'voorkeursmaand' }, icoon(STER, 12)) : null),
      vakjes);
  });
  const schaal = h('div', { class: 'heat-schaal', 'aria-hidden': 'true' }, h('span', { class: 't-small t-sec' }, '0'),
    [0, 1, 2, 3, 4, 5, 6].map((i) => h('span', { class: `h${i}` })), h('span', { class: 't-small t-sec' }, String(g.aantal)));
  return h('section', { class: 'glass card ovz-blok', 'aria-labelledby': 'ovz-heat' },
    h('div', { class: 'ovz-kop-rij' }, h('h2', { class: 't-h3', id: 'ovz-heat' }, 'Alle weekenden'), h('span', { class: 't-small t-sec' }, 'aantal ja')),
    schaal, rijen,
    h('p', { class: 't-small t-sec' }, 'Elk vakje: aantal ja, de vrijdag, daaronder misschien en nee. Een gele rand is schoolvakantie, een stip een feestdag of lang weekend.'));
}

export function maakOverzicht({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  const api = maakApi({ basisUrl: scriptUrl(sessie.scriptId), sessie: () => sessie.sessie, editieId: () => editieId, ...(fetchFn ? { fetchFn } : {}) });
  const wortel = h('section', { class: 'beheer overzicht' });
  const melding = foutMelding();
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, STAPNAMEN.overzicht), h('h1', { class: 't-title' }, 'Wanneer kan iedereen?'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);
  // ACC-1, ACC-7, §7.6.8 (BV-01): de organisator (beheersessie) legt hier het weekend vast en kiest een ander weekend,
  // met dezelfde knoppen en bevestiging als onder Accommodaties beheren.
  const beheer = sessie.soort === 'beheer';
  let laatste = null; // het laatst getekende overzicht
  let weekendData = null; // het scherm `accommodaties` voor het weekendblok
  let bericht = '';

  async function schrijf(actie, data, tekst, bijOk) {
    melding.toon('');
    try {
      await api.anroep(actie, data, { schrijft: true });
    } catch (f) {
      if (f.code === 'verlopen' || f.code === 'geen_toegang') { bijVerlopen(); return false; }
      melding.toon(f.message || 'Er ging iets mis. Probeer het later opnieuw.');
      return false;
    }
    bericht = tekst;
    if (bijOk) bijOk();
    await laad();
    return true;
  }
  const weekend = beheer ? maakWeekendKeuze({ schrijf, teken: () => { if (laatste) teken(laatste); } }) : null;

  function teken(g) {
    laatste = g;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    editieId = g.editie.id;
    const feest = feestdagTabel(jaarVan(g.editie.periodeVan || '2000-01-01'), jaarVan(g.editie.periodeTot || '2000-01-01') + 1);
    const kenmerk = (v) => weekendKenmerken(v, feest, vakantieBestand);
    const sub = g.ingevuld === g.aantal ? `Alle ${g.aantal} hebben ingevuld.` : `${g.ingevuld} van ${g.aantal} hebben ingevuld.`;
    const beste = g.top[0];
    const voorkeur = beste ? h('section', { class: 'glass card ovz-blok ovz-voorkeur', 'aria-labelledby': 'ovz-voorkeur' },
      h('p', { class: 't-cap prefmerk', id: 'ovz-voorkeur' }, icoon(STER, 14), 'Voorkeursdatum'),
      h('p', { class: 't-title' }, weekendLang(beste.vrijdag)),
      tellers(beste),
      h('p', { class: 't-small t-sec' }, `${beste.nee === 0 ? 'Niemand heeft nee gezegd.' : `${beste.nee} keer nee.`}${beste.voorkeursmaand ? ' Ligt in een voorkeursmaand.' : ''}`)) : null;
    const top = g.top.length ? h('section', { class: 'solid list', 'aria-labelledby': 'ovz-top' },
      h('p', { class: 't-cap lijst-kop', id: 'ovz-top' }, `Top ${g.top.length}`),
      h('ol', { class: 'top-lijst' }, g.top.map((t) => h('li', { class: 'row top-rij' },
        h('span', { class: 't-h3 t-num top-plek', 'aria-hidden': 'true' }, String(t.plek)),
        h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, weekendKort(t.vrijdag)), tellers(t), kenmerkTags(kenmerk(t.vrijdag), t.voorkeursmaand, t.gelijk)))))) : null;
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    zet(
      kop(sub),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; if (weekend) weekend.reset(); laad(); }, 'ovz-editie'),
      melding.el, toast,
      voorkeur, top,
      weekend && weekendData && weekendData.editie ? weekend.blok(weekendData) : null,
      heatmap(g, kenmerk), bandbreedte(g), wensen(g),
      g.detail ? h('a', { class: 'btn btn-ghost', href: `#/detail?editie=${encodeURIComponent(editieId)}` }, 'Per persoon bekijken') : null,
      h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Je ziet aantallen, geen namen.')));
  }

  async function laad() {
    melding.toon('');
    try {
      const g = await api.anroep('scherm', { naam: 'overzicht' });
      if (beheer && g.editie) {
        editieId = g.editie.id;
        weekendData = await api.anroep('scherm', { naam: 'accommodaties' }).catch(() => null);
      }
      teken(g);
    } catch (f) {
      if (f.code === 'verlopen' || f.code === 'geen_toegang') { bijVerlopen(); return; }
      if (f.code === 'gesloten') { zet(kop(), maakKomtIn('overzicht', `${NOG_NIET_VRIJ}.`)); return; } // OVZ-3, NAV-10
      zet(kop(), melding.el);
      melding.toon(f.message || 'Er ging iets mis. Probeer het later opnieuw.');
    }
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'));
  laad();
  return wortel;
}
