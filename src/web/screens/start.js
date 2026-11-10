// Startscherm per stap voor de deelnemer (STA-3, STA-5), volgens de tabel in spec §7.14.
// De organisator heeft zijn eigen bovenkant in start-organisator.js. Alle tekst gaat via textContent (NFR-5).
import { h } from '../dom.js';
import { maakBeheerApi } from '../beheerapi.js';
import { STAPNAMEN } from '../../shared/stappen.js';
import { onderdeelAan } from '../../shared/onderdelen.js';
import { datumLang } from '../../shared/datums.js';
import { editieKeuze } from './voortgang.js';
import { lokaalNu, maakProgrammaVandaag } from './programma.js';
import { startOrganisator } from './start-organisator.js';
import { maakAfgelopen } from './archief.js';
import { knop, kaart, tekst, klein, rij, lijst, aftelBlok, accommodatieRegel, weekendRegel, voorbereidingRijen, betalingRijen, samenvatting } from '../components/startblokken.js';

function programmaVandaag(ctx) {
  return maakProgrammaVandaag({ sessie: ctx.sessie, bijVerlopen: ctx.bijVerlopen, fetchFn: ctx.fetchFn, nu: ctx.nu });
}

// §7.14, kolom Deelnemer.
function startDeelnemer(g, ctx) {
  const e = g.editie;
  switch (e.stap) {
    case 'invullen': {
      const klaar = g.ik && g.ik.ingevuld;
      if (g.ik && g.ik.afgehaakt) return [kaart('Je doet niet mee', klein('Je hebt je afgemeld voor deze editie.'))];
      return [klaar
        ? kaart('Klaar, wacht op de rest', tekst(`${g.voortgang.ingevuld} van ${g.voortgang.aantal} hebben ingevuld.`), knop('Wie heeft ingevuld', '#/voortgang'))
        : kaart('Vul je beschikbaarheid en wensen in', tekst(`${g.voortgang.ingevuld} van ${g.voortgang.aantal} hebben ingevuld.`), knop('Formulier invullen', '#/formulier', 'primary'))];
    }
    case 'overzicht':
      return [kaart('Overlapoverzicht', tekst('Zie welke weekenden voor de groep werken en wat de voorkeursdatum is.'), knop(`Naar ${STAPNAMEN.overzicht}`, '#/overzicht', 'primary'))];
    case 'accommodatie':
      return [kaart('Accommodatie', tekst(weekendRegel(g)), tekst(accommodatieRegel(g)), knop('Bekijk de accommodaties', '#/accommodaties', 'primary'))];
    case 'voorbereiding':
      return [kaart('Voorbereiding', tekst(weekendRegel(g))), lijst('Voorbereiding', voorbereidingRijen(g))];
    case 'weekend':
      return [onderdeelAan('programma') ? programmaVandaag(ctx) : null, knop('Uitgave toevoegen', '#/posten', 'primary')]; // OND-2
    case 'afrekenen': {
      const regel = g.afrekening.open.length ? 'Dit staat er voor jou open.' : 'Voor jou staat er niets open.';
      return [kaart(STAPNAMEN.afrekenen, tekst(regel), g.afrekening.open.length ? h('div', { class: 'solid list', role: 'list' }, betalingRijen(g)) : null, knop('Naar de afrekening', '#/afrekening', 'primary'))];
    }
    default:
      return [samenvatting(g)];
  }
}

// sessie: { scriptId, sessie, editieId, soort }. bijStand(editie) geeft de editie door aan de schil (STA-8), alleen zolang
// er geen eigen editiekeuze is: dan is het dezelfde editie als die van balk en menu.
export function maakStart({ sessie, params = {}, bijVerlopen, uitloggen, bijStand = () => {}, fetchFn, nu = lokaalNu }) {
  let editieId = params.editie || sessie.editieId || '';
  let gekozen = Boolean(params.editie);
  const wortel = h('section', { class: 'beheer start' });
  const inhoud = h('div', { class: 'beheer' });
  const fout = h('p', { class: 't-small t-sec', hidden: true });
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding: (t) => { fout.textContent = t || ''; fout.hidden = !t; }, fetchFn });
  const onder = h('div', { class: 'start-acties' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: uitloggen }, 'Uitloggen'));
  wortel.append(inhoud, fout, klein('Je bent ingelogd.'), onder);

  function teken(g) {
    if (!g.editie) {
      inhoud.replaceChildren(h('header', { class: 'wz-kop' }, h('h1', { class: 't-title' }, 'Weekendje weg')),
        kaart('Nog geen editie', klein(g.organisator ? 'Maak de eerste editie van de groep.' : 'Je zit nog in geen enkele editie.'), g.organisator ? knop('Nieuwe editie maken', '#/editie-nieuw', 'primary') : null));
      return;
    }
    const e = g.editie;
    const ctx = { sessie: { ...sessie, editieId: e.id }, bijVerlopen, fetchFn, nu };
    const boven = g.organisator ? startOrganisator(g, ctx) : startDeelnemer(g, ctx);
    inhoud.replaceChildren(
      h('header', { class: 'wz-kop' }, h('p', { class: 't-cap' }, STAPNAMEN[e.stap]), h('h1', { class: 't-title' }, e.titel),
        e.deadline && e.stap === 'invullen' ? klein(`Deadline ${datumLang(e.deadline.slice(0, 10))}.`) : null),
      editieKeuze(g.edities, e.id, (id) => { editieId = id; gekozen = true; laad(); }, 'start-editie'),
      aftelBlok(g, nu().datum),
      h('div', { class: 'beheer', 'data-boven': e.stap }, boven),
      maakAfgelopen({ sessie, bijVerlopen, fetchFn, open: e.stap === 'afgerond' })); // NAV-4
  }

  async function laad() {
    const g = await anroep('scherm', { naam: 'start' }, false);
    if (!g) return;
    if (g.editie) editieId = g.editie.id;
    if (!gekozen) bijStand(g.editie);
    teken(g);
  }

  inhoud.append(klein('Laden…'));
  laad();
  return wortel;
}
