// Link en sessie op dit apparaat (spec §7.1.1, §7.1.2, §7.1.6, §7.1.8).
// Pure functies: de opslag wordt meegegeven, zodat Node ze kan testen.
import { scriptIdGeldig } from '../shared/links.js';

export const OPSLAG_SLEUTEL = 'ww-sessie';

// De pure linkfuncties staan in src/shared/links.js, zodat het Sheet-menu dezelfde regels gebruikt.
export { scriptIdGeldig, scriptUrl, leesScriptUrl, beheerlinkVan } from '../shared/links.js';

const TOKEN = /^[A-Za-z0-9_-]{22}$/;
const OPZET_PAD = '#/opzetten';
export const OPZETLINK_FOUT = 'Deze opzetlink klopt niet. Kies in de Sheet opnieuw Weekendje weg en Groep opzetten.';

// AAN-78: de opzetlink is #/opzetten?b=<webappId>&code=<setupcode>. De code mag in het fragment omdat hij
// eenmalig en 30 minuten geldig is; app.js haalt het fragment direct uit de adresbalk (GRP-7).
// Geeft { scriptId, code } of { fout } bij een opzetlink, en null bij een gewoon #/opzetten of iets anders.
export function leesOpzetlink(hash) {
  const t = String(hash ?? '');
  if (!t.startsWith(`${OPZET_PAD}?`) || t.length > 2000) return null;
  const query = t.slice(OPZET_PAD.length + 1);
  if (!query) return null;
  const p = new URLSearchParams(query);
  const scriptId = p.get('b');
  const code = p.get('code');
  if (!scriptIdGeldig(scriptId) || code === null || !/^[A-Za-z0-9]{8}$/.test(code)) return { fout: OPZETLINK_FOUT };
  return { scriptId, code: code.toUpperCase() };
}

// Het pad #/opzetten, met of zonder query.
export const isOpzetPad = (hash) => hash === OPZET_PAD || String(hash ?? '').startsWith(`${OPZET_PAD}?`);

// EDI-4: de persoonlijke link van een deelnemer, achter het adres van de app.
export function persoonlijkeLinkVan(basis, scriptId, token) {
  return `${basis}#b=${scriptId}&t=${token}`;
}

// TOE-11: haalt b en t (of beheer) uit een volledige link, een fragment of kale parameters.
// Geeft { scriptId, soort: 'deelnemer' | 'beheer', token } of null.
export function leesLink(tekst) {
  const t = String(tekst ?? '').trim();
  if (!t || t.length > 2000) return null;
  const i = t.indexOf('#');
  const fragment = i >= 0 ? t.slice(i + 1) : t;
  if (fragment.startsWith('/opzetten')) return null; // §7.18.3: een opzetlink is nooit een persoonlijke link of beheerlink
  const p = new URLSearchParams(fragment);
  const scriptId = p.get('b');
  if (!scriptIdGeldig(scriptId)) return null;
  const persoonlijk = p.get('t');
  const beheer = p.get('beheer');
  if (persoonlijk !== null && beheer === null && TOKEN.test(persoonlijk)) return { scriptId, soort: 'deelnemer', token: persoonlijk };
  if (beheer !== null && persoonlijk === null && TOKEN.test(beheer)) return { scriptId, soort: 'beheer', token: beheer };
  return null;
}

// Sessie: { scriptId, sessie, soort, verloopt (ISO), editieId }. Geeft null als ze ontbreekt, kapot
// of verlopen is; de browser mag de opslag ook zelf gewist hebben (TOE-2).
export function leesSessie(opslag, nuMs = Date.now()) {
  let s;
  try { s = JSON.parse(opslag.getItem(OPSLAG_SLEUTEL)); } catch { return null; }
  if (!s || typeof s !== 'object' || !scriptIdGeldig(s.scriptId) || typeof s.sessie !== 'string' || !s.sessie) return null;
  if (!(Date.parse(s.verloopt) > nuMs)) return null;
  return s;
}

export function bewaarSessie(opslag, s) {
  opslag.setItem(OPSLAG_SLEUTEL, JSON.stringify({ scriptId: s.scriptId, sessie: s.sessie, soort: s.soort, verloopt: s.verloopt, editieId: s.editieId || '' }));
}

export function wisSessie(opslag) {
  opslag.removeItem(OPSLAG_SLEUTEL);
}
