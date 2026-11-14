// Kleine store per scherm (SYNC-1, spec §7.16.5). Het scherm geeft wat de Sheet leverde (`bevestigd`); de stand
// past daar de acties uit de wachtrij op toe die nog niet bevestigd zijn. Zo staat een handeling direct in beeld,
// blijft ze staan als het scherm opnieuw laadt terwijl ze nog onderweg is, en verdwijnt ze vanzelf als de
// wachtrij haar terugdraait. Na een geslaagde bundel schuift de actie door naar `bevestigd`, zonder herlaadronde.
import { PUNTEN } from '../shared/accommodatie.js';

const kloon = (g) => (typeof structuredClone === 'function' ? structuredClone(g) : JSON.parse(JSON.stringify(g)));

// toepassen(g, actie) wijzigt een kopie van de gegevens; hoort(actie) kiest de acties van dit scherm.
// bijWijziging(zicht, gebeurtenis) tekent opnieuw. levend() is false zodra het scherm weg is; dan meldt de stand zich af.
export function maakStand({ wachtrij, toepassen, hoort = () => true, bijWijziging = () => {}, levend = () => true }) {
  let bevestigd = null;
  let gezien = false; // het scherm stond al eens in beeld

  const zicht = () => {
    if (!bevestigd) return null;
    const g = kloon(bevestigd);
    for (const a of wachtrij.open(hoort)) toepassen(g, a);
    return g;
  };

  const af = wachtrij.bij((e) => {
    if (levend()) gezien = true;
    else if (gezien) { af(); return; }
    if (!bevestigd || !['gezet', 'bevestigd', 'teruggedraaid', 'opnieuw'].includes(e.soort)) return;
    const eigen = (e.acties || []).filter(hoort);
    if (e.soort === 'bevestigd') {
      if (!eigen.length) return;
      const g = kloon(bevestigd);
      for (const a of eigen) toepassen(g, a);
      bevestigd = g;
    }
    if (e.soort === 'teruggedraaid' && !eigen.length) return;
    bijWijziging(zicht(), e);
  });

  return {
    // Wat de Sheet nu geeft; geeft het zicht terug met de acties die nog onderweg zijn.
    zetBevestigd(g) { bevestigd = g ? kloon(g) : null; if (levend()) gezien = true; return zicht(); },
    zicht,
    // Zet een actie in de wachtrij; de wachtrij meldt `gezet` en het scherm tekent het nieuwe zicht.
    zet(actie, data, { sleutel, editieId } = {}) { wachtrij.zet({ actie, data, sleutel, editieId }); },
    open: () => wachtrij.open(hoort),
    stop: () => af(),
  };
}

// Meenemen en Boodschappen: claimen, intrekken en afvinken op de items van scherm `meenemen` (MEE-2, MEE-7).
// Zelfde uitkomst als de server: een tweede claim telt niet, intrekken zonder claim is geen fout.
// MEE-12: een nieuwe boodschap staat meteen op de lijst, met een voorlopig id (`nieuw:`) tot de Sheet hem heeft;
// dezelfde naam van jezelf blijft één item, net als op de server.
export const ITEM_ACTIES = ['claimen', 'claimIntrekken', 'afvinken', 'boodschapToevoegen'];
export const NIEUW_ITEM = 'nieuw:';
export const boodschapSleutel = (naam) => String(naam || '').trim().replace(/\s+/g, ' ').normalize('NFC').toLocaleLowerCase('nl');
export function pasItemsToe(g, { actie, data }) {
  if (actie === 'boodschapToevoegen') {
    if (!g || !Array.isArray(g.items)) return g;
    const sleutel = boodschapSleutel(data.naam);
    const bestaand = g.items.find((i) => i.soort === 'boodschap' && i.eigen && !i.maaltijd && boodschapSleutel(i.naam) === sleutel);
    if (bestaand) { if (data.categorie) bestaand.categorie = data.categorie; return g; }
    g.items.push({ id: `${NIEUW_ITEM}${sleutel}`, soort: 'boodschap', naam: String(data.naam).trim().replace(/\s+/g, ' '), categorie: data.categorie || 'Overig',
      versie: 0, afgevinkt: false, eigen: true, door: '', maaltijd: '', claims: [] });
    return g;
  }
  const item = g && Array.isArray(g.items) ? g.items.find((i) => i.id === data.itemId) : null;
  if (!item) return g;
  if (actie === 'claimen' && !item.claims.some((c) => c.ik)) item.claims.push({ naam: '', ik: true });
  if (actie === 'claimIntrekken') item.claims = item.claims.filter((c) => (data.deelnemerId ? c.deelnemerId !== data.deelnemerId : !c.ik));
  if (actie === 'afvinken') item.afgevinkt = Boolean(data.afgevinkt);
  return g;
}

// Formulier: één veld van de eigen antwoorden zetten of weghalen (K4).
export function pasAntwoordToe(g, { actie, data }) {
  if (actie !== 'antwoordZetten' || !g || !g.antwoorden) return g;
  const d = { ...(g.antwoorden.data || {}) };
  if (data.waarde === null) delete d[data.veld]; else d[data.veld] = data.waarde;
  g.antwoorden.data = d;
  return g;
}

// Accommodatie: de eigen top 3 vervangen (ACC-11). De punten en aantallen schuiven mee: eerst de oude eigen punten
// eraf, dan de nieuwe erbij; zo klopt de stand zonder te weten wat anderen kozen.
export function pasTop3Toe(g, { actie, data }) {
  if (actie !== 'top3Opgeven' || !g || !Array.isArray(g.accommodaties)) return g;
  const oud = g.mijnTop3 || [];
  const nieuw = data.keuzes || [];
  const pt = (lijst, id) => { const k = lijst.find((x) => x.accommodatieId === id); return k ? PUNTEN[k.rang] : 0; };
  for (const a of g.accommodaties) {
    const o = pt(oud, a.id), n = pt(nieuw, a.id);
    a.punten += n - o;
    a.mensen += (n ? 1 : 0) - (o ? 1 : 0);
  }
  g.gaven += (nieuw.length ? 1 : 0) - (oud.length ? 1 : 0);
  g.mijnTop3 = nieuw.map((k) => ({ accommodatieId: k.accommodatieId, rang: k.rang }));
  return g;
}
