// Uitnodigen: links en pincodes maken en vernieuwen, WhatsApp-teksten, beheerlink voor een lid
// (EDI-4, EDI-5, EDI-6, TOE-8, TOE-12). Ontwerp: docs/design/Uitnodigen.dc.html.
// Link en pincode staan alleen in het geheugen van dit scherm; wie weggaat, ziet ze niet meer terug (TOE-8).
// Alle tekst gaat via textContent (NFR-5).
import { h, icoon, vervang } from '../dom.js'; // BV-02: vervang laat null weg (geen editiekeuze bij één editie)
import { maakBeheerApi } from '../beheerapi.js';
import { persoonlijkeLinkVan, beheerlinkVan } from '../sessie.js';
import { deelKnoppen, kopieer } from '../delen.js';
import { uitnodigingTekst, pincodeTekst } from '../../shared/whatsapp.js';

const WAARSCHUWING = ['M12 4 2.8 19.5h18.4z', 'M12 10v4M12 17h.01'];
const OOG = ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', 'M9.2 12a2.8 2.8 0 1 0 5.6 0 2.8 2.8 0 0 0-5.6 0'];
const SLOT = ['M5 10.5h14v10H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'];
const SLEUTEL = ['M3.5 15a4 4 0 1 0 8 0 4 4 0 0 0-8 0', 'm11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2'];
const SCHAKEL = ['M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1', 'M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1'];
const MISLUKT = 'Kopiëren lukte niet, selecteer de tekst zelf.';

