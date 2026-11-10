// Kleine store per scherm (SYNC-1, spec §7.16.5). Het scherm geeft wat de Sheet leverde (`bevestigd`); de stand
// past daar de acties uit de wachtrij op toe die nog niet bevestigd zijn. Zo staat een handeling direct in beeld,
// blijft ze staan als het scherm opnieuw laadt terwijl ze nog onderweg is, en verdwijnt ze vanzelf als de
// wachtrij haar terugdraait. Na een geslaagde bundel schuift de actie door naar `bevestigd`, zonder herlaadronde.
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
export const ITEM_ACTIES = ['claimen', 'claimIntrekken', 'afvinken'];
export function pasItemsToe(g, { actie, data }) {
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
