// Links en webapp-URL's: pure functies die de voorkant en het Sheet-menu delen (spec §7.1.2, §7.18).

// TOE-10: alleen een scriptId van deze vorm komt in een URL.
const SCRIPT_ID = /^[A-Za-z0-9_-]{20,120}$/;

export const scriptIdGeldig = (id) => typeof id === 'string' && SCRIPT_ID.test(id);

// NFR-2: de URL wordt altijd zelf gebouwd; een andere host is onmogelijk.
export function scriptUrl(scriptId) {
  if (!scriptIdGeldig(scriptId)) throw new Error('ongeldig scriptId');
  return `https://script.google.com/macros/s/${scriptId}/exec`;
}

// GRP-2: alleen de /exec-URL van een webapp; een /dev-URL is de testversie van de eigenaar.
// Geeft { scriptId } of { fout } met uitleg.
export function leesScriptUrl(tekst) {
  const t = String(tekst ?? '').trim();
  const m = /^https:\/\/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]+)\/(exec|dev)$/.exec(t);
  if (!m) return { fout: 'Dit is geen webapp-URL. Hij begint met https://script.google.com/macros/s/ en eindigt op /exec.' };
  if (m[2] === 'dev') return { fout: 'Dit is de testlink die eindigt op /dev en alleen voor de eigenaar werkt. Kopieer bij Implementeren de webapp-URL die eindigt op /exec.' };
  if (!scriptIdGeldig(m[1])) return { fout: 'Het deel tussen /macros/s/ en /exec klopt niet. Kopieer de hele webapp-URL opnieuw.' };
  return { scriptId: m[1] };
}

// GRP-4, GRP-8: de beheerlink; basis is het adres van de app zonder fragment.
export function beheerlinkVan(basis, scriptId, token) {
  return `${basis}#b=${scriptId}&beheer=${token}`;
}

// §7.18.3: de opzetlink die het Sheet-menu toont.
export function opzetlinkVan(basis, scriptId, code) {
  return `${basis}#/opzetten?b=${scriptId}&code=${code}`;
}
