// Nieuwe editie maken (EDI-1). Ontwerp: docs/design/Uitnodigen.dc.html (stap 1 en 2 van 3).
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { BLOKKEN_STANDAARD, BLOKKEN_NAMEN, MAANDEN_STANDAARD, MAANDNAMEN, deadlineIso } from '../../shared/editie.js';

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const JAREN_VOORUIT = 4;
const ALTIJD_AAN = 'Kalender, Budget, Reistijd en Verblijf staan altijd aan.';

// sessie: { scriptId, sessie }. bijKlaar(editieId) brengt de organisator naar het uitnodigen.
// params.van (ARC-2): het ID van een afgeronde editie waarvan leden, blokken, maanden en lijsten overgenomen worden.
export function maakEditieNieuw({ sessie, params = {}, bijVerlopen, bijKlaar, fetchFn, nu = () => new Date() }) {
  const wortel = h('section', { class: 'beheer' });
  const meldingTekst = h('p', { class: 't-small' });
  const melding = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), meldingTekst);
  const toonMelding = (t) => { meldingTekst.textContent = t || ''; melding.hidden = !t; };
  const anroep = maakBeheerApi({ sessie, bijVerlopen, toonMelding, fetchFn });

  // Elk veld kan een regel uitleg krijgen; die hangt met aria-describedby aan het veld.
  const uitleg = (id, tekst) => (tekst ? h('p', { class: 'hint', id: `${id}-uitleg` }, tekst) : null);
  function veld(id, label, attrs, waarde, tekst = '') {
    const el = h('input', { id, class: 'field', autocomplete: 'off', ...(tekst ? { 'aria-describedby': `${id}-uitleg` } : {}), ...attrs });
    el.value = waarde;
    return { el, blok: h('div', {}, h('label', { class: 'label', for: id }, label), el, uitleg(id, tekst)) };
  }
  // Het jaar is een keuzelijst: dit jaar en de ${JAREN_VOORUIT} jaren erna, plus het voorgestelde jaar als dat erbuiten valt.
  function jaarKeuze(id, label, gekozen, tekst) {
    const dit = nu().getFullYear();
    const jaren = [...new Set([...Array.from({ length: JAREN_VOORUIT + 1 }, (_, i) => dit + i), gekozen])].sort((a, b) => a - b);
    const el = h('select', { id, class: 'field', 'aria-describedby': `${id}-uitleg` }, jaren.map((j) => h('option', { value: String(j) }, String(j))));
    el.value = String(gekozen);
    return { el, blok: h('div', {}, h('label', { class: 'label', for: id }, label), el, uitleg(id, tekst)) };
  }
  const vink = (id, label, aan, uit = false) => {
    const el = h('input', { id, type: 'checkbox', disabled: uit });
    el.checked = aan;
    return { el, blok: h('label', { class: 'ed-vink', for: id }, el, h('span', {}, label)) };
  };

  // De maker gaf de organisatie aan een ander: uitleg over de beheerlink in plaats van door naar Uitnodigen (AAN-46).
  function tekenOvergedragen(titel, namen) {
    const wie = namen.length > 1 ? `${namen.slice(0, -1).join(', ')} en ${namen.at(-1)}` : namen[0];
    wortel.replaceChildren(
      h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Editie gemaakt'),
        h('p', { class: 't-body t-sec' }, `${wie} ${namen.length > 1 ? 'organiseren' : 'organiseert'} ${titel}. Jij beheert deze editie niet.`)),
      h('ol', { class: 'glass card wz-lijst' },
        ['Open de Sheet van de groep en kies in het menu Weekendje weg de optie Beheerlink maken. Kies de organisator en stuur de link door. Wie al een beheerlink heeft, gebruikt die.',
          'De organisator opent de beheerlink en kiest bij het eerste gebruik een eigen wachtwoord.',
          'De organisator kiest Beheren en Uitnodigen en maakt daar de links en pincodes voor de deelnemers.',
        ].map((tekst, i) => h('li', {}, h('span', { class: 'av' }, String(i + 1)), h('span', { class: 't-body' }, tekst)))),
      h('a', { class: 'btn btn-primary', href: '#/beheren' }, 'Terug naar Beheren'));
  }

  function teken(g) {
    const bron = params.van ? g.edities.find((e) => e.id === params.van && e.stap === 'afgerond') : null;
    const jaar = bron ? bron.jaar + 1 : nu().getFullYear() + 1;
    const doetMee = (lidId) => !bron || bron.deelnemers.some((d) => d.lidId === lidId);
    const isOrg = (lidId) => bron && bron.deelnemers.some((d) => d.lidId === lidId && d.rol === 'organisator');
    const titel = veld('ed-titel', 'Titel', { type: 'text', maxlength: '80' }, `${g.groep.naam} · Weekendje weg ${jaar}`);
    const jaarVeld = jaarKeuze('ed-jaar', 'Jaar', jaar, 'Het jaar waarin het weekend valt.');
    const van = veld('ed-van', 'Periode van', { type: 'date' }, `${jaar}-04-01`, 'De eerste dag waarop het weekend mag vallen.');
    const tot = veld('ed-tot', 'Periode tot en met', { type: 'date' }, `${jaar}-10-31`, 'De laatste dag. Deelnemers geven in de kalender aan wanneer ze in deze periode kunnen.');
    // Een ander jaar schuift de periode mee, zolang de datums nog in het vorige gekozen jaar liggen.
    let vorigJaar = String(jaar);
    jaarVeld.el.addEventListener('change', () => {
      for (const d of [van.el, tot.el]) if (d.value.startsWith(`${vorigJaar}-`)) d.value = `${jaarVeld.el.value}${d.value.slice(4)}`;
      vorigJaar = jaarVeld.el.value;
    });
    const deadline = veld('ed-deadline', 'Deadline invullen', { type: 'date' }, '', 'Tot en met deze dag (23:59) vult iedereen beschikbaarheid en wensen in. Twee tot drie weken na het uitnodigen is meestal genoeg. Daarna bekijk jij het overzicht en kies je de datum.');
    const maanden = MAANDNAMEN.map((naam, i) => ({ nr: i + 1, ...vink(`ed-maand-${i + 1}`, naam, (bron && bron.voorkeursmaanden.length ? bron.voorkeursmaanden : MAANDEN_STANDAARD).includes(i + 1)) }));
    const blokken = Object.keys(BLOKKEN_NAMEN).map((sleutel) => ({ sleutel, ...vink(`ed-blok-${sleutel}`, BLOKKEN_NAMEN[sleutel], bron ? Boolean(bron.blokken[sleutel]) : BLOKKEN_STANDAARD[sleutel]) }));
    const leden = g.leden.filter((l) => l.actief).map((l) => {
      const eigen = l.id === g.eigenLidId;
      const doet = vink(`ed-doet-${l.id}`, `${l.voornaam} doet mee`, eigen || doetMee(l.id));
      const org = vink(`ed-org-${l.id}`, `${l.voornaam} is organisator`, eigen || Boolean(isOrg(l.id)));
      return { lid: l, eigen, doet, org };
    });
    // Een organisator doet altijd mee; wie niet meedoet kan geen organisator zijn.
    for (const r of leden) {
      r.org.el.addEventListener('change', () => { if (r.org.el.checked) r.doet.el.checked = true; });
      r.doet.el.addEventListener('change', () => { if (!r.doet.el.checked) r.org.el.checked = false; });
    }
    const maak = h('button', { class: 'btn btn-primary', type: 'submit', 'data-schrijft': true }, 'Editie maken');
    const formulier = h('form', { class: 'beheer', novalidate: true },
      h('section', { class: 'glass card binnen-kaart' }, titel.blok, jaarVeld.blok,
        h('h2', { class: 't-h2' }, 'Wanneer kan het weekend vallen?'), h('div', { class: 'wz-twee' }, van.blok, tot.blok),
        h('h2', { class: 't-h2' }, 'Tot wanneer kan iedereen invullen?'), deadline.blok),
      h('section', { class: 'solid panel wz-nieuw' }, h('h2', { class: 't-h2' }, 'Voorkeursmaanden'), h('p', { class: 't-small t-sec' }, 'De maanden die jullie het liefst hebben. De kalender laat ze als eerste zien; andere maanden in de periode blijven mogelijk.'), h('div', { class: 'ed-raster' }, maanden.map((m) => m.blok))),
      h('section', { class: 'solid panel wz-nieuw' }, h('h2', { class: 't-h2' }, 'Onderdelen van het formulier'), h('p', { class: 't-small t-sec' }, ALTIJD_AAN), h('div', { class: 'ed-raster' }, blokken.map((b) => b.blok))),
      h('section', { class: 'solid panel wz-nieuw' }, h('h2', { class: 't-h2' }, 'Wie doen er mee?'), h('p', { class: 't-small t-sec' }, 'Vink aan wie meegaat en wie het weekend regelt. Regelt iemand anders het, zet dan je eigen vinkje bij organisator uit; die persoon heeft een beheerlink nodig.'), h('div', { class: 'list' }, leden.map((r) => h('div', { class: 'row ed-lid' },
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
      const organisatoren = leden.filter((x) => x.org.el.checked);
      if (!organisatoren.length) { toonMelding('Kies minstens één organisator.'); return; }
      const zelf = organisatoren.some((x) => x.eigen);
      maak.disabled = true;
      const r = await anroep('editieAanmaken', {
        titel: titel.el.value.trim(), jaar: Number(jaarVeld.el.value), periodeVan: van.el.value, periodeTot: tot.el.value,
        voorkeursmaanden: maanden.filter((m) => m.el.checked).map((m) => m.nr), deadline: deadlineIso(deadline.el.value),
        blokken: Object.fromEntries(blokken.map((b) => [b.sleutel, b.el.checked])),
        deelnemers: mee.map((x) => x.lid.id), organisatoren: organisatoren.map((x) => x.lid.id),
        ...(zelf ? {} : { zonderMaker: true }),
        ...(bron ? { vanEditieId: bron.id } : {}),
      }, true);
      maak.disabled = false;
      if (!r) return;
      if (zelf) bijKlaar(r.editie.id);
      else tekenOvergedragen(r.editie.titel, organisatoren.map((x) => x.lid.voornaam));
    });
    wortel.replaceChildren(
      h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Nieuwe editie'),
        h('p', { class: 't-body t-sec' }, bron ? `Leden, onderdelen en lijsten komen uit ${bron.titel}. Daarna maak je de links en pincodes om uit te nodigen.` : 'Een editie is één weekend weg. Je legt hier vast wanneer het kan en wie er meedoen. Daarna maak je de links en pincodes om uit te nodigen.')),
      h('ol', { class: 'solid panel ed-route' }, ['Editie maken', 'Iedereen uitnodigen met link en pincode', 'Iedereen vult in tot de deadline', 'Jij kiest de datum uit het overzicht'].map((tekst) => h('li', { class: 't-small' }, tekst))),
      formulier);
  }

  wortel.append(h('p', { class: 't-body t-sec' }, 'Laden…'), melding);
  anroep('scherm', { naam: 'beheer' }, false).then((g) => { if (g) teken(g); });
  return wortel;
}
