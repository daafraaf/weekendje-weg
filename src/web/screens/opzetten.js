// Opzetwizard voor de eigenaar (GRP-2, GRP-4, RON-5). Ontwerp: docs/design/Opzetwizard.dc.html.
// Alle tekst gaat via textContent (NFR-5). Stappen: 0 rondleiding, 1 verbinden, 2 leden, 3 wachtwoord, 4 klaar.
import { h, icoon } from '../dom.js';
import { maakApi, API_VERSIE, VEROUDERD_TEKST } from '../api.js';
import { leesScriptUrl, scriptUrl, beheerlinkVan } from '../sessie.js';
import { SJABLOON_KOPIE } from '../../shared/uitrol.js';

// AAN-20: 2 tot en met 20 leden. TOE-5: een wachtwoord van minimaal 10 tekens.
export const MIN_LEDEN = 2;
export const MAX_LEDEN = 20;
export const MIN_WACHTWOORD = 10;
const SETUPCODE_LENGTE = 8;

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const VINKJE = 'm5 12.5 4.5 4.5L19 7.5';
const PLUS = 'M12 5v14M5 12h14';
const WEG = ['M5 7h14', 'M10 7V5h4v2', 'M7 7l1 12h8l1-12'];
const KOPIE = ['M9 9h10v11H9z', 'M5 15V4h10'];