// sessie: { scriptId, sessie }. params.editie kiest de editie; zonder krijgt de nieuwste.
export function maakUitnodigen({ sessie, params = {}, bijVerlopen, appAdres = () => `${location.origin}${location.pathname}`, fetchFn }) {
  let gegevens = null;
  let editieId = params.editie || '';
  const geheimen = new Map(); // deelnemerId -> { link?, pin }
  const gedeeld = new Set(); // `${deelnemerId}:${soort}`
  let beheerlink = null; // { lidId, link }

  const wortel = h('section', { class: 'beheer' });
  const meldingTekst = h('p', { class: 't-small' });
  const melding = h('div', { class: 'melding-fout', role: 'alert', hidden: true }, h('span', { class: 'ico' }, icoon(WAARSCHUWING, 22)), meldingTekst);
  const toonMelding = (t) => { meldingTekst.textContent = t || ''; melding.hidden = !t; };
  const anroep = maakBeheerApi({ sessie, editieId: () => editieId, bijVerlopen, toonMelding, fetchFn });

  const editie = () => gegevens.edities.find((e) => e.id === editieId);
  const naamVan = (lidId) => (gegevens.leden.find((l) => l.id === lidId) || { voornaam: '' }).voornaam;
  const linkVan = (token) => persoonlijkeLinkVan(appAdres(), sessie.scriptId, token);

  async function laad() {
    const r = await anroep('scherm', { naam: 'beheer' }, false);
    if (!r) return;
    gegevens = r;
    if (!gegevens.edities.some((e) => e.id === editieId)) editieId = gegevens.edities.length ? gegevens.edities[gegevens.edities.length - 1].id : '';
    toonMelding('');
    teken();
  }

  async function linksMaken() {
    toonMelding('');
    const r = await anroep('linksMaken', {}, true);
    if (!r) return;
    for (const l of r.links) geheimen.set(l.deelnemerId, { link: linkVan(l.token), pin: l.pin });
    await laad();
  }

  async function vernieuw(soort, d) {
    toonMelding('');
    const r = await anroep(soort === 'pin' ? 'pincodeVernieuwen' : 'linkVernieuwen', { deelnemerId: d.id }, true);
    if (!r) return;
    // Een nieuwe pincode laat de link ongemoeid; die kennen we dan alleen als hij in dit scherm al stond.
    if (soort === 'pin') geheimen.set(d.id, { ...(geheimen.get(d.id) || {}), pin: r.pin });
    else geheimen.set(d.id, { link: linkVan(r.token), pin: r.pin });
    gedeeld.delete(`${d.id}:uitnodiging`);
    gedeeld.delete(`${d.id}:pincode`);
    await laad();
  }

  function geheimVeld(label, waarde) {
    const el = h('input', { class: 'field', type: 'text', readonly: true, 'aria-label': label });
    el.value = waarde;
    return el;
  }

  function deelnemerRij(d) {
    const voornaam = naamVan(d.lidId);
    const g = geheimen.get(d.id);
    const titel = editie().titel;
    const delen = [];
    if (g && g.link) {
      delen.push(h('div', {}, geheimVeld(`Link van ${voornaam}`, g.link),
        deelKnoppen({ tekst: uitnodigingTekst({ voornaam, editieTitel: titel, link: g.link }), soort: 'Uitnodiging', naam: voornaam, bijGedeeld: () => { gedeeld.add(`${d.id}:uitnodiging`); teken(); } })));
    }
    if (g && g.pin) {
      delen.push(h('div', {}, geheimVeld(`Pincode van ${voornaam}`, g.pin),
        deelKnoppen({ tekst: pincodeTekst({ voornaam, editieTitel: titel, pin: g.pin }), soort: 'Pincode', naam: voornaam, bijGedeeld: () => { gedeeld.add(`${d.id}:pincode`); teken(); } })));
    }
    const status = [];
    if (gedeeld.has(`${d.id}:uitnodiging`)) status.push(h('span', { class: 'chip' }, 'Link gedeeld'));
    if (gedeeld.has(`${d.id}:pincode`)) status.push(h('span', { class: 'chip' }, 'Pin gedeeld'));
    const vernieuwen = d.heeftLink ? h('div', { class: 'dl-knoppen' },
      h('button', { class: 'btn btn-sm btn-plain', type: 'button', 'data-schrijft': true, 'aria-label': `Nieuwe pincode voor ${voornaam}`, onclick: () => vernieuw('pin', d) }, icoon(SLEUTEL, 18), 'Nieuwe pincode'),
      h('button', { class: 'btn btn-sm btn-plain', type: 'button', 'data-schrijft': true, 'aria-label': `Nieuwe link voor ${voornaam}`, onclick: () => vernieuw('link', d) }, icoon(SCHAKEL, 18), 'Nieuwe link')) : null;
    return h('div', { class: 'row dl-rij' },
      h('span', { class: 'av', 'aria-hidden': 'true' }, voornaam.slice(0, 1).toUpperCase()),
      h('div', { class: 'dl-inhoud' },
        h('span', { class: 'rij-naam' }, voornaam, d.rol === 'organisator' ? h('span', { class: 'chip' }, 'organisator') : null, ...status),
        d.heeftLink || g ? null : h('span', { class: 't-small t-sec' }, 'Nog geen link'),
        ...delen, vernieuwen));
  }

  async function maakBeheerlink(lidId) {
    toonMelding('');
    const r = await anroep('beheerlinkMaken', { lidId }, true);
    if (!r) return;
    beheerlink = { lidId, link: beheerlinkVan(appAdres(), sessie.scriptId, r.token) };
    teken();
  }

  function beheerlinkBlok() {
    const keuze = h('select', { id: 'bl-lid', class: 'field' }, gegevens.leden.filter((l) => l.actief).map((l) => h('option', { value: l.id }, l.voornaam)));
    if (beheerlink) keuze.value = beheerlink.lidId;
    const status = h('p', { class: 'hint', role: 'status' });
    const maak = h('button', { class: 'btn btn-ghost', type: 'button', 'data-schrijft': true, onclick: () => maakBeheerlink(keuze.value) }, icoon(SLEUTEL, 20), 'Beheerlink maken');
    return h('section', { class: 'solid panel wz-nieuw' },
      h('h2', { class: 't-h2' }, 'Beheerlink voor een lid'),
      h('p', { class: 't-small t-sec' }, 'Voor een tweede organisator of de organisator van een volgende editie. Het lid kiest bij eerste gebruik een eigen wachtwoord.'),
      h('label', { class: 'label', for: 'bl-lid' }, 'Lid'), keuze, maak,
      beheerlink ? h('div', {},
        geheimVeld(`Beheerlink van ${naamVan(beheerlink.lidId)}`, beheerlink.link),
        h('button', { class: 'btn btn-sm btn-plain', type: 'button', 'aria-label': `Beheerlink van ${naamVan(beheerlink.lidId)} kopiëren`, onclick: async () => { status.textContent = (await kopieer(beheerlink.link)) ? 'Gekopieerd.' : MISLUKT; } }, 'Kopieer'),
        status,
        h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Je ziet deze link alleen nu. Stuur hem in een eigen bericht aan dit lid.'))) : null);
  }

  function teken() {
    const kop = (...extra) => h('div', { class: 'wz-kop' }, h('p', { class: 't-cap' }, 'Beheren'), h('h1', { class: 't-title' }, 'Uitnodigen'), ...extra);
    if (!gegevens.edities.length) {
      vervang(wortel, kop(), melding,
        h('p', { class: 't-body t-sec' }, 'Je hebt nog geen editie om uit te nodigen.'),
        h('a', { class: 'btn btn-primary', href: '#/editie-nieuw' }, 'Nieuwe editie maken'),
        beheerlinkBlok());
      return;
    }
    const e = editie();
    let keuze = null;
    if (gegevens.edities.length > 1) {
      const s = h('select', { id: 'dl-editie', class: 'field' }, gegevens.edities.map((x) => h('option', { value: x.id }, x.titel)));
      s.value = editieId;
      s.addEventListener('change', () => { editieId = s.value; geheimen.clear(); gedeeld.clear(); laad(); });
      keuze = h('div', {}, h('label', { class: 'label', for: 'dl-editie' }, 'Editie'), s);
    }
    vervang(wortel, 
      kop(h('p', { class: 't-body t-sec' }, e.titel)),
      keuze,
      melding,
      h('div', { class: 'glass panel dl-info' }, h('span', { class: 'ico' }, icoon(OOG, 22)),
        h('p', { class: 't-small' }, h('b', {}, 'Je ziet links en pincodes alleen direct na het maken. '), 'Deel ze meteen, elk in een eigen bericht. Daarna kun je alleen nieuwe maken.')),
      e.deelnemers.some((d) => !d.heeftLink) ? h('button', { class: 'btn btn-primary', type: 'button', 'data-schrijft': true, onclick: linksMaken }, icoon(SCHAKEL, 20), 'Links maken') : null,
      h('div', { class: 'solid list' }, e.deelnemers.map(deelnemerRij)),
      h('p', { class: 'priv' }, icoon(SLOT, 16), h('span', {}, 'Een uitnodiging bevat nooit de pincode. Zo kan een doorgestuurd bericht niemand binnenlaten.')),
      beheerlinkBlok());
  }

  wortel.append(h('p', { class: 't-body t-sec' }, 'Laden…'), melding);
  laad();
  return wortel;
}
