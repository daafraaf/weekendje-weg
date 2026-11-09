// App-schil: binnenkomen met link en pincode (fase 3), beheerlogin en opzetwizard (fase 4), daarna router, stappenbalk, menu, offline-melding en service worker.
import { STAPPEN } from '../shared/stappen.js';
import { h, icoon } from './dom.js';
import { OFFLINE_TEKST, maakApi } from './api.js';
import { maakBinnenkomen } from './screens/pincode.js';
import { maakBeheerlogin } from './screens/beheerlogin.js';
import { maakOpzetten } from './screens/opzetten.js';
import { maakLeden } from './screens/leden.js';
import { maakEditieNieuw } from './screens/editie-nieuw.js';
import { maakUitnodigen } from './screens/uitnodigen.js';
import { maakLijstenBeheer } from './screens/lijsten-beheer.js';
import { maakVragenBeheer } from './screens/vragen-beheer.js';
import { leesLink, leesSessie, bewaarSessie, wisSessie, scriptUrl } from './sessie.js';
import { maakStappenbalk } from './components/stappenbalk.js';
import { maakFormulier } from './screens/formulier.js';
import { maakVoortgang } from './screens/voortgang.js';
import { maakOverzicht } from './screens/overzicht.js';
import { maakDetail } from './screens/detail.js';
import { maakStappenBeheer } from './screens/stappen-beheer.js';
import { maakPosten } from './screens/posten.js';
import { maakAfrekening } from './screens/afrekening.js';
import { maakAccommodaties } from './screens/accommodaties.js';
import { maakAccommodatieBeheer } from './screens/accommodatie-beheer.js';
import { maakMeenemen } from './screens/meenemen.js';
import { maakBoodschappen } from './screens/boodschappen.js';
import { maakKookbeurten } from './screens/kookbeurten.js';
import { maakProgramma, maakProgrammaVandaag } from './screens/programma.js';
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
      soortNu() === 'deelnemer' ? maakProgrammaVandaag({ sessie: leesSessie(localStorage), bijVerlopen: () => { wisSessie(localStorage); kies(); } }) : null,
      h('div', { class: 'start-acties' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: uitloggen }, 'Uitloggen')));
  },
});

