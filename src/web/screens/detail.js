// Detailoverzicht voor de organisator (OVZ-6, §7.5.4): alles per persoon en per blok, met vrije tekst,
// allergieën, woonplaatsen en samenwerken. Ontwerp: docs/design/Detail.dc.html en D-Detail.dc.html.
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { datumKort } from '../../shared/datums.js';
import { BUDGET_VERBLIJF, BUDGET_WEEKEND, VERBLIJF_WENSEN, indexVanBovengrens, schijfTekst } from '../../shared/antwoorden.js';
import { WENSBLOKKEN } from '../../shared/lijsten.js';
import { tagsUitTekst } from '../../shared/tags.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { weekendLang } from './overzicht.js';

const SLOT = ['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const OPEN = 'm6 14.5 6-6 6 6';
const DICHT = 'm6 9.5 6 6 6-6';
const DRIE = { ja: ['st-ja', '✓', 'ja'], misschien: ['st-mis', '~', 'misschien'], nee: ['st-nee', '✕', 'nee'] };

const schijf = (budget, cent) => { const i = indexVanBovengrens(budget, cent); return i === null ? '' : schijfTekst(budget, i); };
const labels = (lijst, sleutels) => (sleutels || []).map((s) => (lijst.find((o) => o.sleutel === s) || {}).label).filter(Boolean);

function drie(w) {
  const [klasse, teken, label] = DRIE[w];
  return h('span', { class: 'teller' }, h('span', { class: `st st-sm ${klasse}`, role: 'img', 'aria-label': label }, teken), label);
}

// Een antwoord op een eigen vraag als leesbare tekst (AAN-54).
function vraagAntwoord(q, w) {
  if (q.type === 'janee') return w === 'ja' ? 'Ja' : 'Nee';
  if (q.type === 'keuze' || q.type === 'meerkeuze') return labels(q.opties, w.split(',')).join(', ');
  return w;
}

function regels(p, d) {
  const data = p.data || {};
  const uit = [];
  const voeg = (naam, waarde) => { if (waarde !== '' && waarde != null && !(Array.isArray(waarde) && !waarde.length)) uit.push([naam, waarde]); };
  const b = Object.values(data.beschikbaarheid || {});
  if (b.length) {
    const tel = { ja: 0, misschien: 0, nee: 0 };
    for (const w of b) if (w in tel) tel[w] += 1;
    voeg('Weekenden', h('span', { class: 'tellers t-small t-num' }, Object.entries(tel).map(([w, n]) => h('span', { class: 'teller' }, h('span', { class: `st st-sm ${DRIE[w][0]}`, role: 'img', 'aria-label': w }, DRIE[w][1]), String(n)))));
  }
  voeg('Verblijf p.p.', schijf(BUDGET_VERBLIJF, data.budgetVerblijf));
  voeg('Weekend p.p.', schijf(BUDGET_WEEKEND, data.budgetWeekend));
  if (data.maxReistijdUur) voeg('Reistijd', `max ${data.maxReistijdUur} uur${p.woonplaats ? ` vanuit ${p.woonplaats}` : ''}`);
  const verblijf = VERBLIJF_WENSEN.filter((w) => (data.verblijf || {})[w.sleutel]).map((w) => `${w.label}: ${(w.opties.find(([k]) => k === data.verblijf[w.sleutel]) || [])[1] || ''}`.toLowerCase().replace(/^./, (c) => c.toUpperCase()));
  voeg('Verblijf', verblijf.join(', '));
  for (const blok of WENSBLOKKEN) {
    if (!d.blokken[blok.blok]) continue;
    voeg(blok.kop, labels(d.lijsten[blok.blok], data[blok.blok]).join(', '));
    voeg(blok.blok === 'etenDrinken' ? 'Allergie of anders' : `${blok.kop}: eigen`, tagsUitTekst(data[`${blok.blok}Eigen`]).join(', '));
  }
  if (d.blokken.samenwerken && data.samenwerken) voeg('Vrijdag werken', drie(data.samenwerken));
  for (const q of d.vragen) {
    const w = (data.eigenVragen || {})[q.id];
    if (w) voeg(q.tekst, vraagAntwoord(q, w));
  }
  return uit;
}

function persoon(p, d) {
  const lijst = regels(p, d);
  const status = p.afgehaakt ? 'afgehaakt' : p.ingevuld ? `ingevuld${p.ingevuldOp ? ` ${datumKort(p.ingevuldOp.slice(0, 10))}` : ''}` : 'nog niet ingevuld';
  const dl = h('dl', { class: 'detail-dl', hidden: true },
    lijst.length ? lijst.flatMap(([naam, waarde]) => [h('dt', { class: 't-sec' }, naam), h('dd', {}, waarde)]) : [h('dt', { class: 't-sec' }, 'Antwoorden'), h('dd', {}, 'Nog niets ingevuld.')]);
  const pijl = h('span', { class: 'detail-pijl' }, icoon(DICHT));
  const knop = h('button', { class: 'row detail-knop', type: 'button', 'aria-expanded': 'false' },
    h('span', { class: 'av', 'aria-hidden': 'true' }, p.voornaam.slice(0, 1).toUpperCase()),
    h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, p.voornaam), h('span', { class: 't-small t-sec' }, [p.woonplaats, status].filter(Boolean).join(' · '))),
    pijl);
  knop.addEventListener('click', () => {
    const open = dl.hidden;
    dl.hidden = !open;
    knop.setAttribute('aria-expanded', String(open));
    pijl.replaceChildren(icoon(open ? OPEN : DICHT));
  });
  return h('div', { class: 'detail-persoon' }, knop, dl);
}

