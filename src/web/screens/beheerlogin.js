// Beheerlogin (TOE-5): bij eerste gebruik een wachtwoord kiezen, daarna elke keer inloggen.
// Ontwerp: docs/design/Beheerlogin.dc.html. Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakApi } from '../api.js';
import { scriptUrl } from '../sessie.js';
import { tijdTekst } from './pincode.js';

const MIN_WACHTWOORD = 10;
const SLEUTEL = ['M3.5 15a4 4 0 1 0 8 0 4 4 0 0 0-8 0', 'm11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2'];
const KLOK = ['M12 7.5V12l3 2', 'M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0'];
const INFO = ['M12 11v5M12 8h.01', 'M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0'];
const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const VINKJE = 'm5 12.5 4.5 4.5L19 7.5';

// link: { scriptId, soort: 'beheer', token }. bijIngelogd(sessie) en bijAnder() komen van de schil.
export function maakBeheerlogin({ link, bijIngelogd, bijAnder, fetchFn }) {
  const api = maakApi({ basisUrl: scriptUrl(link.scriptId), ...(fetchFn ? { fetchFn } : {}) });
  let modus = 'laden'; // laden, instellen of inloggen
  let timer = null;

  const intro = h('p', { class: 't-body t-sec binnen-intro' });
  const pw1 = h('input', { id: 'bl-pw1', class: 'field', type: 'password', autocomplete: 'current-password' });
  const pw2 = h('input', { id: 'bl-pw2', class: 'field', type: 'password', autocomplete: 'new-password' });
  const label1 = h('label', { class: 'label', for: 'bl-pw1' }, 'Wachtwoord');
  const hint = h('p', { class: 'hint' });
  const blok2 = h('div', { hidden: true }, h('label', { class: 'label', for: 'bl-pw2' }, 'Herhaal wachtwoord'), pw2);
  const knop = h('button', { class: 'btn btn-primary', type: 'submit', 'data-schrijft': true, disabled: true }, 'Inloggen');
  const meldingTekst = h('p', { class: 't-small' });
  const melding = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), meldingTekst);
  const toonMelding = (t) => { meldingTekst.textContent = t || ''; melding.hidden = !t; };

  function telling() {
    hint.replaceChildren();
    hint.className = 'hint';
    if (modus !== 'instellen') return;
    const n = pw1.value.length;
    if (n >= MIN_WACHTWOORD) { hint.classList.add('herkend'); hint.append(icoon(VINKJE, 16)); }
    hint.append(`${n} ${n === 1 ? 'teken' : 'tekens'}, minimaal ${MIN_WACHTWOORD}`);
  }

  function zetModus(m) {
    modus = m;
    const instellen = m === 'instellen';
    label1.textContent = instellen ? 'Nieuw wachtwoord' : 'Wachtwoord';
    pw1.setAttribute('autocomplete', instellen ? 'new-password' : 'current-password');
    blok2.hidden = !instellen;
    knop.textContent = instellen ? 'Opslaan en beheren' : 'Inloggen';
    knop.disabled = m === 'laden';
    intro.textContent = instellen ? 'Kies een wachtwoord voor deze beheerlink. Je vult het hierna bij elke login in.' : 'Vul je wachtwoord in om te beheren.';
    telling();
  }
  zetModus('laden');

  // De voorkant weet niet of dit de eerste keer is; een lege poging vraagt het aan het script (telt niet als foute poging).
  api.anroep('inloggenBeheer', { token: link.token, wachtwoord: '' }, { schrijft: true })
    .then(() => zetModus('inloggen'), (f) => {
      zetModus(f.data && f.data.wachtwoordInstellen ? 'instellen' : 'inloggen');
      if (f.code === 'geblokkeerd') blokkeer(f);
      else if (f.code === 'offline' || f.code === 'api_versie') toonMelding(f.message);
    });

  pw1.addEventListener('input', telling);

  function blokkeer(f) {
    clearTimeout(timer);
    const tot = f.data && f.data.tot;
    if (!tot) { toonMelding(f.message); return; }
    const minuten = Math.max(1, Math.ceil((Date.parse(tot) - Date.now()) / 60000));
    toonMelding(`Vijf keer een verkeerd wachtwoord. Probeer het om ${tijdTekst(tot)} opnieuw, over ${minuten} ${minuten === 1 ? 'minuut' : 'minuten'}.`);
    pw1.disabled = true;
    knop.disabled = true;
    timer = setTimeout(() => { pw1.disabled = false; knop.disabled = false; toonMelding(''); }, Math.max(0, Date.parse(tot) - Date.now()));
  }

  const formulier = h('form', { class: 'glass card binnen-kaart', novalidate: true },
    melding,
    h('div', {}, label1, pw1, hint),
    blok2,
    knop);

  formulier.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (knop.disabled) return;
    toonMelding('');
    try {
      let r;
      if (modus === 'instellen') {
        if (pw1.value.length < MIN_WACHTWOORD) { toonMelding(`Kies een wachtwoord van minimaal ${MIN_WACHTWOORD} tekens.`); return; }
        if (pw1.value !== pw2.value) { toonMelding('De twee wachtwoorden zijn niet gelijk.'); return; }
        knop.disabled = true;
        r = await api.anroep('wachtwoordInstellen', { token: link.token, nieuw: pw1.value }, { schrijft: true });
      } else {
        knop.disabled = true;
        r = await api.anroep('inloggenBeheer', { token: link.token, wachtwoord: pw1.value }, { schrijft: true });
      }
      bijIngelogd({ scriptId: link.scriptId, sessie: r.sessie, soort: r.soort, verloopt: r.verloopt, editieId: r.editieId });
    } catch (f) {
      knop.disabled = false;
      pw1.value = '';
      pw2.value = '';
      telling();
      if (f.code === 'geblokkeerd') blokkeer(f); else toonMelding(f.message || 'Er ging iets mis. Probeer het later opnieuw.');
    }
  });

  return h('main', { class: 'binnen' },
    h('div', { class: 'binnen-kop' },
      h('span', { class: 'glass binnen-icoon' }, icoon(SLEUTEL, 30)),
      h('h1', { class: 't-title' }, 'Beheren'),
      intro),
    formulier,
    h('div', { class: 'solid panel wz-uitleg' },
      h('p', { class: 'priv' }, icoon(KLOK, 16), h('span', {}, 'Je blijft 12 uur ingelogd. Daarna vraagt de app opnieuw om je wachtwoord.')),
      h('p', { class: 'priv' }, icoon(INFO, 16), h('span', {}, 'Wachtwoord vergeten? De eigenaar van de Sheet zet het terug via het menu Weekendje weg.'))),
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => bijAnder() }, 'Andere link plakken'));
}
