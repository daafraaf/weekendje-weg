// Beheren (NAV-9): één menu-item voor alle beheerschermen van de organisator, met dit overzicht als ingang.
// Alle tekst gaat via textContent (NFR-5).
import { h } from '../dom.js';
import { BEHEER_SCHERMEN } from '../../shared/start.js';
import { rij, lijst } from '../components/startblokken.js';

const OMSCHRIJVING = {
  leden: 'Leden van de groep en beheerlinks',
  'editie-nieuw': 'Een nieuwe editie maken',
  uitnodigen: 'Links en pincodes maken en delen',
  'lijsten-beheer': 'Vinkjes en blokken van het formulier',
  'vragen-beheer': 'Eigen vragen aan de groep',
  detail: 'Antwoorden per persoon',
  stappen: 'Stap, verwachte datums en deadline',
  'accommodatie-beheer': 'Weekend vastleggen en accommodaties',
};

// routes: de routes van de beheersessie (uit de router), met naam en titel.
export function maakBeheren({ routes }) {
  const rijen = BEHEER_SCHERMEN.map((naam) => routes.find((r) => r.naam === naam)).filter(Boolean).map((r) => rij(r.titel, OMSCHRIJVING[r.naam], `#/${r.naam}`));
  return h('section', { class: 'beheer' },
    h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Groep'), h('h1', { class: 't-title' }, 'Beheren')),
    lijst('Beheerschermen', rijen));
}
