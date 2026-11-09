// Programma (PRG-1 t/m PRG-3): het weekend per dag op tijd, het punt van nu uitgelicht, voor de organisator ook beheren.
// Ontwerp: docs/design/Programma.dc.html. Alle tekst, ook adressen en notities, gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../components/stappenbalk.js';
import { kaartLink } from '../navigatie.js';
import { isHttpsLink } from '../../shared/accommodatie.js';
import { datumLang, dagVan } from '../../shared/datums.js';
import { DAGEN, DAGNAMEN, DAGEN_KORT, PROGRAMMA_GRENZEN as G, dagDatum, dagVanDatum, puntenVanDag, uitgelicht } from '../../shared/maaltijden.js';
import { editieKeuze, foutMelding } from './voortgang.js';

const PLUS = ['M12 5v14M5 12h14'];
const EXTERN = ['M14 4h6v6', 'M20 4 11 13', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'];
const hoofd = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const twee = (n) => String(n).padStart(2, '0');

// De lokale datum en tijd van het apparaat; alleen hier, zodat de tests de klok kunnen vastzetten.
export function lokaalNu(d = new Date()) {
  return { datum: `${d.getFullYear()}-${twee(d.getMonth() + 1)}-${twee(d.getDate())}`, tijd: `${twee(d.getHours())}:${twee(d.getMinutes())}` };
}

// PRG-2: adres als kaartlink, link alleen als https (NFR-3).
function details(p) {
  return [
    p.adres ? h('a', { class: 'prg-adres', href: kaartLink(p.adres), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Kaart van ${p.adres}` }, p.adres) : null,
    p.notitie ? h('span', { class: 't-small t-sec' }, p.notitie) : null,
    isHttpsLink(p.link) ? h('a', { class: 'prg-site', href: p.link, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Website van ${p.titel} openen` }, icoon(EXTERN, 14), 'Meer info') : null,
  ];
}

// status: 'nu', 'straks' of ''. Het uitgelichte punt krijgt glas, de stip en een chip.
function puntKaart(p, status, extra) {
  const tijd = p.eind ? `${p.begin} – ${p.eind}` : p.begin;
  return h('li', { class: 'prg-punt', 'data-punt': p.id, 'data-status': status || false },
    h('span', { class: status ? 'dot now' : 'dot', 'aria-hidden': 'true' }),
    h('div', { class: `${status ? 'glass' : 'solid'} panel prg-kaart` },
      h('span', { class: 't-num prg-tijd' }, tijd),
      h('span', { class: 'prg-tekst' },
        h('span', { class: 'prg-titel' }, p.titel, status ? h('span', { class: 'chip prg-chip' }, status) : null),
        details(p)),
      extra || null));
}

export function maakProgramma({ sessie, params = {}, bijVerlopen, fetchFn, nu = lokaalNu }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  let dag = '';
  let bewerk = ''; // id van het punt dat open staat, of 'nieuw'
  let bevestig = '';
  let bericht = '';
  const wortel = h('section', { class: 'beheer programma' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Weekend' : 'Weekend'),
    h('h1', { class: 't-title' }, 'Programma'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);

  async function schrijf(actie, data, tekst) {
    melding.toon('');
    const r = await anroep(actie, data, true);
    if (r) { bericht = tekst; bewerk = ''; bevestig = ''; }
    await laad();
  }

  // PRG-1: dag, begin, eind, titel, adres, link en notitie.
  function formulier(p) {
    const veld = (label, el) => h('div', {}, h('label', { class: 'label' }, label, el));
    const dagKeuze = h('select', { class: 'field', style: 'min-height:44px' }, DAGEN.map((d) => h('option', { value: d }, DAGNAMEN[d])));
    dagKeuze.value = p ? p.dag : dag;
    const begin = h('input', { class: 'field', type: 'time', required: true, value: p ? p.begin : '', style: 'min-height:44px' });
    const eind = h('input', { class: 'field', type: 'time', value: p ? p.eind : '', style: 'min-height:44px' });
    const titel = h('input', { class: 'field', type: 'text', maxlength: String(G.titelMax), value: p ? p.titel : '', autocomplete: 'off', style: 'min-height:44px' });
    const adres = h('input', { class: 'field', type: 'text', maxlength: String(G.adresMax), value: p ? p.adres : '', autocomplete: 'off', style: 'min-height:44px' });
    const link = h('input', { class: 'field', type: 'url', maxlength: String(G.linkMax), value: p ? p.link : '', placeholder: 'https://', autocomplete: 'off', style: 'min-height:44px' });
    const notitie = h('input', { class: 'field', type: 'text', maxlength: String(G.notitieMax), value: p ? p.notitie : '', autocomplete: 'off', style: 'min-height:44px' });
    const opslaan = () => {
      if (!titel.value.trim()) { melding.toon('Geef het programmapunt een titel.'); return; }
      if (!begin.value) { melding.toon('Kies een begintijd.'); return; }
      if (eind.value && eind.value <= begin.value) { melding.toon('Het eind ligt na het begin.'); return; }
      if (link.value.trim() && !isHttpsLink(link.value.trim())) { melding.toon('Een link begint met https://.'); return; }
      schrijf('programmaOpslaan', { ...(p ? { id: p.id } : {}), dag: dagKeuze.value, begin: begin.value, eind: eind.value, titel: titel.value, adres: adres.value, link: link.value, notitie: notitie.value },
        p ? 'Het programmapunt is aangepast.' : 'Het programmapunt is toegevoegd.');
    };
    return h('form', { class: 'glass panel prg-form', onsubmit: (e) => { e.preventDefault(); opslaan(); } },
      h('h2', { class: 't-h3' }, p ? 'Programmapunt wijzigen' : 'Programmapunt toevoegen'),
      veld('Dag', dagKeuze), veld('Begin', begin), veld('Eind (niet verplicht)', eind), veld('Titel', titel), veld('Adres', adres), veld('Link', link), veld('Notitie', notitie),
      h('div', { class: 'prg-acties' },
        h('button', { class: 'btn btn-primary btn-sm', type: 'submit', 'data-schrijft': true }, p ? 'Opslaan' : 'Toevoegen'),
        h('button', { class: 'btn btn-plain btn-sm', type: 'button', onclick: () => { bewerk = ''; teken(); } }, 'Annuleren')));
  }

  function beheerKnoppen(p) {
    return h('span', { class: 'mee-knoppen' },
      h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `${p.titel} wijzigen`, onclick: () => { bewerk = p.id; bevestig = ''; teken(); } }, 'Wijzigen'),
      bevestig === p.id
        ? h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'data-schrijft': true, 'aria-label': `${p.titel} definitief verwijderen`, onclick: () => schrijf('programmaVerwijderen', { id: p.id }, `${p.titel} is verwijderd.`) }, 'Ja, verwijderen')
        : h('button', { class: 'btn btn-plain btn-sm', type: 'button', 'aria-label': `${p.titel} verwijderen`, onclick: () => { bevestig = p.id; teken(); } }, 'Verwijderen'));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    const toast = bericht ? h('p', { class: 'form-toast t-small', role: 'status' }, bericht) : null;
    bericht = '';
    const { datum, tijd } = nu();
    const vandaag = dagVanDatum(g.vastgelegdWeekend, datum);
    const beheren = g.organisator && !g.alleenLezen;
    const dagTekst = (d) => {
      const kort = g.vastgelegdWeekend ? `${DAGEN_KORT[d]} ${dagVan(dagDatum(g.vastgelegdWeekend, d))}` : DAGNAMEN[d];
      return d === vandaag ? `${kort} · vandaag` : kort;
    };
    const lijst = puntenVanDag(g.punten, dag);
    const gekozen = dag === vandaag ? uitgelicht(lijst, tijd) : null; // PRG-3
    const sub = g.vastgelegdWeekend ? hoofd(datumLang(dagDatum(g.vastgelegdWeekend, dag))) : null;
    zet(
      kop(sub),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'prg-editie'),
      melding.el, toast,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt het programma nog lezen.') : null,
      h('div', { class: 'segm', role: 'group', 'aria-label': 'Dag' }, DAGEN.map((d) => h('button', { type: 'button', 'aria-pressed': String(d === dag), onclick: () => { dag = d; bewerk = ''; bevestig = ''; teken(); } }, dagTekst(d)))),
      lijst.length
        ? h('ol', { class: 'tl prg-lijst', 'aria-label': `Programma ${DAGNAMEN[dag].toLowerCase()}` }, lijst.map((p) => {
          const status = gekozen && gekozen.punt.id === p.id ? (gekozen.nu ? 'nu' : 'straks') : '';
          if (bewerk === p.id) return h('li', { class: 'prg-punt' }, formulier(p));
          return puntKaart(p, status, beheren ? beheerKnoppen(p) : null);
        }))
        : h('p', { class: 't-small t-sec mee-leeg' }, `Op ${DAGNAMEN[dag].toLowerCase()} staat nog niets gepland.`),
      beheren ? (bewerk === 'nieuw' ? formulier(null)
        : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', style: 'align-self:flex-start', onclick: () => { bewerk = 'nieuw'; teken(); } }, icoon(PLUS, 18), 'Programmapunt toevoegen')) : null);
  }

  // Zonder keuze: vandaag als dat in het weekend valt, anders de eerste dag met punten, anders vrijdag.
  function kiesDag() {
    const { datum } = nu();
    return dagVanDatum(g.vastgelegdWeekend, datum) || DAGEN.find((d) => g.punten.some((p) => p.dag === d)) || 'vr';
  }

  async function laad() {
    const r = await anroep('scherm', { naam: 'programma' }, false);
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    g = r;
    if (r.editie) editieId = r.editie.id;
    if (!dag) dag = kiesDag();
    teken();
  }

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}

