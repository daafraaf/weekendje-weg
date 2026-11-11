// Accommodatie voor de groep (ACC-8 t/m ACC-14): bij Samen kiezen je top 3 en de stand zonder namen, bij een
// verrassing alleen dat het geregeld is tot de organisator onthult. De top 3 gaat via de wachtrij (SYNC-1, AAN-83).
// Alle tekst, ook de ingevoerde link, gaat via textContent of attributen (NFR-3, NFR-5); breedtes via el.style.
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { heleEuro, isHttpsLink, beddenTekst, maxRang, tikRang } from '../../shared/accommodatie.js';
import { maakStand, pasTop3Toe } from '../stand.js';
import { namenLijst } from '../../shared/whatsapp.js';
import { editieKeuze, foutMelding } from './voortgang.js';
import { maakKomtIn } from '../components/komtin.js';
import { weekendLang } from './overzicht.js';

const PIN = ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z', 'M14.3 10a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0'];
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
export function siteLink(a, tekst = 'Bekijk') {
  if (!isHttpsLink(a.link)) return null;
  return h('a', { class: 'btn btn-plain', href: a.link, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Website van ${a.naam} openen` }, icoon(EXTERN, 18), tekst);
}

// ACC-14: bedden en eigen kamers bij elke optie; een leeg veld komt er niet in.
export const beddenRegel = (a) => { const t = beddenTekst(a); return t ? h('p', { class: 't-small t-sec acc-bedden' }, t) : null; };

// De kaart van één accommodatie met alle gegevens; `kop` komt rechtsboven (de pil Geboekt of de punten).
export function accKaart(a, { kop = null, onder = [] } = {}) {
  return h('article', { class: 'glass card acc-kaart', 'data-accommodatie': a.id },
    h('div', { class: 'acc-kop' },
      h('div', {},
        h('h2', { class: 't-h3' }, a.naam),
        a.plaats ? h('p', { class: 't-small t-sec acc-plaats' }, icoon(PIN, 14), a.plaats) : null),
      kop),
    beddenRegel(a),
    a.notitie ? h('p', { class: 't-small' }, a.notitie) : null,
    prijsRegel(a),
    onder);
}

export const geboektPil = () => h('span', { class: 'chip chip-ja' }, '✓ Geboekt');

// ACC-12: een balk naar verhouding van de meeste punten (breedte via CSSOM, CSP).
export function puntenBalk(punten, max) {
  const vul = h('span', { class: 'aantal-vul' });
  vul.style.width = `${max ? Math.round((punten / max) * 100) : 0}%`;
  return h('span', { class: 'acc-punten', 'aria-hidden': 'true' }, vul);
}

// ACC-12: "5 van 6 gaven een top 3", met ✓ als iedereen er een gaf.
export const gavenPil = (g) => h('span', { class: `chip ${g.gaven >= g.aantal && g.aantal ? 'chip-ja' : 'chip-mis'}` },
  `${g.gaven >= g.aantal && g.aantal ? '✓' : '~'} ${g.gaven} van ${g.aantal} gaven een top 3`);

export const opPunten = (lijst) => lijst.slice().sort((a, b) => b.punten - a.punten || b.mensen - a.mensen);

export function maakAccommodaties({ sessie, params = {}, wachtrij, bijVerlopen, fetchFn }) {
  let editieId = params.editie || sessie.editieId || '';
  let g = null;
  const wortel = h('section', { class: 'beheer accommodaties' });
  const melding = foutMelding();
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: melding.toon, fetchFn });
  const zet = (...k) => wortel.replaceChildren(...k.flat().filter((x) => x != null && x !== false));
  const kop = (sub) => h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, g && g.editie ? STAPNAMEN[g.editie.stap] || 'Accommodatie' : 'Accommodatie'),
    h('h1', { class: 't-title' }, 'Waar gaan we heen?'), sub ? h('p', { class: 't-body t-sec' }, sub) : null);

  // SYNC-1, ACC-11: een tik op 1, 2 of 3 staat direct in beeld; de hele top 3 gaat als één actie de wachtrij in.
  const stand = wachtrij ? maakStand({
    wachtrij, toepassen: pasTop3Toe, hoort: (a) => a.editieId === editieId && a.actie === 'top3Opgeven',
    levend: () => wortel.isConnected,
    bijWijziging: (zicht) => { if (zicht) { g = zicht; teken(); } },
  }) : null;
  let focusKnop = '';
  function tik(a, rang) {
    if (!stand) return;
    focusKnop = `${a.id}:${rang}`;
    stand.zet('top3Opgeven', { keuzes: tikRang(g.mijnTop3, a.id, rang) }, { sleutel: 'top3', editieId });
  }

  function rangKnoppen(a) {
    const max = maxRang(g.accommodaties.length);
    const mijn = g.mijnTop3.find((k) => k.accommodatieId === a.id);
    return h('div', { class: 'acc-rang', role: 'group', 'aria-label': `Plek voor ${a.naam}` },
      Array.from({ length: max }, (_, i) => i + 1).map((r) => h('button', {
        type: 'button', 'aria-pressed': String(Boolean(mijn && mijn.rang === r)), 'aria-label': `${a.naam} op plek ${r}`, 'data-rang': `${a.id}:${r}`,
        onclick: () => tik(a, r),
      }, String(r))));
  }

  // ACC-11: jouw top 3 met per optie de knoppen 1, 2 en 3 (minder bij minder opties).
  function top3Blok() {
    const open = g.ik && !g.alleenLezen && !g.geboekt;
    return h('section', { class: 'beheer-blok', 'aria-labelledby': 'acc-top3' },
      h('h2', { class: 't-h3 acc-lijstkop', id: 'acc-top3' }, 'Jouw top 3'),
      open ? h('p', { class: 't-small t-sec' }, 'Tik 1, 2 of 3 bij je favorieten. Opnieuw tikken vervangt je keuze; het slaat vanzelf op.') : null,
      g.accommodaties.map((a) => accKaart(a, { onder: h('div', { class: 'acc-acties' }, open ? rangKnoppen(a) : null, siteLink(a)) })));
  }

  // ACC-12: de stand met punten en balken, zonder namen.
  function standBlok() {
    const lijst = opPunten(g.accommodaties);
    const max = Math.max(0, ...lijst.map((a) => a.punten));
    return h('section', { class: 'glass card beheer-blok', 'aria-labelledby': 'acc-stand' },
      h('div', { class: 'acc-kop' }, h('h2', { class: 't-h3', id: 'acc-stand' }, 'Stand'), gavenPil(g)),
      h('div', { class: 'solid list', role: 'list', 'aria-label': 'Stand' }, lijst.map((a) => h('div', { class: 'row acc-standrij', role: 'listitem', 'data-stand': a.id },
        h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, a.naam), puntenBalk(a.punten, max)),
        h('span', { class: 't-num acc-pt' }, `${a.punten} pt`)))),
      h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Je ziet punten, geen namen.')));
  }

  // ACC-9: vóór de onthulling geen naam, plaats of link; de server stuurt ze ook niet mee.
  function verrassingBlok() {
    const wie = g.regelaars.length ? namenLijst(g.regelaars) : 'De organisator';
    const wanneer = g.vastgelegdWeekend ? ` voor ${weekendLang(g.vastgelegdWeekend)}` : '';
    return h('section', { class: 'glass card acc-kaart acc-verrassing', 'aria-labelledby': 'acc-verrassing' },
      h('p', { class: 'acc-cadeau', 'aria-hidden': 'true' }, '🎁'),
      h('h2', { class: 't-h3', id: 'acc-verrassing' }, 'Het wordt een verrassing'),
      h('p', { class: 't-body t-sec' }, `${wie} ${g.regelaars.length > 1 ? 'regelen' : 'regelt'} de accommodatie${wanneer}. Waar het is, hoor je later.`),
      h('span', { class: `chip ${g.geboekt ? 'chip-ja' : 'chip-mis'}` }, g.geboekt ? '✓ Geregeld' : '~ Nog niet geregeld'));
  }

  function teken() {
    if (!g) return;
    if (!g.editie) { zet(kop('Je hebt nog geen editie.')); return; }
    const geboekt = g.accommodaties.find((a) => a.id === g.geboektId);
    const samen = g.deelvorm === 'samen';
    let inhoud;
    let sub = '';
    if (g.verborgen) {
      inhoud = verrassingBlok();
    } else if (geboekt) {
      sub = 'Dit is geboekt.';
      inhoud = [
        g.deelvorm === 'verrassing' && !g.onthuld ? h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Nog geheim: de groep ziet alleen dat het geregeld is.')) : null,
        accKaart(geboekt, { kop: geboektPil(), onder: h('div', { class: 'acc-acties' }, siteLink(geboekt, 'Bekijk de accommodatie')) }),
        samen && g.gaven ? standBlok() : null];
    } else if (!samen) {
      inhoud = h('p', { class: 't-body t-sec' }, 'Het wordt een verrassing. Er is nog niets geboekt.'); // alleen de organisator komt hier
    } else if (!g.accommodaties.length) {
      inhoud = h('p', { class: 't-body t-sec' }, g.organisator ? 'Er staan nog geen opties in. Voeg ze toe bij Accommodaties beheren.' : 'Er staan nog geen opties in. De organisator zoekt er een paar.');
    } else {
      sub = 'We kiezen samen. Geef je top 3.';
      inhoud = [top3Blok(), standBlok()];
    }
    zet(
      kop(sub),
      editieKeuze(g.edities, editieId, (id) => { editieId = id; laad(); }, 'acc-editie'),
      melding.el,
      g.vastgelegdWeekend ? h('div', {}, h('span', { class: 'chip' }, icoon(KALENDER, 16), `${weekendLang(g.vastgelegdWeekend)} vastgelegd`)) : null,
      g.alleenLezen ? h('p', { class: 'hint' }, 'De editie is afgerond. Je kunt de accommodatie nog lezen.') : null,
      inhoud,
      g.organisator ? h('a', { class: 'btn btn-ghost', href: `#/accommodatie-beheer?editie=${encodeURIComponent(editieId)}` }, 'Accommodaties beheren') : null,
      g.aantal && g.accommodaties.some((a) => a.prijsTotaal > 0) ? h('p', { class: 'priv' }, icoon(INFO, 16), h('span', {}, `Prijs per persoon is het totaal gedeeld door ${g.aantal}.`)) : null);
    if (focusKnop) {
      const knop = [...wortel.querySelectorAll('[data-rang]')].find((x) => x.getAttribute('data-rang') === focusKnop);
      if (knop) knop.focus();
      focusKnop = '';
    }
  }

  async function laad() {
    let dicht = false;
    const r = await anroep('scherm', { naam: 'accommodaties' }, false, { bijGesloten: () => { dicht = true; } });
    if (dicht) { zet(kop(), maakKomtIn('accommodatie', 'De accommodaties verschijnen als de organisator deze stap opent.')); return; } // NAV-10
    if (!r) { if (!g) zet(kop(), melding.el); return; }
    if (r.editie) editieId = r.editie.id;
    g = stand ? stand.zetBevestigd(r) : r;
    teken();
  }

  // §7.16.4: terug op het tabblad haalt het scherm de stand opnieuw op; wat nog onderweg is, blijft erop staan.
  const bijZicht = () => { if (!wortel.isConnected && g) { document.removeEventListener('visibilitychange', bijZicht); return; } if (document.visibilityState === 'visible' && g) laad(); };
  document.addEventListener('visibilitychange', bijZicht);

  zet(h('p', { class: 't-body t-sec' }, 'Laden…'), melding.el);
  laad();
  return wortel;
}
