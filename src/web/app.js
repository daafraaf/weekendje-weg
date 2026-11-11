// App-schil: binnenkomen met link en pincode (fase 3), beheerlogin en opzetwizard (fase 4), daarna router, stappenbalk, menu, offline-melding en service worker.
import { h, icoon } from './dom.js';
import { OFFLINE_TEKST, maakApi, bijBezig } from './api.js';
import { maakBinnenkomen } from './screens/pincode.js';
import { maakBeheerlogin } from './screens/beheerlogin.js';
import { maakOpzetten } from './screens/opzetten.js';
import { maakLeden } from './screens/leden.js';
import { maakEditieNieuw } from './screens/editie-nieuw.js';
import { maakUitnodigen } from './screens/uitnodigen.js';
import { maakLijstenBeheer } from './screens/lijsten-beheer.js';
import { maakVragenBeheer } from './screens/vragen-beheer.js';
import { leesLink, leesOpzetlink, isOpzetPad, leesSessie, bewaarSessie, wisSessie, scriptUrl, persoonlijkeLinkVan } from './sessie.js';
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
import { maakProgramma } from './screens/programma.js';
import { maakStart } from './screens/start.js';
import { maakArchief } from './screens/archief.js';
import { maakBeheren } from './screens/beheren.js';
import { maakMenuItems } from './components/menu.js';
import { maakProfielmenu } from './components/profielmenu.js';
import { maakKamers } from './screens/kamers.js';
import { maakCarpool } from './screens/carpool.js';
import { maakRondleiding, rondleidingGezien } from './screens/rondleiding.js';
import { luisterNaarInstallatie, kanInstalleren, installeer } from './platform.js';
import { registreer, routelijst, start, ververs } from './router.js';
import { onderdeelAan } from '../shared/onderdelen.js';
import { maakWachtrij } from './wachtrij.js';
import { maakSyncIndicator } from './components/sync.js';

// SYNC-1 t/m SYNC-7: één wachtrij voor alle kleine handelingen, per sessie-eigenaar bewaard (zonder geheimen).
const wachtrij = maakWachtrij({
  opslag: localStorage,
  eigenaar: () => { const s = leesSessie(localStorage); return s ? `${s.scriptId}:${s.soort}:${s.editieId || ''}` : ''; },
  online: () => navigator.onLine,
  async verstuur(acties, editieId) {
    const s = leesSessie(localStorage);
    if (!s) throw Object.assign(new Error(''), { code: 'verlopen' });
    const api = maakApi({ basisUrl: scriptUrl(s.scriptId), sessie: () => s.sessie, editieId: () => editieId || s.editieId || '' });
    try {
      return await api.anroep('bundel', { acties }, { schrijft: true, stil: true });
    } catch (f) {
      if (f.code === 'verlopen') { wisSessie(localStorage); kies(); }
      throw f;
    }
  },
});

// OND-1, OND-2: een onderdeel dat uitstaat wordt niet geregistreerd, dus geen route, geen menu-item en geen scherm op zijn adres.
const registreerOnderdeel = (naam, def) => { if (onderdeelAan(naam)) registreer(naam, def); };

registreer('start', {
  titel: 'Start',
  icoon: ['m3 11 9-8 9 8', 'M5 10v10h5v-6h4v6h5V10'],
  render(params) {
    return maakStart({ sessie: leesSessie(localStorage), params, bijVerlopen: () => { wisSessie(localStorage); kies(); }, bijStand: zetStandVanStart });
  },
});

// ARC-1: alle edities van de groep, voor iedere deelnemer en organisator.
registreer('archief', {
  titel: 'Archief',
  icoon: ['M4 6h16v4H4z', 'M5.5 10v9h13v-9', 'M10 14h4'],
  render() {
    return maakArchief({ sessie: leesSessie(localStorage), bijVerlopen: () => { wisSessie(localStorage); kies(); } });
  },
});

// NAV-9: de ingang voor alle beheerschermen.
registreer('beheren', {
  titel: 'Beheren',
  soort: 'beheer',
  icoon: ['M4 7h10M18 7h2M4 17h2M10 17h10', 'M16 5v4M8 15v4'],
  render() {
    return maakBeheren({ routes: routelijst('beheer') });
  },
});

