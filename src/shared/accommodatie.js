// Accommodaties: hoe de groep kiest, punten tellen, prijs per persoon en linkcontrole (spec §7.6, ACC-2, ACC-8 t/m ACC-14).
// Pure functies; server en voorkant gebruiken dezelfde telling.

// ACC-8: de organisator kiest per editie Verrassing of Samen kiezen.
export const DEELVORMEN = ['verrassing', 'samen'];
export const DEELVORM_NAMEN = { verrassing: 'Verrassing', samen: 'Samen kiezen' };

// AAN-86: oude deelvormen worden bij lezen omgezet; de Sheet blijft ongewijzigd tot de volgende schrijfactie.
// `info` en `stemmen` (en een lege cel) worden `samen`; `geboekt` wordt `samen` met de geboekte accommodatie, die
// al in `geboektAccommodatieId` staat. Een oude stem zonder rang telt als rang 1.
export function deelvormVan(waarde) {
  return waarde === 'verrassing' ? 'verrassing' : 'samen';
}
export function rangVan(stem) {
  const r = Number(stem && stem.rang);
  return r === 1 || r === 2 || r === 3 ? r : 1;
}

// ACC-9: bij een verrassing die nog niet onthuld is, krijgt een deelnemer geen gegevens van de accommodatie.
export const isGeheim = (editie) => Boolean(editie) && deelvormVan(editie.deelvorm) === 'verrassing' && !editie.onthuld;

// ACC-11: rang 1, 2 en 3 geven 3, 2 en 1 punt. Bij minder dan drie opties zijn er evenveel rangen als opties.
export const PUNTEN = { 1: 3, 2: 2, 3: 1 };
export const maxRang = (aantalOpties) => Math.max(0, Math.min(3, aantalOpties));

// ACC-12: per optie de punten en het aantal mensen dat haar in zijn top 3 heeft, gesorteerd op punten, dan mensen,
// dan de volgorde van de lijst. `meetelt(deelnemerId)` laat bijvoorbeeld afgehaakte deelnemers weg (AAN-08).
// Per deelnemer telt een optie één keer, met zijn beste rang; stemmen op onbekende opties tellen niet.
export function telPunten(accommodaties, stemmen, meetelt = () => true) {
  const ids = new Set(accommodaties.map((a) => a.id));
  const perPersoon = new Map();
  for (const s of stemmen) {
    if (!ids.has(s.accommodatieId) || !meetelt(s.deelnemerId)) continue;
    const eigen = perPersoon.get(s.deelnemerId) || new Map();
    const rang = rangVan(s);
    if (!eigen.has(s.accommodatieId) || rang < eigen.get(s.accommodatieId)) eigen.set(s.accommodatieId, rang);
    perPersoon.set(s.deelnemerId, eigen);
  }
  const telling = new Map(accommodaties.map((a) => [a.id, { punten: 0, mensen: 0 }]));
  for (const eigen of perPersoon.values()) {
    for (const [id, rang] of eigen) {
      const t = telling.get(id);
      t.punten += PUNTEN[rang];
      t.mensen += 1;
    }
  }
  const opties = accommodaties.map((a, i) => ({ id: a.id, ...telling.get(a.id), volgorde: i }))
    .sort((a, b) => b.punten - a.punten || b.mensen - a.mensen || a.volgorde - b.volgorde)
    .map(({ volgorde, ...o }) => o);
  return { opties, gaven: perPersoon.size };
}

// ACC-11: de top 3 van één persoon als lijst { accommodatieId, rang } na een tik op `rang` bij `accommodatieId`.
// Dezelfde knop opnieuw haalt de keuze weg; een rang die al bij een andere optie stond, schuift naar deze optie.
export function tikRang(top3, accommodatieId, rang) {
  const huidig = top3.find((k) => k.accommodatieId === accommodatieId);
  if (huidig && huidig.rang === rang) return top3.filter((k) => k.accommodatieId !== accommodatieId);
  return top3.filter((k) => k.accommodatieId !== accommodatieId && k.rang !== rang)
    .concat({ accommodatieId, rang }).sort((a, b) => a.rang - b.rang);
}

// AAN-64: grenzen van een accommodatie; een totaalprijs van 0 betekent dat de prijs nog niet bekend is.
// ACC-14: bedden en eigen kamers zijn optioneel, hele getallen van 0 tot 99.
export const ACC_GRENZEN = { naamMax: 80, plaatsMax: 80, linkMax: 300, notitieMax: 300, prijsMax: 10000000, aantalMax: 12, beddenMax: 99 };

// ACC-14: eigen kamers niet meer dan bedden als beide zijn ingevuld. Geeft een melding of null.
export function beddenFout(bedden, eigenKamers) {
  const leeg = (x) => x === null || x === undefined;
  for (const [x, wat] of [[bedden, 'bedden'], [eigenKamers, 'eigen kamers']]) {
    if (!leeg(x) && (!Number.isInteger(x) || x < 0 || x > ACC_GRENZEN.beddenMax)) return `Vul bij ${wat} een heel getal van 0 tot ${ACC_GRENZEN.beddenMax} in.`;
  }
  if (!leeg(bedden) && !leeg(eigenKamers) && eigenKamers > bedden) return 'Er kunnen niet meer eigen kamers dan bedden zijn.';
  return null;
}

// ACC-14: "8 bedden · 3 eigen kamers"; een leeg veld komt er niet in. Geeft '' als beide leeg zijn.
export function beddenTekst(a) {
  const delen = [];
  if (Number.isInteger(a && a.bedden)) delen.push(a.bedden === 1 ? '1 bed' : `${a.bedden} bedden`);
  if (Number.isInteger(a && a.eigenKamers)) delen.push(a.eigenKamers === 1 ? '1 eigen kamer' : `${a.eigenKamers} eigen kamers`);
  return delen.join(' · ');
}

// §7.6.3: het totaal gedeeld door het aantal niet-afgehaakte deelnemers, afgerond op hele euro's (in centen).
export function prijsPerPersoon(totaalCenten, aantal) {
  if (!(totaalCenten > 0) || !(aantal > 0)) return null;
  return Math.round(totaalCenten / aantal / 100) * 100;
}

// NFR-3: een door gebruikers ingevoerde link wordt alleen getoond als hij met https:// begint.
export const isHttpsLink = (t) => typeof t === 'string' && /^https:\/\/[^\s]+$/i.test(t);

// `€ 1.380`: hele euro's met punt als duizendtalteken, zoals in het ontwerp.
export const heleEuro = (centen) => `€ ${String(Math.round(centen / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
