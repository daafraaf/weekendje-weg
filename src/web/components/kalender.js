// Weekendkalender (KAL-1 t/m KAL-4, KAL-7): maandbladen met één tikbare balk per weekend, jaarstrook en legenda.
import vakantieBestand from '../../../data/vakanties.json' with { type: 'json' };
import { h, icoon } from '../dom.js';
import { MAANDNAMEN, WEEKDAGEN, datumKort, datumPlus, dagVan, jaarVan, maandVan, maakIso, vrijdagen, weekdag } from '../../shared/datums.js';
import { feestdagTabel } from '../../shared/feestdagen.js';
import { dagHeeftVakantie, maandNotities, weekendKenmerken } from '../../shared/vakanties.js';
import { WAARDEN, maandVullen, tel, volgendeWaarde, zetWaarde } from '../../shared/beschikbaarheid.js';

const SYMBOOL = { ja: '✓', misschien: '~', nee: '✕', leeg: '' };
const LABEL = { ja: 'ja', misschien: 'misschien', nee: 'nee', leeg: 'niet ingevuld' };
const KLASSE = { ja: 'st-ja', misschien: 'st-mis', nee: 'st-nee', leeg: 'st-leeg' };
const BALK = { ja: 'b-ja', misschien: 'b-mis', nee: 'b-nee', leeg: 'b-leeg' };
const STER = 'm12 4 2.4 4.9 5.3.8-3.9 3.8.9 5.3L12 16.3l-4.7 2.5.9-5.3-3.9-3.8 5.3-.8z';

const status = (waarde, klasse = '') => h('span', { class: `st ${KLASSE[waarde]} st-sm ${klasse}`.trim(), role: 'img', 'aria-label': LABEL[waarde] }, SYMBOOL[waarde]);