// FRM-1: het invulformulier met de kalender als eerste blok; AAN-50 vervalt, de losse kalenderroute is weg.
registreer('formulier', {
  titel: 'Invullen',
  soort: 'deelnemer',
  icoon: ['M5 6h14v14H5z', 'M5 10h14', 'M9 3v4M15 3v4'],
  render() {
    return maakFormulier({ sessie: leesSessie(localStorage), bijVerlopen: () => { wisSessie(localStorage); kies(); } });
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

// EDI-1: een nieuwe editie maken; EDI-4, EDI-5, EDI-6: uitnodigen, vernieuwen en een beheerlink voor een lid.
const bijVerlopenBeheer = () => { wisSessie(localStorage); kies(); };
registreer('editie-nieuw', {
  titel: 'Nieuwe editie',
  soort: 'beheer',
  icoon: ['M5 6h14v14H5z', 'M5 10h14', 'M9 3v4M15 3v4', 'M12 13v4M10 15h4'],
  render() {
    return maakEditieNieuw({ sessie: leesSessie(localStorage), bijVerlopen: bijVerlopenBeheer, bijKlaar: (id) => { location.hash = `#/uitnodigen?editie=${id}`; } });
  },
});

registreer('uitnodigen', {
  titel: 'Uitnodigen',
  soort: 'beheer',
  icoon: ['M4 6.5h16v11H4z', 'm4.5 7 7.5 6 7.5-6'],
  render(params) {
    return maakUitnodigen({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenBeheer });
  },
});

// EDI-2: blokken en lijsten van de editie; EDI-3: eigen vragen.
registreer('lijsten-beheer', {
  titel: 'Lijsten',
  soort: 'beheer',
  icoon: ['M9 6h11M9 12h11M9 18h11', 'M4 6h.01M4 12h.01M4 18h.01'],
  render(params) {
    return maakLijstenBeheer({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenBeheer });
  },
});

registreer('vragen-beheer', {
  titel: 'Vragen',
  soort: 'beheer',
  icoon: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18', 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5', 'M12 17h.01'],
  render(params) {
    return maakVragenBeheer({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenBeheer });
  },
});

// OVZ-1, OVZ-2: wie heeft ingevuld; de organisator ziet ook de herinnering.
const bijVerlopenSessie = () => { wisSessie(localStorage); kies(); };
registreer('voortgang', {
  titel: 'Voortgang',
  icoon: ['M5 12.5 9.5 17 19 7.5'],
  render(params) {
    return maakVoortgang({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// OVZ-3 t/m OVZ-5: het overlapoverzicht zonder namen.
registreer('overzicht', {
  titel: 'Overzicht',
  icoon: ['M4 20V10M10 20V4M16 20v-7M22 20H2'],
  render(params) {
    return maakOverzicht({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// OVZ-6: per persoon, alleen voor de organisator.
registreer('detail', {
  titel: 'Per persoon',
  soort: 'beheer',
  icoon: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7', 'M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5', 'M17 8h5M17 12h5M19 16h3'],
  render(params) {
    return maakDetail({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenBeheer });
  },
});

// EDI-7, EDI-8, EDI-10: stap zetten, verwachte data en deadline.
registreer('stappen', {
  titel: 'Stappen',
  soort: 'beheer',
  icoon: ['M4 12h12', 'm12 6 6 6-6 6', 'M20 5v14'],
  render(params) {
    return maakStappenBeheer({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenBeheer });
  },
});

// GELD-1 t/m GELD-7: posten, verdeling en saldi; voor deelnemers en de organisator.
registreer('posten', {
  titel: 'Geld',
  icoon: ['M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2', 'M3 10h18M16 15h2'],
  render(params) {
    return maakPosten({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// GELD-8 t/m GELD-11, EDI-9: afrekening, betalingen afvinken, betaalverzoek en afhaken.
registreer('afrekening', {
  titel: 'Afrekening',
  icoon: ['M4 7h13l-3-3M20 17H7l3 3'],
  render(params) {
    return maakAfrekening({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// ACC-3 t/m ACC-5: de accommodaties van de groep (info, stemmen of geboekt).
registreer('accommodaties', {
  titel: 'Accommodatie',
  icoon: ['M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z'],
  render(params) {
    return maakAccommodaties({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// ACC-1, ACC-2, ACC-3, ACC-5: weekend vastleggen en accommodaties beheren, alleen voor de organisator.
registreer('accommodatie-beheer', {
  titel: 'Accommodaties beheren',
  soort: 'beheer',
  icoon: ['M3.5 20V9l8.5-5.5L20.5 9v11', 'M9 20v-6h6v6M3 20h18'],
  render(params) {
    return maakAccommodatieBeheer({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenBeheer });
  },
});

// MEE-1 t/m MEE-4: spullen, uit eigen keuken en boodschappen, met claims.
registreer('meenemen', {
  titel: 'Meenemen',
  icoon: ['M5 8h14l-1.2 11a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z', 'M9 8V6.5a3 3 0 0 1 6 0V8'],
  render(params) {
    return maakMeenemen({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// MEE-5 t/m MEE-9: de boodschappenlijst op supermarktvolgorde.
registreer('boodschappen', {
  titel: 'Boodschappen',
  icoon: ['M4 5h2l2 10h9l2-7H7', 'M10 19.5h.01M17 19.5h.01'],
  render(params) {
    return maakBoodschappen({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// KOK-1 t/m KOK-4: maaltijden met koks, ingrediënten en eetwensen.
registreer('kookbeurten', {
  titel: 'Kookbeurten',
  icoon: ['M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z', 'M8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2'],
  render(params) {
    return maakKookbeurten({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// PRG-1, PRG-2: het weekendprogramma per dag; de organisator beheert het hier.
registreer('programma', {
  titel: 'Programma',
  icoon: ['M5 6h14v14H5z', 'M5 10h14', 'M9 3v4M15 3v4', 'M9 14h6'],
  render(params) {
    return maakProgramma({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
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
