// Rondleiding (RON-1 t/m RON-4, spec §7.1.8). Ontwerp: docs/design/Rondleiding.dc.html.
// Vijf schermen: welkom, pincode bewaren, op het beginscherm zetten, de stappenbalk, waar je begint.
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { herkenPlatform, installatieVoor, kanInstalleren, bijInstalleerbaar, installeer } from '../platform.js';

export const RONDLEIDING_SLEUTEL = 'ww-rondleiding';

// AAN-73: de rondleiding volgt de volgorde uit de spec (installatie als derde scherm, niet als vierde zoals op het bord)
// en verschijnt vanzelf alleen voor deelnemers, één keer per apparaat; wie hem afsluit of overslaat, ziet hem niet opnieuw.
export const rondleidingGezien = (opslag) => opslag.getItem(RONDLEIDING_SLEUTEL) === '1';
export const zetRondleidingGezien = (opslag) => opslag.setItem(RONDLEIDING_SLEUTEL, '1');

const DEEL = ['M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7'];
const INFO = ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17', 'M12 11v5M12 8h.01'];
const APPARATEN = [['iphone', 'iPhone'], ['android', 'Android'], ['laptop', 'Laptop']];

// Stappen per uitleg (RON-2). Een stap is een lijst met tekst, <b>-delen en het deel-pictogram.
const B = (t) => ({ vet: t });
const DEEL_ICOON = { deel: true };
const UITLEG = {
  'ios-safari': {
    stappen: [['Open deze pagina in Safari.'], ['Tik onderaan op Deel ', DEEL_ICOON, '.'], ['Kies ', B('Zet op beginscherm'), ' en tik op Voeg toe.'], ['Open Weekendje weg vanaf je beginscherm en plak daar je link.']],
    noot: 'Op iPhone deelt de app zijn opslag niet met Safari. Plak je link daarom pas in de geïnstalleerde app.',
    kopieer: true,
  },
  'ios-ander': {
    stappen: [['Kopieer je link met de knop hieronder.'], ['Open Safari en plak de link in de adresbalk. Op iPhone kan alleen Safari de app op het beginscherm zetten.'], ['Tik onderaan op Deel ', DEEL_ICOON, ' en kies ', B('Zet op beginscherm'), '.'], ['Open Weekendje weg vanaf je beginscherm en plak daar je link.']],
    noot: 'Op iPhone deelt de app zijn opslag niet met Safari. Plak je link daarom pas in de geïnstalleerde app.',
    kopieer: true,
  },
  'android-chrome': {
    stappen: [['Tik rechtsboven in Chrome op het menu met de drie puntjes.'], ['Kies ', B('Installeren'), ' of ', B('App installeren'), '.'], ['Open Weekendje weg daarna vanaf je beginscherm.']],
    noot: 'Staat er een knop Installeren hieronder, gebruik dan die.',
    installeren: true,
  },
  'desktop-chromium': {
    stappen: [['Klik rechts in de adresbalk op het installatiepictogram, of open het menu met de drie puntjes.'], ['Kies ', B('Weekendje weg installeren'), '.'], ['Open de app daarna vanuit je startmenu of dock.']],
    noot: 'Staat er een knop Installeren hieronder, gebruik dan die.',
    installeren: true,
  },
  bladwijzer: {
    stappen: [['Zet een bladwijzer van deze pagina in je browser.'], ['Open de app voortaan via die bladwijzer.']],
    noot: 'Deze browser kan de app niet installeren. Met een bladwijzer ben je er net zo snel.',
  },
};

function stapTekst(delen) {
  return delen.map((d) => (typeof d === 'string' ? d : d.vet ? h('b', {}, d.vet) : icoon(DEEL, 18)));
}

