// Uitgave of ontvangst toevoegen, wijzigen of verwijderen (GELD-1 t/m GELD-5).
// Ontwerp: docs/design/UitgaveToevoegen.dc.html. Alle tekst gaat via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { maakVerdeelinvoer } from '../components/verdeelinvoer.js';
import { invoerTekst, leesBedrag, POST_GRENZEN } from '../../shared/geld.js';
import { standaardVerdeling } from '../../shared/verdeling.js';
import { foutMelding } from './voortgang.js';

const SLUITEN = ['M6 6l12 12M18 6 6 18'];
const POTLOOD = ['M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'];
const vandaag = () => new Date().toISOString().slice(0, 10);

// g: antwoord van scherm `posten`; post: bestaande post of null; anroep(actie, data, schrijft) zoals maakBeheerApi.
export function maakPostBewerken({ g, post, anroep, bijKlaar, bijSluiten }) {
  const nieuw = !post;
  const alleenLezen = g.alleenLezen || (!nieuw && !post.magWijzigen);
  let soort = post ? post.soort : 'uitgave';
  const melding = foutMelding();

  const titel = h('h1', { class: 't-h2', id: 'pb-titel' });
  const zetTitel = () => { titel.textContent = nieuw ? (soort === 'uitgave' ? 'Uitgave toevoegen' : 'Ontvangst toevoegen') : (alleenLezen ? 'Post bekijken' : 'Post wijzigen'); };

  const omschrijving = h('input', { id: 'pb-omschrijving', class: 'field', maxlength: POST_GRENZEN.omschrijvingMax, disabled: alleenLezen });
  omschrijving.value = post ? post.omschrijving : '';
  const bedrag = h('input', { id: 'pb-bedrag', class: 'field t-num', inputmode: 'decimal', placeholder: '0,00', disabled: alleenLezen });
  bedrag.value = post ? invoerTekst(post.bedrag) : '';
  const categorie = h('select', { id: 'pb-categorie', class: 'field', disabled: alleenLezen }, g.categorieen.map((c) => h('option', { value: c.sleutel }, c.label)));
  categorie.value = post ? post.categorie : 'overig';
  const betaler = h('select', { id: 'pb-betaler', class: 'field', disabled: alleenLezen },
    g.deelnemers.map((d) => h('option', { value: d.id }, d.id === g.ik ? `${d.voornaam} (jij)` : d.voornaam)));
  betaler.value = post ? post.betalerId : g.ik || (g.deelnemers[0] || {}).id || '';
  const betalerLabel = h('label', { class: 'label', for: 'pb-betaler' });
  const datum = h('input', { id: 'pb-datum', class: 'field', type: 'date', disabled: alleenLezen });
  datum.value = post ? post.datum : vandaag();

  const opslaanKnop = h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: () => opslaan() }, 'Opslaan');
  const centen = () => leesBedrag(bedrag.value) || 0;
  const zetKnop = () => { opslaanKnop.disabled = Boolean(verdeler.fout()) || !omschrijving.value.trim(); };
  const verdeler = maakVerdeelinvoer({
    deelnemers: g.deelnemers, verdeling: post ? post.verdeling : standaardVerdeling(g.deelnemers),
    bedrag: centen, betalerId: () => betaler.value, alleenLezen, bijWijzig: () => zetKnop(),
  });
  for (const veld of [bedrag, betaler]) veld.addEventListener('input', () => { verdeler.bijwerken(); zetKnop(); });
  omschrijving.addEventListener('input', zetKnop);

  const soortKnoppen = h('div', { class: 'segm', role: 'group', 'aria-label': 'Soort post' });
  function tekenSoort() {
    soortKnoppen.replaceChildren(...[['uitgave', 'Uitgave'], ['ontvangst', 'Ontvangst']].map(([s, label]) => h('button', {
      type: 'button', 'aria-pressed': String(s === soort), disabled: alleenLezen, onclick: () => { soort = s; tekenSoort(); },
    }, label)));
    betalerLabel.textContent = soort === 'uitgave' ? 'Betaald door' : 'Ontvangen door';
    zetTitel();
  }
  tekenSoort();

  async function opslaan() {
    melding.toon('');
    const c = leesBedrag(bedrag.value);
    if (!c) { melding.toon('Vul een bedrag in, bijvoorbeeld 84,60.'); return; }
    const fout = verdeler.fout();
    if (fout) { melding.toon(fout); return; }
    const data = {
      soort, omschrijving: omschrijving.value.trim(), bedrag: c, betalerId: betaler.value,
      datum: datum.value, categorie: categorie.value, verdeling: verdeler.waarde(),
    };
    if (post) Object.assign(data, { id: post.id, versie: post.versie });
    opslaanKnop.disabled = true;
    const r = await anroep('postOpslaan', data, true);
    opslaanKnop.disabled = false;
    if (r) bijKlaar(nieuw ? 'De post is toegevoegd.' : 'De post is gewijzigd.');
  }

  async function verwijderen() {
    melding.toon('');
    const r = await anroep('postVerwijderen', { id: post.id, versie: post.versie }, true);
    if (r) bijKlaar('De post is verwijderd.');
  }

  const veld = (id, label, el) => h('div', {}, h('label', { class: 'label', for: id }, label), el);
  const uitleg = alleenLezen
    ? h('p', { class: 'hint' }, g.alleenLezen ? 'De editie is afgerond. Je kunt de posten nog lezen.' : 'Je kunt alleen je eigen posten wijzigen.')
    : null;
  const aantekening = post && post.aangepastDoorOrganisator
    ? h('p', { class: 't-small t-sec post-aantekening' }, icoon(POTLOOD, 14), 'aangepast door de organisator')
    : null;
  zetKnop();

  return h('section', { class: 'glass card post-bewerken', 'aria-labelledby': 'pb-titel' },
    h('div', { class: 'post-kop' }, titel,
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Sluiten', onclick: bijSluiten }, icoon(SLUITEN, 20))),
    uitleg, aantekening,
    nieuw ? soortKnoppen : h('p', { class: 't-cap' }, soort === 'uitgave' ? 'Uitgave' : 'Ontvangst'),
    veld('pb-omschrijving', 'Omschrijving', omschrijving),
    h('div', { class: 'wz-twee' }, veld('pb-bedrag', 'Bedrag', bedrag), veld('pb-categorie', 'Categorie', categorie)),
    h('div', {}, betalerLabel, betaler),
    veld('pb-datum', 'Datum', datum),
    verdeler.el,
    melding.el,
    alleenLezen ? null : opslaanKnop,
    !alleenLezen && post ? h('button', { class: 'btn btn-plain', type: 'button', 'data-schrijft': true, onclick: () => verwijderen() }, 'Verwijderen') : null);
}