// Per blok: de vrije teksten en samenwerken met de naam erbij.
function perBlok(d) {
  const secties = [];
  const rij = (naam, waarde) => h('div', { class: 'row' }, h('span', { class: 'rij-naam detail-naam' }, naam), h('span', { class: 'rij-tekst' }, waarde));
  for (const blok of WENSBLOKKEN) {
    if (!d.blokken[blok.blok]) continue;
    const met = d.personen.filter((p) => tagsUitTekst((p.data || {})[`${blok.blok}Eigen`]).length > 0);
    if (met.length) secties.push(h('section', { class: 'solid list', 'aria-label': `${blok.kop}, vrije tekst` }, h('p', { class: 't-cap lijst-kop' }, `${blok.kop}: ${blok.eigenLabel.toLowerCase()}`), met.map((p) => rij(p.voornaam, tagsUitTekst(p.data[`${blok.blok}Eigen`]).join(', ')))));
  }
  if (d.blokken.samenwerken) {
    const met = d.personen.filter((p) => (p.data || {}).samenwerken);
    if (met.length) secties.push(h('section', { class: 'solid list', 'aria-label': 'Samenwerken op vrijdag' }, h('p', { class: 't-cap lijst-kop' }, 'Samenwerken op vrijdag'), met.map((p) => rij(p.voornaam, drie(p.data.samenwerken)))));
  }
  for (const q of d.vragen.filter((x) => x.type === 'tekst')) {
    const met = d.personen.filter((p) => ((p.data || {}).eigenVragen || {})[q.id]);
    if (met.length) secties.push(h('section', { class: 'solid list', 'aria-label': q.tekst }, h('p', { class: 't-cap lijst-kop' }, q.tekst), met.map((p) => rij(p.voornaam, p.data.eigenVragen[q.id]))));
  }
  return secties.length ? [h('h2', { class: 't-h2' }, 'Per blok'), secties] : [];
}

export function maakDetail({ sessie, params = {}, bijVerlopen, fetchFn }) {
  let editieId = params.editie || '';
  const wortel = h('section', { class: 'beheer detail' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat(2).filter((x) => x != null && x !== false));
  const kop = h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Weekendje prikker · organisator'), h('h1', { class: 't-title' }, 'Per persoon'));

  function teken(g) {
    if (!g.editie || !g.detail) { zet(kop, melding.el, h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie.')); return; }
    editieId = g.editie.id;
    const d = g.detail;
    zet(
      kop,
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'dt-editie'),
      melding.el,
      h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Alleen voor jou als organisator')),
      h('div', { class: 'solid list' }, d.personen.map((p) => persoon(p, d))),
      perBlok(d),
      g.top[0] ? h('section', { class: 'glass card ovz-blok' }, h('p', { class: 't-small t-sec' }, 'Voorkeursdatum'), h('p', { class: 't-h2' }, weekendLang(g.top[0].vrijdag)),
        h('a', { class: 'btn btn-ghost', href: `#/overzicht?editie=${encodeURIComponent(editieId)}` }, 'Naar het overzicht')) : null);
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'overzicht' }, false);
    if (r) teken(r);
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