// FRM-1: het invulformulier met de kalender als eerste blok; AAN-50 vervalt, de losse kalenderroute is weg.
registreer('formulier', {
  titel: 'Invullen',
  soort: 'deelnemer',
  icoon: ['M5 6h14v14H5z', 'M5 10h14', 'M9 3v4M15 3v4'],
  render() {
    return maakFormulier({ sessie: leesSessie(localStorage), wachtrij, bijVerlopen: () => { wisSessie(localStorage); kies(); } });
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
  render(params) {
    return maakEditieNieuw({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenBeheer, bijKlaar: (id) => { location.hash = `#/uitnodigen?editie=${id}`; } });
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

// OVZ-3 t/m OVZ-5: het overlapoverzicht zonder namen; in het menu heet het Weekendje prikker (NAV-10).
registreer('overzicht', {
  titel: 'Weekendje prikker',
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
    return maakStappenBeheer({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenBeheer, bijStap: haalStand });
  },
});

// GELD-1 t/m GELD-7: posten, verdeling en saldi; de eerste tab van Afrekening (NAV-11).
registreer('posten', {
  titel: 'Wie betaalt wat',
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

// ACC-8 t/m ACC-14: de accommodatie van de groep (verrassing of samen kiezen, top 3 via de wachtrij).
registreer('accommodaties', {
  titel: 'Accommodatie',
  icoon: ['M2.5 5v15', 'M2.5 9h17a2 2 0 0 1 2 2v9', 'M2.5 16.5h19', 'M6.5 9v7.5'], // NAV-12, BV-17: een bed, anders dan het huisje van Start
  render(params) {
    return maakAccommodaties({ sessie: leesSessie(localStorage), params, wachtrij, bijVerlopen: bijVerlopenSessie });
  },
});

// ACC-1, ACC-2, ACC-8, ACC-10, ACC-13, ACC-14: weekend vastleggen, kiezen hoe, opties beheren, boeken en onthullen (organisator).
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
    return maakMeenemen({ sessie: leesSessie(localStorage), params, wachtrij, bijVerlopen: bijVerlopenSessie });
  },
});

// MEE-5 t/m MEE-9: de boodschappenlijst op supermarktvolgorde.
registreerOnderdeel('boodschappen', {
  titel: 'Boodschappen',
  icoon: ['M4 5h2l2 10h9l2-7H7', 'M10 19.5h.01M17 19.5h.01'],
  render(params) {
    return maakBoodschappen({ sessie: leesSessie(localStorage), params, wachtrij, bijVerlopen: bijVerlopenSessie });
  },
});

// KOK-1 t/m KOK-4: maaltijden met koks, ingrediënten en eetwensen.
registreerOnderdeel('kookbeurten', {
  titel: 'Kookbeurten',
  icoon: ['M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z', 'M8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2'],
  render(params) {
    return maakKookbeurten({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// PRG-1, PRG-2: het weekendprogramma per dag; de organisator beheert het hier.
registreerOnderdeel('programma', {
  titel: 'Programma',
  icoon: ['M5 6h14v14H5z', 'M5 10h14', 'M9 3v4M15 3v4', 'M9 14h6'],
  render(params) {
    return maakProgramma({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// KMR-1: kamers met bewoners; de organisator maakt kamers en deelt in.
registreerOnderdeel('kamers', {
  titel: 'Kamers',
  icoon: ['M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7', 'M3 15h18', 'M6 9V6.5A1.5 1.5 0 0 1 7.5 5h9A1.5 1.5 0 0 1 18 6.5V9'],
  render(params) {
    return maakKamers({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// CAR-1, CAR-2: ritten met vrije plaatsen en wie nog geen rit heeft.
registreerOnderdeel('carpool', {
  titel: 'Carpool',
  icoon: ['M5 16V11l1.7-4h10.6L19 11v5', 'M5 16h14v2.5H5z', 'M8 13h.01M16 13h.01'],
  render(params) {
    return maakCarpool({ sessie: leesSessie(localStorage), params, bijVerlopen: bijVerlopenSessie });
  },
});

// RON-1, RON-4: de rondleiding, vanzelf bij eerste gebruik en later onder Uitleg in het menu.
registreer('uitleg', {
  titel: 'Uitleg',
  icoon: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17', 'M12 11v5M12 8h.01'],
  render() {
    return maakRondleiding({ opslag: localStorage, link: onthoudenLink, bijKlaar: () => { location.hash = '#/start'; } });
  },
});

// RON-3: beforeinstallprompt komt vroeg; de app bewaart hem voor de knop Installeren.
luisterNaarInstallatie();

const root = document.getElementById('app');
const balkPlek = h('div', { class: 'balk-plek' });
// NAV-15, BV-20: deze schermen tonen de editietitel zelf (kop op Start, bovenschrift op het formulier); de balk laat hem dan weg.
const TITEL_OP_SCHERM = new Set(['start', 'formulier']);
const inhoud = h('main', { class: 'inhoud', id: 'inhoud' });
const menu = h('nav', { class: 'glass menu', 'aria-label': 'Menu' });
const melding = h('div', { class: 'glass toast offline-melding', role: 'alert', hidden: true },
  h('span', { class: 'ico' }, icoon(['M3 3l18 18', 'M8.5 16.2a5 5 0 0 1 7 0', 'M5 12.6a10 10 0 0 1 4-2.3', 'M14.8 10.4A10 10 0 0 1 19 12.6', 'M2 9a15 15 0 0 1 4.3-2.6', 'M11 5.1A15 15 0 0 1 22 9', 'M12 19.5h.01'], 22)),
  h('span', {}, h('span', { class: 'titel' }, OFFLINE_TEKST)));
const kopregel = h('header', { class: 'kopregel' }); // NAV-2: het profielmenu staat op elk scherm op dezelfde plek
// NAV-14, BV-19: op desktop staat de editienaam in de kopregel naast de profielknop (de compacte balk met de titel is daar weg).
const kopTitel = h('p', { class: 't-h2 kop-titel' });
const schil = h('div', { class: 'schil', hidden: true }, menu, kopregel, balkPlek, inhoud);
let binnen = null;
let schilGestart = false;
let laatsteSessie = '';
// AAN-72: de persoonlijke link blijft alleen in het geheugen, voor de knop "Kopieer mijn link" direct na het inloggen.
let onthoudenLink = null;
let geplakteBeheerlink = null; // TOE-11: een beheerlink uit het plakveld leidt naar de beheerlogin
const sync = maakSyncIndicator(wachtrij); // SYNC-4: vaste plek in de kopregel, naast het profielmenu
root.append(schil, melding, sync.terugmelding);

// Lader: het script antwoordt soms pas na een paar seconden. Dit geldt alleen voor laden en grote acties (SYNC-8);
// kleine handelingen staan direct in beeld en gaan via de wachtrij. Tijdens een grote actie staat er meteen "Opslaan…" en doen
// de schrijfknoppen niets, zodat een tweede klik of Enter geen dubbele invoer geeft. Laden toont de melding pas
// na een korte wachttijd, zodat een snel antwoord niet flikkert.
const LADER_WACHT_MS = 400;
const laderTekst = h('span', {});
const lader = h('div', { class: 'glass lader', role: 'status', hidden: true }, h('span', { class: 'lader-draai', 'aria-hidden': 'true' }), laderTekst);
root.append(lader);
let schrijftNu = false;
let laderTimer = null;
// SYNC-8: een grote actie wacht op de Sheet met de bezig-status op de knop waarmee ze begon.
// Kleine handelingen gaan via de wachtrij en komen hier niet langs (`stil` in api.js).
let bezigKnop = null;
let knopInhoud = null; // wat er in de knop stond voordat hij "Opslaan…" toonde
// SYNC-8, BV-13, BV-35: de knop zelf zegt "Opslaan…"; de toegankelijke naam blijft de oude tekst.
function knopBezig(knop) {
  if (knop.getAttribute('aria-busy') === 'true') return;
  knop.setAttribute('aria-busy', 'true');
  const naam = knop.textContent.trim();
  if (!knop.hasAttribute('aria-label') && naam) { knop.setAttribute('aria-label', naam); knop.dataset.bezigNaam = '1'; }
  knopInhoud = [...knop.childNodes];
  knop.replaceChildren(h('span', { class: 'knop-bezig' }, 'Opslaan…'));
}
function knopRust(knop) {
  if (knop.getAttribute('aria-busy') !== 'true') return;
  knop.removeAttribute('aria-busy');
  if (knopInhoud) knop.replaceChildren(...knopInhoud);
  knopInhoud = null;
  if (knop.dataset.bezigNaam) { knop.removeAttribute('aria-label'); delete knop.dataset.bezigNaam; }
}
bijBezig(({ alle, schrijft }) => {
  schrijftNu = schrijft > 0;
  document.documentElement.classList.toggle('is-bezig', schrijftNu);
  if (schrijftNu && bezigKnop && bezigKnop.isConnected) knopBezig(bezigKnop);
  if (!schrijftNu && bezigKnop) { knopRust(bezigKnop); bezigKnop = null; }
  clearTimeout(laderTimer);
  laderTimer = null;
  if (!alle) { lader.hidden = true; laderTekst.textContent = ''; return; }
  // Schermen tonen bij hun eerste keer laden zelf "Laden…"; de lader gebruikt daarom een eigen woord.
  laderTekst.textContent = schrijftNu ? 'Opslaan…' : 'Even geduld…';
  if (schrijftNu) lader.hidden = false;
  else if (lader.hidden) laderTimer = setTimeout(() => { lader.hidden = false; }, LADER_WACHT_MS);
});
// Een klik op een schrijfknop of het verzenden van zijn formulier wordt genegeerd zolang er iets wordt opgeslagen.
function houdTegen(e) {
  if (!(e.target instanceof Element)) return;
  const raakt = e.type === 'submit' ? e.target.querySelector('[data-schrijft]') : e.target.closest('[data-schrijft]');
  if (!raakt) return;
  if (!schrijftNu) { if (bezigKnop) knopRust(bezigKnop); bezigKnop = raakt; return; }
  e.preventDefault(); e.stopPropagation();
}
document.addEventListener('click', houdTegen, true);
document.addEventListener('submit', houdTegen, true);

const soortNu = () => { const s = leesSessie(localStorage); return s ? s.soort : undefined; };

// STA-8: de stap heeft één bron, de editie in de Sheet. De schil houdt één stand (stap, titel,
// vastgelegd weekend) uit het scherm `start` en tekent balk en menu daaruit, voor elke rol en op elk scherm.
// Ophalen bij openen, bij elke navigatie, als de app weer zichtbaar wordt en na een stapwijziging in beheer.
// AAN-71: de server kiest de editie: voor een deelnemer de zijne, voor een beheersessie de nieuwste eigen editie.
let editieStand = null; // { stap, titel, vastgelegdWeekend } of null
let standBekend = false; // false: nog niet geladen; true met editieStand null: er is geen editie
let standVraag = 0; // alleen het antwoord op de laatste vraag telt
let menuActief = '';
function toonMenu(actief = menuActief) {
  menuActief = actief;
  menu.replaceChildren(...maakMenuItems({ routes: routelijst(soortNu()), actief, stap: editieStand ? editieStand.stap : null }));
}

function toonBalk() {
  kopTitel.textContent = editieStand ? editieStand.titel : '';
  if (standBekend && !editieStand) { balkPlek.replaceChildren(); return; } // zonder editie geen balk
  const s = editieStand || { stap: null, titel: '' };
  balkPlek.replaceChildren(maakStappenbalk({ stap: s.stap, titel: s.titel, organisator: soortNu() === 'beheer' }));
}

function zetStand(editie) {
  const nieuw = editie ? { stap: editie.stap, titel: editie.titel || '', vastgelegdWeekend: editie.vastgelegdWeekend || '' } : null;
  const gelijk = standBekend && JSON.stringify(nieuw) === JSON.stringify(editieStand);
  standBekend = true;
  editieStand = nieuw;
  if (gelijk) return;
  toonBalk();
  toonMenu();
}

function wisStand() {
  standVraag += 1;
  editieStand = null;
  standBekend = false;
}

// Het startscherm vraagt hetzelfde scherm al op; zonder eigen editiekeuze geeft het zijn antwoord door.
function zetStandVanStart(editie, naam) {
  standVraag += 1;
  zetStand(editie);
  zetProfielNaam(naam);
}

// NAV-2, BV-36: het profielmenu toont de eigen voornaam uit het scherm `start`.
let profiel = null;
function zetProfielNaam(naam) { if (profiel) profiel.zetNaam(naam); }

async function haalStand() {
  const sessie = leesSessie(localStorage);
  if (!sessie) return;
  const nr = ++standVraag;
  try {
    const api = maakApi({ basisUrl: scriptUrl(sessie.scriptId), sessie: () => sessie.sessie, editieId: () => sessie.editieId || '' });
    const g = await api.anroep('scherm', { naam: 'start' }, { schrijft: false });
    if (nr === standVraag && leesSessie(localStorage)) { zetStand(g.editie); zetProfielNaam(g.ikNaam); }
  } catch { /* zonder verbinding blijft de laatste stand staan */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !schil.hidden) haalStand();
  if (document.visibilityState === 'hidden' && wachtrij.aantal()) wachtrij.nu(); // niet wachten tot de debounce om is
});

// SYNC-6: waarschuwen bij verlaten zolang er nog iets onderweg is; NFR-12: terug online, dan meteen versturen.
addEventListener('beforeunload', (e) => {
  if (!wachtrij.aantal()) return;
  e.preventDefault();
  e.returnValue = '';
});
addEventListener('online', () => { if (wachtrij.aantal()) wachtrij.nu(); });

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
    if (sleutel !== laatsteSessie) { profiel = maakProfielmenu({ soort: sessie.soort, kanInstalleren, installeer, uitloggen }); kopregel.replaceChildren(kopTitel, sync.indicator, profiel); }
    wachtrij.start(); // SYNC-3: wat bij een vorige keer bleef staan, gaat alsnog
    // RON-1, AAN-73: een deelnemer zonder gezien-vlag op dit apparaat begint met de rondleiding.
    if (sessie.soort === 'deelnemer' && !rondleidingGezien(localStorage) && !location.hash.startsWith('#/uitleg')) history.replaceState(null, '', `${location.pathname}${location.search}#/uitleg`);
    if (!schilGestart) { schilGestart = true; toonBalk(); start(inhoud, (naam, params) => { toonMenu(naam); balkPlek.toggleAttribute('data-titel-dubbel', TITEL_OP_SCHERM.has(naam)); kopregel.toggleAttribute('data-titel-dubbel', TITEL_OP_SCHERM.has(naam)); if (naam !== 'start' || params.editie) haalStand(); }, soortNu); } else if (sleutel !== laatsteSessie) { toonBalk(); ververs(); }
    laatsteSessie = sleutel;
    return;
  }
  laatsteSessie = '';
  const beheerlink = link && link.soort === 'beheer' ? link : geplakteBeheerlink;
  if (beheerlink) {
    binnen = maakBeheerlogin({ link: beheerlink, bijIngelogd, bijAnder });
  } else if (isOpzetPad(location.hash)) {
    // GRP-7: de opzetlink verdwijnt meteen uit de adresbalk en de geschiedenis; de waarden gaan mee naar de wizard.
    const vooraf = leesOpzetlink(location.hash);
    if (location.hash !== '#/opzetten') history.replaceState(null, '', `${location.pathname}${location.search}#/opzetten`);
    binnen = maakOpzetten({ bijIngelogd, vooraf });
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

function bijIngelogd(sessie, link = null) {
  geplakteBeheerlink = null;
  onthoudenLink = link && link.soort === 'deelnemer' ? persoonlijkeLinkVan(`${location.origin}${location.pathname}`, link.scriptId, link.token) : null;
  wisStand(); // een nieuwe sessie begint zonder stand
  bewaarSessie(localStorage, sessie);
  // STA-4, BV-07: ook een beheersessie landt op Start, waar de eerstvolgende actie staat. De link blijft niet in de adresbalk.
  history.replaceState(null, '', `${location.pathname}${location.search}#/start`);
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
  onthoudenLink = null;
  wisStand();
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  kies();
}

addEventListener('hashchange', kies);
kies();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
