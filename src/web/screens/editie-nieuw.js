// Nieuwe editie maken (EDI-1). Ontwerp: docs/design/Uitnodigen.dc.html (stap 1 en 2 van 3).
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { BLOKKEN_STANDAARD, BLOKKEN_NAMEN, MAANDEN_STANDAARD, MAANDNAMEN, deadlineIso } from '../../shared/editie.js';

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const ALTIJD_AAN = 'Kalender, Budget, Reistijd en Verblijf staan altijd aan.';

// sessie: { scriptId, sessie }. bijKlaar(editieId) brengt de organisator naar het uitnodigen.
// params.van (ARC-2): het ID van een afgeronde editie waarvan leden, blokken, maanden en lijsten overgenomen worden.
export function maakEditieNieuw({ sessie, params = {}, bijVerlopen, bijKlaar, fetchFn, nu = () => new Date() }) {
  const wortel = h('section', { class: 'beheer' });
  const meldingTekst = h('p', { class: 't-small' });
  const melding = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), meldingTekst);
  const toonMelding = (t) => { meldingTekst.textContent = t || ''; melding.hidden = !t; };
  const anroep = maakBeheerApi({ sessie, bijVerlopen, toonMelding, fetchFn });

  function veld(id, label, attrs, waarde) {
    const el = h('input', { id, class: 'field', autocomplete: 'off', ...attrs });
    el.value = waarde;
    return { el, blok: h('div', {}, h('label', { class: 'label', for: id }, label), el) };
  }
  const vink = (id, label, aan, uit = false) => {
    const el = h('input', { id, type: 'checkbox', disabled: uit });
    el.checked = aan;
    return { el, blok: h('label', { class: 'ed-vink', for: id }, el, h('span', {}, label)) };
  };

  function teken(g) {
    const bron = params.van ? g.edities.find((e) => e.id === params.van && e.stap === 'afgerond') : null;
    const jaar = bron ? bron.jaar + 1 : nu().getFullYear() + 1;
    const doetMee = (lidId) => !bron || bron.deelnemers.some((d) => d.lidId === lidId);
    const isOrg = (lidId) => bron && bron.deelnemers.some((d) => d.lidId === lidId && d.rol === 'organisator');
    const titel = veld('ed-titel', 'Titel', { type: 'text', maxlength: '80' }, `${g.groep.naam} · Weekendje weg ${jaar}`);
    const jaarVeld = veld('ed-jaar', 'Jaar', { type: 'number', min: '2000', max: '2100', inputmode: 'numeric' }, String(jaar));
    const van = veld('ed-van', 'Periode van', { type: 'date' }, `${jaar}-04-01`);
    const tot = veld('ed-tot', 'Periode tot en met', { type: 'date' }, `${jaar}-10-31`);
    const deadline = veld('ed-deadline', 'Deadline invullen', { type: 'date' }, '');
    const maanden = MAANDNAMEN.map((naam, i) => ({ nr: i + 1, ...vink(`ed-maand-${i + 1}`, naam, (bron && bron.voorkeursmaanden.length ? bron.voorkeursmaanden : MAANDEN_STANDAARD).includes(i + 1)) }));
    const blokken = Object.keys(BLOKKEN_NAMEN).map((sleutel) => ({ sleutel, ...vink(`ed-blok-${sleutel}`, BLOKKEN_NAMEN[sleutel], bron ? Boolean(bron.blokken[sleutel]) : BLOKKEN_STANDAARD[sleutel]) }));
    const leden = g.leden.filter((l) => l.actief).map((l) => {
      const eigen = l.id === g.eigenLidId;
      const doet = vink(`ed-doet-${l.id}`, `${l.voornaam} doet mee`, eigen || doetMee(l.id), eigen);
      const org = vink(`ed-org-${l.id}`, `${l.voornaam} is organisator`, eigen || Boolean(isOrg(l.id)), eigen);
      return { lid: l, eigen, doet, org };
    });
    // Een organisator doet altijd mee; wie niet meedoet kan geen organisator zijn.
    for (const r of leden) {
      r.org.el.addEventListener('change', () => { if (r.org.el.checked) r.doet.el.checked = true; });
      r.doet.el.addEventListener('change', () => { if (!r.doet.el.checked) r.org.el.checked = false; });
    }
    const maak = h('button', { class: 'btn btn-primary', type: 'submit', 'data-schrijft': true }, 'Editie maken');
    const formulier = h('form', { class: 'beheer', novalidate: true },
      h('section', { class: 'glass card binnen-kaart' }, titel.blok, h('div', { class: 'wz-twee' }, jaarVeld.blok, deadline.blok), h('div', { class: 'wz-twee' }, van.blok, tot.blok),
        h('p', { class: 'hint' }, 'De deadline eindigt om 23:59.')),
      h('section', { class: 'solid panel wz-nieuw' }, h('h2', { class: 't-h2' }, 'Voorkeursmaanden'), h('div', { class: 'ed-raster' }, maanden.map((m) => m.blok))),
      h('section', { class: 'solid panel wz-nieuw' }, h('h2', { class: 't-h2' }, 'Onderdelen van het formulier'), h('p', { class: 't-small t-sec' }, ALTIJD_AAN), h('div', { class: 'ed-raster' }, blokken.map((b) => b.blok))),
      h('section', { class: 'solid panel wz-nieuw' }, h('h2', { class: 't-h2' }, 'Wie doen er mee?'), h('div', { class: 'list' }, leden.map((r) => h('div', { class: 'row ed-lid' },
        h('span', { class: 'av', 'aria-hidden': 'true' }, r.lid.voornaam.slice(0, 1).toUpperCase()),
        h('span', { class: 'rij-tekst' }, h('span', { class: 'rij-naam' }, r.lid.voornaam, r.eigen ? h('span', { class: 'chip' }, 'jij') : null)),
        h('span', { class: 'ed-keuzes' }, r.doet.blok, r.org.blok))))),
      melding, maak);
    formulier.addEventListener('submit', async (e) => {
      e.preventDefault();
      toonMelding('');
      if (!titel.el.value.trim()) { toonMelding('Geef de editie een titel.'); return; }
      if (!van.el.value || !tot.el.value) { toonMelding('Kies de periode waarin het weekend kan vallen.'); return; }
      if (tot.el.value < van.el.value) { toonMelding('De periode eindigt voor ze begint.'); return; }
      if (!deadline.el.value) { toonMelding('Kies een deadline om in te vullen.'); return; }
      const mee = leden.filter((r) => r.doet.el.checked);
      if (mee.length < 2) { toonMelding('Kies minstens twee deelnemers.'); return; }
      maak.disabled = true;
      const r = await anroep('editieAanmaken', {
        titel: titel.el.value.trim(), jaar: Number(jaarVeld.el.value), periodeVan: van.el.value, periodeTot: tot.el.value,
        voorkeursmaanden: maanden.filter((m) => m.el.checked).map((m) => m.nr), deadline: deadlineIso(deadline.el.value),
        blokken: Object.fromEntries(blokken.map((b) => [b.sleutel, b.el.checked])),
        deelnemers: mee.map((x) => x.lid.id), organisatoren: leden.filter((x) => x.org.el.checked).map((x) => x.lid.id),
        ...(bron ? { vanEditieId: bron.id } : {}),
      }, true);
      maak.disabled = false;
      if (r) bijKlaar(r.editie.id);
    });
    wortel.replaceChildren(
      h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Nieuwe editie'),
        h('p', { class: 't-body t-sec' }, bron ? `Leden, onderdelen en lijsten komen uit ${bron.titel}. Daarna maak je de links en pincodes om uit te nodigen.` : 'Daarna maak je de links en pincodes om uit te nodigen.')),
      formulier);
  }

  wortel.append(h('p', { class: 't-body t-sec' }, 'Laden…'), melding);
  anroep('scherm', { naam: 'beheer' }, false).then((g) => { if (g) teken(g); });
  return wortel;
}
