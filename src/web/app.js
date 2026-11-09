// App-schil: binnenkomen met link en pincode (fase 3), beheerlogin en opzetwizard (fase 4), daarna router, stappenbalk, menu, offline-melding en service worker.
import { STAPPEN } from '../shared/stappen.js';
import { h, icoon } from './dom.js';
import { OFFLINE_TEKST, maakApi } from './api.js';
import { maakBinnenkomen } from './screens/pincode.js';
import { maakBeheerlogin } from './screens/beheerlogin.js';
import { maakOpzetten } from './screens/opzetten.js';
import { maakLeden } from './screens/leden.js';
import { leesLink, leesSessie, bewaarSessie, wisSessie, scriptUrl } from './sessie.js';
import { maakStappenbalk } from './components/stappenbalk.js';
import { registreer, routelijst, start, ververs } from './router.js';

// AAN-40: tot de schermen echte editiegegevens lezen toont de schil een voorbeeldeditie; de stap komt uit #/start?stap=...
const VOORBEELD = {
  titel: 'Studievrienden · Weekendje weg 2027',
  stapData: { invullen: '2026-12-01', overzicht: '2026-12-03', accommodatie: '2026-12-15' },
};

registreer('start', {
  titel: 'Start',
  icoon: ['m3 11 9-8 9 8', 'M5 10v10h5v-6h4v6h5V10'],
  render() {
    return h('section', { class: 'glass kaart' },
      h('h1', { class: 't-title' }, 'Weekendje weg'),
      h('p', { class: 't-body t-sec' }, 'Je bent ingelogd. Hier komt je startscherm.'),
      h('div', { class: 'start-acties' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: uitloggen }, 'Uitloggen')));
  },
});

// GRP-5: het beheerscherm; alleen zichtbaar voor een beheersessie.
registreer('leden', {
  titel: 'Leden',
  soort: 'beheer',
  icoon: ['M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20', 'M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7', 'M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3', 'M15.5 4.7a3.5 3.5 0 0 1 0 6.6'],
  render() {
    return maakLeden({ sessie: leesSessie(localStorage), uitloggen, bijVerlopen: () => { wisSessie(localStorage); kies(); } });
  },
});

const root = document.getElementById('app');
const balkPlek = h('div', { class: 'balk-plek' });
const inhoud = h('main', { class: 'inhoud', id: 'inhoud' });
const menu = h('nav', { class: 'glass menu', 'aria-label': 'Menu' });
const melding = h('div', { class: 'glass toast offline-melding', role: 'alert', hidden: true },
  h('span', { class: 'ico' }, icoon(['M3 3l18 18', 'M8.5 16.2a5 5 0 0 1 7 0', 'M5 12.6a10 10 0 0 1 4-2.3', 'M14.8 10.4A10 10 0 0 1 19 12.6', 'M2 9a15 15 0 0 1 4.3-2.6', 'M11 5.1A15 15 0 0 1 22 9', 'M12 19.5h.01'], 22)),
  h('span', {}, h('span', { class: 'titel' }, OFFLINE_TEKST)));
const schil = h('div', { class: 'schil', hidden: true }, menu, balkPlek, inhoud);
let binnen = null;
let schilGestart = false;
let laatsteSessie = '';
let geplakteBeheerlink = null; // TOE-11: een beheerlink uit het plakveld leidt naar de beheerlogin
root.append(schil, melding);

const soortNu = () => { const s = leesSessie(localStorage); return s ? s.soort : undefined; };

function toonMenu(actief) {
  menu.replaceChildren(...routelijst(soortNu()).map((r) => h('a', { href: `#/${r.naam}`, 'aria-current': r.naam === actief ? 'page' : false }, icoon(r.icoon, 24), h('span', {}, r.titel))));
}

function toonBalk(params) {
  if (soortNu() === 'beheer') { balkPlek.replaceChildren(); return; } // beheren hoort bij de groep, niet bij een editie
  const stap = STAPPEN.includes(params.stap) ? params.stap : 'invullen';
  balkPlek.replaceChildren(maakStappenbalk({ stap, stapData: VOORBEELD.stapData, titel: VOORBEELD.titel }));
}

// NFR-12: zonder verbinding blijft de schil staan, de melding verschijnt en opslaan wordt geblokkeerd.
function zetVerbinding() {
  const offline = !navigator.onLine;
  melding.hidden = !offline;
  document.documentElement.classList.toggle('is-offline', offline);
}
addEventListener('online', zetVerbinding);
addEventListener('offline', zetVerbinding);
zetVerbinding();

// TOE-1, TOE-2, TOE-11: zonder sessie (of met een link in het fragment) staat er alleen het pinscherm.
function kies() {
  const link = leesLink(location.hash);
  const sessie = link ? null : leesSessie(localStorage);
  binnen?.remove();
  binnen = null;
  schil.hidden = !sessie;
  if (sessie) {
    const sleutel = sessie.sessie;
    if (!schilGestart) { schilGestart = true; start(inhoud, (naam, params) => { toonMenu(naam); toonBalk(params); }, soortNu); } else if (sleutel !== laatsteSessie) ververs();
    laatsteSessie = sleutel;
    return;
  }
  laatsteSessie = '';
  const beheerlink = link && link.soort === 'beheer' ? link : geplakteBeheerlink;
  if (beheerlink) {
    binnen = maakBeheerlogin({ link: beheerlink, bijIngelogd, bijAnder });
  } else if (location.hash === '#/opzetten') {
    binnen = maakOpzetten({ bijIngelogd });
  } else {
    binnen = maakBinnenkomen({ link, startTekst: link ? location.href : '', bijIngelogd, bijBeheerlink: (l) => { geplakteBeheerlink = l; kies(); } });
  }
  root.prepend(binnen);
}

function bijAnder() {
  geplakteBeheerlink = null;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  kies();
}

function bijIngelogd(sessie) {
  geplakteBeheerlink = null;
  bewaarSessie(localStorage, sessie);
  history.replaceState(null, '', `${location.pathname}${location.search}#/${sessie.soort === 'beheer' ? 'leden' : 'start'}`); // de link blijft niet in de adresbalk staan
  kies();
}

// TOE-9: de sessie verdwijnt in de Sheet en op dit apparaat. AAN-42: lukt het script niet, dan wist het apparaat toch.
async function uitloggen() {
  const sessie = leesSessie(localStorage);
  if (sessie) {
    try {
      await maakApi({ basisUrl: scriptUrl(sessie.scriptId), sessie: () => sessie.sessie, editieId: () => sessie.editieId }).anroep('uitloggen', {}, { schrijft: true });
    } catch { /* AAN-42 */ }
  }
  wisSessie(localStorage);
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  kies();
}

addEventListener('hashchange', kies);
kies();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
