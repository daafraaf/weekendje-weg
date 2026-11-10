// Tags voor de "zelf bedacht"-velden (TAG-1 t/m TAG-8, AAN-74, AAN-76). Pure functies; voorkant en script delen ze.
export const TAG_MAX = 40;
export const TAGS_MAX = 20;

// Spaties aan de randen en dubbele spaties binnenin weg.
export const schoonTag = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

// AAN-74: dubbel is dubbel op kleine letters, zonder accenten, spaties en leestekens.
export const tagSleutel = (t) => {
  const s = schoonTag(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return s.replace(/[^\p{L}\p{N}]+/gu, '') || s;
};

// Tekst met komma's, puntkomma's of regeleinden als stukken (plakken, TAG-4).
export const splitsTekst = (tekst) => String(tekst ?? '').split(/[,;\n\r]+/).map(schoonTag).filter(Boolean);

// Knipt een te lang stuk bij een spatie in stukken van hooguit TAG_MAX tekens, zonder tekst te verliezen.
function knip(stuk) {
  const uit = [];
  let rest = stuk;
  while (rest.length > TAG_MAX) {
    const i = rest.lastIndexOf(' ', TAG_MAX);
    const einde = i > 0 ? i : TAG_MAX;
    uit.push(rest.slice(0, einde).trim());
    rest = rest.slice(einde).trim();
  }
  if (rest) uit.push(rest);
  return uit;
}

// Voegt tags toe aan een lijst; een dubbele valt weg. Geeft { tags, dubbel: [..] } (dubbel = wat al bestond).
export function voegToe(tags, nieuw) {
  const uit = [...tags];
  const bezet = new Set(uit.map(tagSleutel));
  const dubbel = [];
  for (const t of nieuw.map(schoonTag).filter(Boolean)) {
    const k = tagSleutel(t);
    if (bezet.has(k)) dubbel.push(t); else { bezet.add(k); uit.push(t); }
  }
  return { tags: uit, dubbel };
}

// AAN-76: de waarde van een veld als lijst. Een lijst blijft zoals ze is (ontdubbeld), oude tekst wordt gesplitst en geknipt.
export function tagsUitTekst(waarde) {
  if (Array.isArray(waarde)) return voegToe([], waarde.filter((t) => typeof t === 'string')).tags;
  if (typeof waarde !== 'string') return [];
  return voegToe([], splitsTekst(waarde).flatMap(knip)).tags;
}

// Geeft de foutmelding of null. Voorkant en script gebruiken dezelfde regels (TAG-5).
export function tagsFout(tags) {
  if (!Array.isArray(tags)) return 'Dit veld is een lijst.';
  if (tags.length > TAGS_MAX) return `Maximaal ${TAGS_MAX} onderdelen per veld.`;
  const gezien = new Set();
  for (const t of tags) {
    if (typeof t !== 'string' || schoonTag(t) !== t || !t) return 'Een onderdeel is leeg of heeft losse spaties.';
    if (t.length > TAG_MAX) return `Een onderdeel heeft maximaal ${TAG_MAX} tekens.`;
    const k = tagSleutel(t);
    if (gezien.has(k)) return `"${t}" staat er dubbel in.`;
    gezien.add(k);
  }
  return null;
}
