// Link en sessie op dit apparaat (spec §7.1.1, §7.1.2, §7.1.6, §7.1.8).
// Pure functies: de opslag wordt meegegeven, zodat Node ze kan testen.
export const OPSLAG_SLEUTEL = 'ww-sessie';

// TOE-10: alleen een scriptId van deze vorm komt in een URL.
const SCRIPT_ID = /^[A-Za-z0-9_-]{20,120}$/;
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

export const scriptIdGeldig = (id) => typeof id === 'string' && SCRIPT_ID.test(id);

// NFR-2: de voorkant bouwt zelf de URL; een andere host is onmogelijk.
export function scriptUrl(scriptId) {
  if (!scriptIdGeldig(scriptId)) throw new Error('ongeldig scriptId');
  return `https://script.google.com/macros/s/${scriptId}/exec`;
}

// GRP-2: de wizard accepteert alleen de /exec-URL van een webapp; een /dev-URL is de testversie van de eigenaar.
// Geeft { scriptId } of { fout } met uitleg.
export function leesScriptUrl(tekst) {
  const t = String(tekst ?? '').trim();
  const m = /^https:\/\/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]+)\/(exec|dev)$/.exec(t);
  if (!m) return { fout: 'Dit is geen webapp-URL. Hij begint met https://script.google.com/macros/s/ en eindigt op /exec.' };
  if (m[2] === 'dev') return { fout: 'Dit is de testlink die eindigt op /dev en alleen voor de eigenaar werkt. Kopieer bij Implementeren de webapp-URL die eindigt op /exec.' };
  if (!scriptIdGeldig(m[1])) return { fout: 'Het deel tussen /macros/s/ en /exec klopt niet. Kopieer de hele webapp-URL opnieuw.' };
  return { scriptId: m[1] };
}

// GRP-4: de beheerlink die de wizard toont; basis is het adres van de app zonder fragment.
export function beheerlinkVan(basis, scriptId, token) {
  return `${basis}#b=${scriptId}&beheer=${token}`;
}

// TOE-11: haalt b en t (of beheer) uit een volledige link, een fragment of kale parameters.
// Geeft { scriptId, soort: 'deelnemer' | 'beheer', token } of null.
export function leesLink(tekst) {
  const t = String(tekst ?? '').trim();
  if (!t || t.length > 2000) return null;
  const i = t.indexOf('#');
  const p = new URLSearchParams(i >= 0 ? t.slice(i + 1) : t);
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