const normaliseer = (t) => String(t ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// RON-5: drie stappen voor de eigenaar.
const RONDLEIDING = [
  'Maak een kopie van de sjabloon-Sheet in je eigen Google Drive.',
  'Open in je kopie Extensies en Apps Script. Kies Implementeren en Nieuwe implementatie, type Webapp, uitvoeren als jezelf en toegang voor iedereen. Geef toestemming. Zie je "Google heeft deze app niet geverifieerd", kies dan Geavanceerd en ga verder.',
  'Ga terug naar de Sheet en laad hem opnieuw. Kies in het menu Weekendje weg de optie Groep opzetten en klik op de link.',
];

// vooraf komt uit een opzetlink (GRP-7): { scriptId, code } of { fout }.
export function maakOpzetten({ bijIngelogd, appAdres = () => `${location.origin}${location.pathname}`, fetchFn, vooraf = null, sjabloonKopie = SJABLOON_KOPIE }) {
  const s = { stap: 0, url: '', code: '', naam: '', leden: [], eigenaar: -1, pw1: '', pw2: '', scriptId: '', resultaat: null, bezig: false, gekoppeld: false, focusNaam: false, linkFout: '' };
  if (vooraf && vooraf.scriptId) Object.assign(s, { stap: 1, url: scriptUrl(vooraf.scriptId), code: vooraf.code, gekoppeld: true, focusNaam: true });
  else if (vooraf && vooraf.fout) s.linkFout = vooraf.fout;
  const wortel = h('main', { class: 'binnen wz' });

  const api = () => maakApi({ basisUrl: scriptUrl(s.scriptId), ...(fetchFn ? { fetchFn } : {}) });
  const meldingBlok = (tekst) => h('div', { class: 'melding-fout', role: 'alert' }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), h('p', { class: 't-small' }, tekst));

  function kop(stap, titel, tekst) {
    return h('div', { class: 'wz-kop' },
      h('p', { class: 't-cap' }, `Groep opzetten · stap ${stap} van 4`),
      h('div', { class: 'wz-balk' }, [1, 2, 3, 4].map((n) => h('span', { class: n < stap ? 'seg done' : n === stap ? 'seg now' : 'seg' }))),
      h('h1', { class: 't-title' }, titel),
      tekst ? h('p', { class: 't-body t-sec' }, tekst) : null);
  }

  function veld(id, label, attrs, waarde, bijInvoer) {
    const el = h('input', { id, class: 'field', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', ...attrs });
    el.value = waarde;
    el.addEventListener('input', () => bijInvoer(el.value));
    const fout = h('p', { class: 'hint fout', role: 'alert', hidden: true });
    return { el, fout, blok: h('div', {}, h('label', { class: 'label', for: id }, label), el, fout) };
  }
  const toonFout = (v, tekst) => { v.fout.textContent = tekst || ''; v.fout.hidden = !tekst; };

  // Stap 0: rondleiding (RON-5).
  function rondleiding() {
    return [
      h('div', { class: 'binnen-kop' },
        h('img', { src: 'icons/icon-192.png', width: 72, height: 72, alt: 'App-icoon Weekendje weg' }),
        h('h1', { class: 't-title' }, 'Groep opzetten'),
        h('p', { class: 't-body t-sec' }, 'Jij zet de groep één keer op. Daarna regelt de app de rest. Je hebt drie dingen te doen.')),
      s.linkFout ? meldingBlok(s.linkFout) : null,
      h('ol', { class: 'glass card wz-lijst' }, RONDLEIDING.map((t, i) => h('li', {}, h('span', { class: 'av' }, String(i + 1)), h('span', { class: 'wz-stap' }, h('span', { class: 't-body' }, t),
        i === 0 && sjabloonKopie ? h('a', { class: 'btn btn-primary', href: sjabloonKopie, target: '_blank', rel: 'noopener noreferrer' }, 'Kopie maken') : null)))),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => ga(1) }, 'Ik heb de URL en de setupcode al'),
      h('p', { class: 'priv' }, icoon(['M12 11v5M12 8h.01', 'M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0'], 16), h('span', {}, 'Op iPhone zet je de app eerst op het beginscherm en plak je de links daarna in de app.')),
    ];
  }

  // Stap 1: script-URL, setupcode en groepsnaam (GRP-2).
  function verbinden() {
    const url = veld('wz-url', 'Script-URL', { type: 'text', inputmode: 'url', placeholder: 'https://script.google.com/macros/s/…/exec' }, s.url, (w) => { s.url = w; });
    const code = veld('wz-code', 'Setupcode', { type: 'text', maxlength: '20', placeholder: 'ABCD EFGH' }, s.code, (w) => { s.code = w; });
    const naam = veld('wz-naam', 'Groepsnaam', { type: 'text', maxlength: '60', placeholder: 'Studievrienden' }, s.naam, (w) => { s.naam = w; });
    const algemeen = h('div', { hidden: true });
    const verder = h('button', { class: 'btn btn-primary', type: 'submit', 'data-schrijft': true }, 'Volgende: leden');
    const formulier = h('form', { class: 'glass card binnen-kaart', novalidate: true }, url.blok, code.blok, naam.blok, algemeen, verder);
    if (s.focusNaam) { s.focusNaam = false; requestAnimationFrame(() => naam.el.focus()); }
    if (s.fouten) {
      toonFout(url, s.fouten.url); toonFout(code, s.fouten.code); toonFout(naam, s.fouten.naam);
      if (s.fouten.algemeen) { algemeen.hidden = false; algemeen.replaceChildren(meldingBlok(s.fouten.algemeen)); }
    }
    formulier.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (s.bezig) return;
      const f = {};
      const r = leesScriptUrl(s.url);
      if (r.fout) f.url = r.fout;
      if (normaliseer(s.code).length !== SETUPCODE_LENGTE) f.code = `De setupcode heeft ${SETUPCODE_LENGTE} tekens. Kies in de Sheet Weekendje weg en Groep opzetten.`;
      if (!s.naam.trim()) f.naam = 'Geef de groep een naam.';
      if (Object.keys(f).length) { s.fouten = f; teken(); return; }
      s.bezig = true;
      verder.disabled = true;
      s.scriptId = r.scriptId;
      try {
        const status = await api().anroep('status', {});
        // §7.17 en AAN-14: een script met een andere apiVersie moet eerst worden bijgewerkt.
        if (status.apiVersie !== API_VERSIE) throw Object.assign(new Error(VEROUDERD_TEKST), { code: 'api_versie' });
        if (status.opgezet) { s.fouten = { algemeen: 'Deze groep is al opgezet. Log in met je beheerlink.' }; } else { s.fouten = null; s.stap = 2; }
      } catch (err) {
        s.fouten = { algemeen: err.code === 'api_versie' ? VEROUDERD_TEKST : (err.message || 'Er ging iets mis. Probeer het later opnieuw.') };
      }
      s.bezig = false;
      teken();
    });
    return [kop(1, 'Verbind je Sheet', s.gekoppeld ? 'Je Sheet is gekoppeld. Geef de groep een naam.' : 'Plak de webapp-URL en de setupcode uit het menu Weekendje weg, Groep opzetten.'), formulier];
  }

  // Stap 2: leden en eigenaar (GRP-2).
  function leden() {
    const lijst = h('div', { class: 'solid list' });
    const vulLijst = () => {
      lijst.replaceChildren(...s.leden.map((l, i) => h('div', { class: 'row' },
        h('span', { class: 'av', 'aria-hidden': 'true' }, l.voornaam.slice(0, 1).toUpperCase()),
        h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, l.voornaam, i === s.eigenaar ? h('span', { class: 'chip' }, 'jij · eigenaar') : null), h('span', { class: 't-small t-sec' }, l.woonplaats || 'Woonplaats onbekend')),
        h('button', { class: 'btn-plain', type: 'button', 'aria-pressed': String(i === s.eigenaar), 'aria-label': `${l.voornaam}: kies als eigenaar`, onclick: () => { s.eigenaar = i; teken(); } }, 'Ben ik'),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${l.voornaam} verwijderen`, onclick: () => { s.leden.splice(i, 1); if (s.eigenaar === i) s.eigenaar = -1; else if (s.eigenaar > i) s.eigenaar -= 1; teken(); } }, icoon(WEG, 18)))));
    };
    vulLijst();
    const nn = veld('wz-lid-naam', 'Naam', { type: 'text', maxlength: '40' }, '', () => {});
    const nw = veld('wz-lid-plaats', 'Woonplaats', { type: 'text', maxlength: '60' }, '', () => {});
    const voeg = () => {
      const voornaam = nn.el.value.trim();
      if (!voornaam) { toonFout(nn, 'Vul een naam in.'); return; }
      if (s.leden.length >= MAX_LEDEN) { toonFout(nn, `Een groep heeft hooguit ${MAX_LEDEN} leden.`); return; }
      s.leden.push({ voornaam, woonplaats: nw.el.value.trim() });
      teken();
      document.getElementById('wz-lid-naam')?.focus();
    };
    nn.el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); voeg(); } });
    nw.el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); voeg(); } });
    const fout = h('div', { hidden: !s.fouten, role: 'alert' }, s.fouten ? meldingBlok(s.fouten.algemeen) : null);
    return [
      kop(2, 'Wie gaan er mee?', `Groep ${s.naam.trim()}. Woonplaats is de startwaarde voor reistijd en carpool. Tik bij jezelf op Ben ik.`),
      s.leden.length ? lijst : null,
      h('section', { class: 'solid panel wz-nieuw' }, h('div', { class: 'wz-twee' }, nn.blok, nw.blok), h('button', { class: 'btn btn-ghost', type: 'button', onclick: voeg }, icoon(PLUS, 20), 'Lid toevoegen')),
      fout,
      h('div', { class: 'knoppen' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => ga(1) }, 'Vorige'),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
          if (s.leden.length < MIN_LEDEN) { s.fouten = { algemeen: `Voeg minstens ${MIN_LEDEN} leden toe.` }; teken(); return; }
          if (s.eigenaar < 0) { s.fouten = { algemeen: 'Kies welk lid jij bent met Ben ik.' }; teken(); return; }
          ga(3);
        } }, 'Volgende: wachtwoord')),
    ];
  }

  // Stap 3: beheerwachtwoord en opzetten.
  function wachtwoord() {
    const p1 = veld('wz-pw1', 'Nieuw wachtwoord', { type: 'password', autocomplete: 'new-password' }, s.pw1, (w) => { s.pw1 = w; telling(); });
    const p2 = veld('wz-pw2', 'Herhaal wachtwoord', { type: 'password', autocomplete: 'new-password' }, s.pw2, (w) => { s.pw2 = w; });
    const hint = h('p', { class: 'hint' });
    p1.blok.append(hint);
    const telling = () => {
      const n = s.pw1.length;
      hint.replaceChildren();
      hint.className = n >= MIN_WACHTWOORD ? 'hint herkend' : 'hint';
      if (n >= MIN_WACHTWOORD) hint.append(icoon(VINKJE, 16));
      hint.append(`${n} ${n === 1 ? 'teken' : 'tekens'}, minimaal ${MIN_WACHTWOORD}`);
    };
    telling();
    const algemeen = h('div', { hidden: true, role: 'alert' });
    if (s.fouten && s.fouten.algemeen) { algemeen.hidden = false; algemeen.append(meldingBlok(s.fouten.algemeen)); }
    const opzetten = h('button', { class: 'btn btn-primary', type: 'submit', 'data-schrijft': true }, 'Groep opzetten');
    const formulier = h('form', { class: 'glass card binnen-kaart', novalidate: true }, p1.blok, p2.blok, algemeen, opzetten);
    formulier.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (s.bezig) return;
      if (s.pw1.length < MIN_WACHTWOORD) { toonFout(p1, `Kies een wachtwoord van minimaal ${MIN_WACHTWOORD} tekens.`); return; }
      if (s.pw1 !== s.pw2) { toonFout(p2, 'De twee wachtwoorden zijn niet gelijk.'); return; }
      s.bezig = true;
      opzetten.disabled = true;
      try {
        const r = await api().anroep('groepOpzetten', {
          setupcode: normaliseer(s.code), groepsnaam: s.naam.trim(), leden: s.leden, eigenaar: s.eigenaar, wachtwoord: s.pw1,
        }, { schrijft: true });
        s.resultaat = r;
        s.pw1 = ''; s.pw2 = ''; s.code = ''; // GRP-4: niets blijft hangen na het opzetten
        s.fouten = null;
        s.stap = 4;
      } catch (err) {
        if (err.code === 'geen_toegang') {
          s.fouten = { code: 'De setupcode klopt niet of is verlopen. Kies in de Sheet Weekendje weg en Groep opzetten voor een nieuwe.' };
          s.stap = 1;
        } else {
          s.fouten = { algemeen: err.message || 'Er ging iets mis. Probeer het later opnieuw.' };
        }
      }
      s.bezig = false;
      teken();
    });
    return [
      kop(3, 'Kies je beheerwachtwoord', 'Met dit wachtwoord log je in op je beheerlink.'),
      formulier,
      h('div', { class: 'knoppen' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => ga(2) }, 'Vorige')),
    ];
  }

  // Stap 4: de beheerlink met kopieerknop en de uitleg om hem te bewaren (GRP-4, TOE-8).
  function klaar() {
    const link = beheerlinkVan(appAdres(), s.scriptId, s.resultaat.beheertoken);
    const veldLink = h('input', { id: 'wz-beheerlink', class: 'field', type: 'text', readonly: true, value: link, 'aria-label': 'Je beheerlink' });
    const status = h('p', { class: 'hint', role: 'status' });
    const kopieer = h('button', { class: 'btn btn-ghost', type: 'button', onclick: async () => {
      try {
        await navigator.clipboard.writeText(link);
        status.textContent = 'Gekopieerd.';
      } catch {
        veldLink.focus();
        veldLink.select();
        status.textContent = 'Kopiëren lukte niet. De link is geselecteerd, kopieer hem zelf.';
      }
    } }, icoon(KOPIE, 20), 'Kopieer de link');
    return [
      h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Groep opzetten · klaar'), h('h1', { class: 't-title' }, 'Je groep is opgezet'),
        h('p', { class: 't-body t-sec' }, `Dit is de beheerlink van ${s.leden[s.eigenaar].voornaam} voor ${s.naam.trim()}.`)),
      h('section', { class: 'glass card binnen-kaart' }, h('label', { class: 'label', for: 'wz-beheerlink' }, 'Beheerlink'), veldLink, kopieer, status),
      h('div', { class: 'solid panel wz-uitleg' },
        h('p', { class: 'priv' }, icoon(['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'], 16), h('span', {}, 'Bewaar deze link nu, bijvoorbeeld in je wachtwoordmanager. Hij staat nergens anders en de app kan hem niet nog eens tonen.')),
        h('p', { class: 'priv' }, icoon(['M12 7.5V12l3 2', 'M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0'], 16), h('span', {}, 'Kwijt? Kies in de Sheet het menu Weekendje weg en Beheerlink maken voor een nieuwe.'))),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => bijIngelogd({ scriptId: s.scriptId, sessie: s.resultaat.sessie, soort: s.resultaat.soort, verloopt: s.resultaat.verloopt, editieId: s.resultaat.editieId }) }, 'Naar beheren'),
    ];
  }

  function ga(stap) { s.stap = stap; s.fouten = null; s.linkFout = ''; teken(); }

  function teken() {
    const delen = [rondleiding, verbinden, leden, wachtwoord, klaar][s.stap]();
    wortel.replaceChildren(...delen.filter(Boolean));
  }

  teken();
  return wortel;
}
