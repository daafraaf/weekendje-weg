// App-schil (fase 2): router, stappenbalk, menu, offline-melding en service worker. Nog geen login.
import { STAPPEN } from '../shared/stappen.js';
import { h, icoon } from './dom.js';
import { OFFLINE_TEKST } from './api.js';
import { maakStappenbalk } from './components/stappenbalk.js';
import { registreer, routelijst, start } from './router.js';

// AAN-40: tot de login er is toont de schil een voorbeeldeditie; de stap komt uit #/start?stap=...
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
      h('p', { class: 't-body t-sec' }, 'Hier komt je startscherm zodra je bent ingelogd.'));
  },
});

const root = document.getElementById('app');
const balkPlek = h('div', { class: 'balk-plek' });
const inhoud = h('main', { class: 'inhoud', id: 'inhoud' });
const menu = h('nav', { class: 'glass menu', 'aria-label': 'Menu' });
const melding = h('div', { class: 'glass toast offline-melding', role: 'alert', hidden: true },
  h('span', { class: 'ico' }, icoon(['M3 3l18 18', 'M8.5 16.2a5 5 0 0 1 7 0', 'M5 12.6a10 10 0 0 1 4-2.3', 'M14.8 10.4A10 10 0 0 1 19 12.6', 'M2 9a15 15 0 0 1 4.3-2.6', 'M11 5.1A15 15 0 0 1 22 9', 'M12 19.5h.01'], 22)),
  h('span', {}, h('span', { class: 'titel' }, OFFLINE_TEKST)));
const schil = h('div', { class: 'schil' }, menu, balkPlek, inhoud);
root.append(schil, melding);

function toonMenu(actief) {
  menu.replaceChildren(...routelijst().map((r) => h('a', { href: `#/${r.naam}`, 'aria-current': r.naam === actief ? 'page' : false }, icoon(r.icoon, 24), h('span', {}, r.titel))));
}

function toonBalk(params) {
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

start(inhoud, (naam, params) => { toonMenu(naam); toonBalk(params); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