// opslag: localStorage; link: de persoonlijke link als de app hem nog in het geheugen heeft, anders null.
// bijKlaar() na Klaar of Overslaan. ua en maxTouchPoints komen uit navigator en zijn te vervangen voor tests.
export function maakRondleiding({ opslag, link = null, bijKlaar, ua = globalThis.navigator?.userAgent || '', maxTouchPoints = globalThis.navigator?.maxTouchPoints || 0 }) {
  const herkend = herkenPlatform(ua, maxTouchPoints);
  let apparaat = herkend.apparaat;
  let nu = 0;
  const TOTAAL = 5;

  const klaar = () => { zetRondleidingGezien(opslag); bijKlaar(); };

  const punten = h('div', { class: 'ron-punten', role: 'img' });
  const overslaan = h('button', { class: 'btn btn-plain ron-overslaan', type: 'button', onclick: klaar }, 'Overslaan');
  const kop = h('div', { class: 'ron-tekst' });
  const inhoud = h('div', { class: 'ron-inhoud' });
  const vorige = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { nu -= 1; teken(); } }, 'Vorige');
  const volgende = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { if (nu === TOTAAL - 1) klaar(); else { nu += 1; teken(); } } });

  function installatieScherm() {
    const uitleg = UITLEG[installatieVoor(apparaat, herkend)];
    const blokken = [];
    blokken.push(h('div', { class: 'segm', role: 'group', 'aria-label': 'Apparaat' }, APPARATEN.map(([sleutel, naam]) => h('button', {
      type: 'button', 'aria-pressed': sleutel === apparaat ? 'true' : 'false', onclick: () => { apparaat = sleutel; teken(); },
    }, naam))));
    blokken.push(h('ol', { class: 'glass card ron-stappen' }, uitleg.stappen.map((s, i) => h('li', {}, h('span', { class: 'ron-nr' }, String(i + 1)), h('span', { class: 't-body' }, stapTekst(s))))));
    if (uitleg.kopieer) blokken.push(kopieerKnop());
    if (uitleg.installeren) blokken.push(installeerKnop());
    blokken.push(h('div', { class: 'solid panel ron-noot' }, icoon(INFO, 20), h('p', { class: 't-small' }, uitleg.noot)));
    return blokken;
  }

  // RON-2, AAN-72: "Kopieer mijn link" werkt alleen als de app de link in het geheugen heeft (net ingelogd); later staat hij nergens meer.
  function kopieerKnop() {
    if (!link) return h('p', { class: 't-small t-sec ron-kopieer-hint' }, 'Je link staat in het bericht van je organisator. Kopieer hem daar.');
    const melding = h('p', { class: 't-small t-sec', role: 'status' });
    const knop = h('button', { class: 'btn btn-ghost', type: 'button', onclick: async () => {
      try { await navigator.clipboard.writeText(link); melding.textContent = 'Link gekopieerd.'; } catch { melding.textContent = 'Kopiëren lukte niet. Kopieer de link uit het bericht van je organisator.'; }
    } }, 'Kopieer mijn link');
    return h('div', { class: 'ron-kopieer' }, knop, melding);
  }

  // RON-3: de knop Installeren verschijnt zodra de browser beforeinstallprompt heeft gestuurd.
  function installeerKnop() {
    const knop = h('button', { class: 'btn btn-primary', type: 'button', hidden: !kanInstalleren(), onclick: () => { installeer(); } }, 'Installeren');
    const af = bijInstalleerbaar(() => { knop.hidden = !kanInstalleren(); if (!knop.isConnected) af(); });
    return knop;
  }

  const SCHERMEN = [
    () => ({ cap: 'Welkom', titel: 'Welkom bij Weekendje weg', tekst: 'Met je vrienden plan je elk jaar één weekend weg: je vult je beschikbaarheid in, kiest samen een datum en een plek en rekent aan het eind af.', blokken: [] }),
    () => ({ cap: 'Pincode', titel: 'Bewaar je pincode', tekst: 'Je pincode krijg je één keer, los van je link. Bewaar hem in je wachtwoordmanager of in een notitie. Kwijt? Je organisator maakt een nieuwe.', blokken: [] }),
    () => ({ cap: 'Beginscherm', titel: 'Zet de app op je beginscherm', tekst: 'Dan open je hem met één tik en blijf je ingelogd.', blokken: installatieScherm() }),
    () => ({ cap: 'Stappenbalk', titel: 'De stappenbalk bovenaan', tekst: 'Bovenaan zie je in welke stap het plannen zit, van invullen tot afrekenen. Tik erop voor de datum waarop de volgende stap verwacht wordt.', blokken: [] }),
    () => ({ cap: 'Beginnen', titel: 'Hier begin je', tekst: 'Open Invullen en geef aan wanneer je kunt en wat je wilt. Zodra iedereen klaar is, ziet de groep het overlapoverzicht. Deze uitleg vind je later terug in het menu onder Uitleg.', blokken: [] }),
  ];

  function teken() {
    const s = SCHERMEN[nu]();
    punten.setAttribute('aria-label', `Scherm ${nu + 1} van ${TOTAAL}`);
    punten.replaceChildren(...Array.from({ length: TOTAAL }, (_, i) => h('span', { class: i === nu ? 'ron-punt nu' : i < nu ? 'ron-punt klaar' : 'ron-punt' })));
    kop.replaceChildren(h('p', { class: 't-cap' }, `Rondleiding · ${nu + 1} van ${TOTAAL} · ${s.cap}`), h('h1', { class: 't-title' }, s.titel), h('p', { class: 't-body t-sec' }, s.tekst));
    inhoud.replaceChildren(...s.blokken);
    vorige.hidden = nu === 0;
    volgende.textContent = nu === TOTAAL - 1 ? 'Klaar' : 'Volgende';
    overslaan.hidden = nu === TOTAAL - 1;
  }

  teken();
  return h('section', { class: 'ron', 'aria-label': 'Rondleiding' },
    h('div', { class: 'ron-bovenkant' }, punten, overslaan), kop, inhoud,
    h('div', { class: 'ron-knoppen' }, vorige, volgende));
}
