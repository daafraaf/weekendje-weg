// Startscherm per stap voor de organisator (STA-3, STA-4), volgens de tabel in spec §7.14.
// Bovenaan staat altijd de eerstvolgende actie als knop; daaronder wat bij de stap hoort.
import { h } from '../dom.js';
import { eersteActie } from '../../shared/start.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { datumLang } from '../../shared/datums.js';
import { knop, kaart, tekst, klein, lijst, accommodatieRegel, weekendRegel, voorbereidingRijen, betalingRijen, samenvatting } from '../components/startblokken.js';
import { maakProgrammaVandaag } from './programma.js';
import { onderdeelAan } from '../../shared/onderdelen.js';

export function startOrganisator(g, ctx) {
  const e = g.editie;
  const actie = eersteActie(g);
  const boven = h('section', { class: 'glass card beheer-blok start-actie', 'aria-label': 'Eerstvolgende actie' },
    h('p', { class: 't-cap' }, 'Eerstvolgende actie'), h('a', { class: 'btn btn-primary', href: actie.route }, actie.tekst));
  const onder = [];
  switch (e.stap) {
    case 'invullen': {
      const nog = g.voortgang.nogNiet;
      onder.push(kaart('Voortgang', tekst(`${g.voortgang.ingevuld} van ${g.voortgang.aantal} hebben ingevuld.`),
        nog.length ? klein(`Nog niet: ${nog.join(', ')}.`) : klein('Iedereen heeft ingevuld.'),
        e.deadline ? klein(`Deadline ${datumLang(e.deadline.slice(0, 10))}.`) : null,
        knop('Voortgang en herinnering', '#/voortgang'), knop('Deadline en stappen', '#/stappen')));
      if (g.ik && !g.ik.ingevuld) onder.push(kaart('Jouw antwoorden', knop('Formulier invullen', '#/formulier')));
      break;
    }
    case 'overzicht':
      onder.push(kaart(STAPNAMEN.overzicht, tekst(`${g.voortgang.ingevuld} van ${g.voortgang.aantal} hebben ingevuld.`), knop('Overlapoverzicht', '#/overzicht'), knop('Detailoverzicht per persoon', '#/detail')));
      break;
    case 'accommodatie':
      onder.push(kaart('Accommodatie', tekst(weekendRegel(g)), tekst(accommodatieRegel(g)), knop('Accommodaties beheren', '#/accommodatie-beheer'), knop('Zo zien deelnemers het', '#/accommodaties')));
      break;
    case 'voorbereiding':
      onder.push(kaart('Status per onderdeel', tekst(weekendRegel(g))), lijst('Status per onderdeel', voorbereidingRijen(g)));
      break;
    case 'weekend':
      if (onderdeelAan('programma')) onder.push(maakProgrammaVandaag({ sessie: ctx.sessie, bijVerlopen: ctx.bijVerlopen, fetchFn: ctx.fetchFn, nu: ctx.nu })); // OND-2
      onder.push(knop('Uitgave toevoegen', '#/posten'));
      if (onderdeelAan('programma')) onder.push(knop('Programma beheren', '#/programma'));
      break;
    case 'afrekenen':
      // BV-33: één kop "Openstaande betalingen"; de knop naar de afrekening is dan de eerstvolgende actie.
      onder.push(g.afrekening.open.length
        ? kaart('Openstaande betalingen', h('div', { class: 'solid list', role: 'list' }, betalingRijen(g)))
        : kaart('Openstaande betalingen', tekst('Er staat niets open.'), knop('Naar de afrekening', '#/afrekening')));
      break;
    default:
      onder.push(samenvatting(g));
  }
  return [boven, ...onder];
}