export function maakKalender({ periodeVan, periodeTot, voorkeursmaanden = [], waarden = {}, bijWijziging = () => {}, vakanties = vakantieBestand, alleenLezen = false }) {
  let huidig = { ...waarden };
  const weekenden = vrijdagen(periodeVan, periodeTot);
  const weekendSet = new Set(weekenden);
  const feest = feestdagTabel(jaarVan(periodeVan), jaarVan(periodeTot) + 1);
  const maanden = [];
  for (const v of weekenden) {
    const sleutel = v.slice(0, 7);
    if (!maanden.length || maanden[maanden.length - 1].sleutel !== sleutel) maanden.push({ sleutel, jaar: jaarVan(v), maand: maandVan(v), vrijdagen: [] });
    maanden[maanden.length - 1].vrijdagen.push(v);
  }

  const balken = new Map(); // vrijdag -> { knop, vierkant, aria }
  const teller = h('div', { class: 'tel', 'aria-live': 'polite' });
  const kop = h('p', { class: 't-num kal-kop' });

  function ariaVan(v, waarde) {
    const k = weekendKenmerken(v, feest, vakanties);
    const extra = [];
    if (voorkeursmaanden.includes(maandVan(v))) extra.push('voorkeursmaand');
    extra.push(...k.feestdagen);
    if (k.langWeekend) extra.push('lang weekend');
    if (k.regios.length) extra.push(`schoolvakantie regio ${k.regios.join(', ')}`);
    return `${datumKort(v)} tot ${datumKort(datumPlus(v, 2))}: ${LABEL[waarde]}${extra.length ? `. ${extra.join(', ')}` : ''}. Tik om te wisselen.`;
  }

  function ververs() {
    const t = tel(huidig, weekenden);
    kop.textContent = `${t.ja + t.misschien + t.nee} van ${weekenden.length} weekenden ingevuld`;
    teller.replaceChildren(
      ...['ja', 'misschien', 'nee'].map((w) => h('span', {}, status(w), h('b', { class: 't-num' }, String(t[w])))),
      h('span', {}, status('leeg'), h('b', { class: 't-num' }, String(t.leeg)), ' leeg'));
    for (const [v, b] of balken) {
      const w = huidig[v] || 'leeg';
      b.knop.className = `band ${BALK[w]}${b.vakantie ? ' vak' : ''}`;
      b.knop.setAttribute('aria-label', ariaVan(v, w));
      b.symbool.textContent = SYMBOOL[w];
      b.vierkant.className = `sq ${BALK[w]}`;
    }
  }

  function wijzig(nieuw) {
    huidig = nieuw;
    ververs();
    bijWijziging({ ...huidig });
  }

  function maakBalk(v) {
    const k = weekendKenmerken(v, feest, vakanties);
    const dagen = [v, datumPlus(v, 1), datumPlus(v, 2)];
    const nummers = h('span', { class: 'nums', 'aria-hidden': 'true' }, dagen.map((d) => h('span', { class: maandVan(d) === maandVan(v) ? 'bd' : 'bd o' }, String(dagVan(d)))));
    const symbool = h('span', { class: 'bs', 'aria-hidden': 'true' });
    const knop = h('button', { type: 'button', disabled: alleenLezen, onclick: () => wijzig(zetWaarde(huidig, v, volgendeWaarde(huidig[v]))) },
      nummers, symbool,
      k.feestdagen.length || k.langWeekend ? h('span', { class: 'bm', 'aria-hidden': 'true' }) : null,
      k.regios.length ? h('span', { class: 'bv', 'aria-hidden': 'true' }) : null);
    balken.set(v, { knop, symbool, vakantie: k.regios.length > 0, vierkant: h('span', { class: 'sq' }) });
    return knop;
  }

  function dagCel(d, maand) {
    if (maandVan(d) !== maand) return h('span', { class: 'dc', 'aria-hidden': 'true' });
    return h('span', { class: `dc${dagHeeftVakantie(d, vakanties) ? ' vak' : ''}${feest.has(d) ? ' fd' : ''}`, 'aria-hidden': 'true' }, String(dagVan(d)));
  }

  function maakMaand(m) {
    const eerste = maakIso(m.jaar, m.maand, 1);
    const laatste = maakIso(m.jaar, m.maand + 1, 0);
    const pref = voorkeursmaanden.includes(m.maand);
    const naam = MAANDNAMEN[m.maand - 1];
    const titel = `${naam[0].toUpperCase()}${naam.slice(1)}`;
    const rijen = [];
    for (let s = datumPlus(eerste, -weekdag(eerste)); s <= laatste; s = datumPlus(s, 7)) {
      const cellen = [0, 1, 2, 3].map((i) => dagCel(datumPlus(s, i), m.maand));
      const vr = datumPlus(s, 4);
      if (weekendSet.has(vr) && maandVan(vr) === m.maand) cellen.push(maakBalk(vr));
      else cellen.push(...[4, 5, 6].map((i) => dagCel(datumPlus(s, i), m.maand)));
      rijen.push(h('div', { class: 'wr' }, cellen));
    }

    const keuze = h('div', { class: 'maandkeuze', hidden: true, role: 'group', 'aria-label': `Lege weekenden van ${naam}` },
      WAARDEN.map((w) => h('button', { type: 'button', class: 'btn-plain', 'aria-label': `Lege weekenden van ${naam} op ${LABEL[w]}`, onclick: () => { wijzig(maandVullen(huidig, m.vrijdagen, w)); } }, status(w), h('span', {}, LABEL[w]))));
    const hele = h('button', { type: 'button', class: 'btn-plain', 'aria-expanded': 'false' }, 'Hele maand');
    hele.addEventListener('click', () => {
      keuze.hidden = !keuze.hidden;
      hele.setAttribute('aria-expanded', String(!keuze.hidden));
    });

    return h('section', { class: `solid mcal${pref ? ' pref' : ''}`, 'aria-label': `${titel} ${m.jaar}` },
      h('div', { class: 'mh' },
        h('h3', { class: 't-h3' }, titel),
        pref ? h('span', { class: 'prefmerk' }, icoon(STER, 16), 'voorkeursmaand') : null,
        alleenLezen ? null : hele),
      keuze,
      h('div', { class: 'wd', 'aria-hidden': 'true' }, WEEKDAGEN.map((d, i) => h('span', { class: i >= 4 ? 'we' : '' }, d))),
      rijen,
      maandNotities(m.jaar, m.maand, feest, vakanties).map((n) => h('p', { class: `mn mn-${n.soort}` }, n.tekst)));
  }

  const blad = h('div', { class: 'jaar-m' }, maanden.map(maakMaand));

  // Jaarstrook: per maand een kolom met één vierkantje per weekend.
  const strip = h('div', { class: 'strip', role: 'img' }, maanden.map((m) => h('div', { class: 'col' },
    m.vrijdagen.map((v) => balken.get(v).vierkant),
    h('span', { class: 'ml' }, MAANDNAMEN[m.maand - 1].slice(0, 1).toUpperCase()))));

  const legenda = h('div', { class: 'legenda', 'aria-hidden': 'true' },
    ['ja', 'misschien', 'nee', 'leeg'].map((w) => h('span', { class: 't-small' }, status(w), w === 'leeg' ? 'nog leeg' : LABEL[w])),
    h('span', { class: 't-small' }, h('span', { class: 'leg-vak' }), 'schoolvakantie'),
    h('span', { class: 't-small' }, h('span', { class: 'leg-feest' }), 'feestdag of lang weekend'),
    h('span', { class: 't-small' }, icoon(STER, 16), 'voorkeursmaand'));

  const el = h('div', { class: 'kal' },
    h('div', { class: 'solid panel kal-samen' }, kop, teller, strip),
    legenda,
    blad,
    alleenLezen ? null : h('p', { class: 'hint' }, 'Tik op een weekend om te wisselen: leeg, ja, misschien, nee. Met het toetsenbord werkt spatie of enter.'));
  ververs();
  strip.setAttribute('aria-label', 'Jaaroverzicht van je weekenden');
  return el;
}