// PRG-3: in de stap Weekend toont het startscherm het programma van vandaag met het volgende punt uitgelicht.
// Buiten de stap Weekend, of op een dag buiten het weekend, blijft het blok leeg.
export function maakProgrammaVandaag({ sessie, bijVerlopen, fetchFn, nu = lokaalNu }) {
  const wortel = h('section', { class: 'prg-vandaag' });
  const anroep = maakBeheerApi({ sessie, editieId: () => sessie.editieId || '', bijVerlopen, toonMelding: () => {}, fetchFn });
  anroep('scherm', { naam: 'programma' }, false).then((g) => {
    if (!g || !g.editie || g.editie.stap !== 'weekend') return;
    const { datum, tijd } = nu();
    const d = dagVanDatum(g.vastgelegdWeekend, datum);
    if (!d) return;
    const lijst = puntenVanDag(g.punten, d);
    const licht = uitgelicht(lijst, tijd);
    wortel.append(
      h('h2', { class: 't-h2' }, 'Programma van vandaag'),
      lijst.length
        ? h('ol', { class: 'tl prg-lijst', 'aria-label': 'Programma van vandaag' }, lijst.map((p) => puntKaart(p, licht && licht.punt.id === p.id ? (licht.nu ? 'nu' : 'straks') : '')))
        : h('p', { class: 't-small t-sec' }, 'Vandaag staat er niets gepland.'));
  });
  return wortel;
}
