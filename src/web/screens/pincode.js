// Binnenkomen: link plakken en pincode (TOE-1 t/m TOE-4, TOE-11). Ontwerp: docs/design/Binnenkomen.dc.html
// en T-Blokkade.dc.html. Alle tekst gaat via textContent (NFR-5); zonder sessie staat hier geen naam of editie.
import { h, icoon } from '../dom.js';
import { maakApi } from '../api.js';
import { leesLink, scriptUrl } from '../sessie.js';

const LENGTE = 6;
const SLOT = ['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const VINKJE = 'm5 12.5 4.5 4.5L19 7.5';

export function tijdTekst(iso) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

// beginLink: { scriptId, soort, token } uit het fragment, of null als er geplakt moet worden.
// startTekst: de tekst die in het veld staat. bijIngelogd(sessie) krijgt { scriptId, sessie, soort, verloopt, editieId }.
export function maakBinnenkomen({ link: beginLink = null, startTekst = '', bijIngelogd, fetchFn }) {
  let link = beginLink;
  let timer = null;

  const veld = h('input', { id: 'plak-link', class: 'field', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'https://…/#b=…' });
  veld.value = startTekst;
  const herkend = h('p', { class: 'hint' });
  const velden = Array.from({ length: LENGTE }, (_, i) => h('input', {
    type: 'password', inputmode: 'numeric', autocomplete: i === 0 ? 'one-time-code' : 'off', 'aria-label': `Cijfer ${i + 1}`,
  }));
  const pinGroep = h('fieldset', { class: 'pin-groep' }, h('legend', { class: 'label' }, 'Je pincode, zes cijfers'), h('div', { class: 'pin' }, velden));
  const knop = h('button', { class: 'btn btn-primary', type: 'submit', 'data-schrijft': true }, 'Inloggen');
  const meldingTekst = h('p', { class: 't-small' });
  const melding = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), meldingTekst);
  const beheerNotitie = h('p', { class: 't-small t-sec', hidden: true }, 'Dit is een beheerlink. Inloggen als organisator komt in een volgende versie van de app.');

  const pin = () => velden.map((x) => x.value).join('');
  const bijwerken = () => {
    const deelnemer = Boolean(link) && link.soort === 'deelnemer';
    pinGroep.hidden = Boolean(link) && !deelnemer;
    knop.hidden = Boolean(link) && !deelnemer;
    beheerNotitie.hidden = !(link && link.soort === 'beheer');
    knop.disabled = !(deelnemer && pin().length === LENGTE && !pinGroep.disabled);
  };
  const toonMelding = (tekst) => {
    meldingTekst.textContent = tekst || '';
    melding.hidden = !tekst;
  };
  const wisPin = () => { velden.forEach((x) => { x.value = ''; }); velden[0].focus(); bijwerken(); };

  function zetHerkend() {
    herkend.replaceChildren();
    herkend.className = 'hint';
    if (link) {
      herkend.classList.add('herkend');
      herkend.append(icoon(VINKJE, 16), 'Link herkend');
    } else if (veld.value.trim()) {
      herkend.classList.add('niet-herkend');
      herkend.append('Dit lijkt geen persoonlijke link.');
    }
  }

  veld.addEventListener('input', () => {
    link = leesLink(veld.value);
    zetHerkend();
    toonMelding('');
    bijwerken();
  });

  // Zes losse vakjes: cijfers schuiven door; plakken en automatisch invullen verdelen de cijfers.
  function vul(vanaf, cijfers) {
    for (let k = 0; k < cijfers.length && vanaf + k < LENGTE; k++) velden[vanaf + k].value = cijfers[k];
    velden[Math.min(vanaf + cijfers.length, LENGTE - 1)].focus();
    bijwerken();
  }
  velden.forEach((el, i) => {
    el.addEventListener('focus', () => el.select());
    el.addEventListener('input', () => {
      const cijfers = el.value.replace(/\D/g, '');
      el.value = '';
      if (cijfers) vul(i, cijfers); else bijwerken();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !el.value && i > 0) { velden[i - 1].value = ''; velden[i - 1].focus(); bijwerken(); e.preventDefault(); }
    });
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      vul(i, (e.clipboardData ? e.clipboardData.getData('text') : '').replace(/\D/g, ''));
    });
  });

  // TOE-3: toont tot wanneer het token geblokkeerd is. TOE-4: bij een permanente blokkade volgt de melding van het script.
  function blokkeer(f) {
    clearTimeout(timer);
    pinGroep.disabled = true;
    const d = f.data || {};
    if (d.tot) {
      const tot = Date.parse(d.tot);
      const minuten = Math.max(1, Math.ceil((tot - Date.now()) / 60000));
      toonMelding(`Vijf keer een verkeerde pincode. Probeer het om ${tijdTekst(d.tot)} opnieuw, over ${minuten} ${minuten === 1 ? 'minuut' : 'minuten'}.`);
      timer = setTimeout(() => { pinGroep.disabled = false; toonMelding(''); bijwerken(); }, Math.max(0, tot - Date.now()));
    } else {
      toonMelding(f.message);
    }
    velden.forEach((x) => { x.value = ''; });
    bijwerken();
  }

  const formulier = h('form', { class: 'glass card binnen-kaart', novalidate: true },
    h('div', {}, h('label', { class: 'label', for: 'plak-link' }, 'Plak je persoonlijke link'), veld, herkend),
    melding, pinGroep, beheerNotitie, knop);

  formulier.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (knop.disabled || !link) return;
    toonMelding('');
    knop.disabled = true;
    try {
      const api = maakApi({ basisUrl: scriptUrl(link.scriptId), ...(fetchFn ? { fetchFn } : {}) });
      const r = await api.anroep('inloggenDeelnemer', { token: link.token, pin: pin() }, { schrijft: true });
      bijIngelogd({ scriptId: link.scriptId, sessie: r.sessie, soort: r.soort, verloopt: r.verloopt, editieId: r.editieId });
    } catch (f) {
      if (f.code === 'geblokkeerd') {
        blokkeer(f);
      } else {
        toonMelding(f.message || 'Er ging iets mis. Probeer het later opnieuw.');
        wisPin();
      }
    }
  });

  zetHerkend();
  bijwerken();

  return h('main', { class: 'binnen' },
    h('div', { class: 'binnen-kop' },
      h('img', { src: 'icons/icon-192.png', width: 72, height: 72, alt: 'App-icoon Weekendje weg' }),
      h('h1', { class: 't-title' }, 'Weekendje weg'),
      h('p', { class: 't-body t-sec' }, 'Plan samen één weekend per jaar, van datum tot afrekening.')),
    formulier,
    h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Link en pincode krijg je in twee losse berichten van je organisator. Ze blijven alleen op dit apparaat.')));
}
