// Afrekening uit de saldi (spec §7.13.7, GELD-8). Pure functie; de server en de klant rekenen hetzelfde.
// Een saldo kleiner dan nul is een schuldenaar (betaalt), groter dan nul een schuldeiser (krijgt).

// AAN-35: goed genoeg in plaats van minimaal. Eerst schuldenaars en schuldeisers met exact hetzelfde
// bedrag koppelen, daarna betaalt steeds de grootste schuldenaar de grootste schuldeiser het kleinste
// van beide bedragen. Gelijke bedragen: eerst op voornaam, daarna op id. Elke betaling zet minstens
// één saldo op nul en de laatste twee tegelijk, dus hooguit (saldi ongelijk aan nul) − 1 betalingen.
export function afrekening(saldi, naamVan = () => '') {
  const orde = (a, b) => b.bedrag - a.bedrag
    || String(naamVan(a.id) || '').localeCompare(String(naamVan(b.id) || ''), 'nl')
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const rijen = Object.entries(saldi).filter(([, s]) => Number.isInteger(s) && s !== 0);
  const schuld = rijen.filter(([, s]) => s < 0).map(([id, s]) => ({ id, bedrag: -s })).sort(orde);
  const tegoed = rijen.filter(([, s]) => s > 0).map(([id, s]) => ({ id, bedrag: s })).sort(orde);
  const uit = [];
  const betaal = (van, naar, bedrag) => {
    uit.push({ vanId: van.id, naarId: naar.id, bedrag });
    van.bedrag -= bedrag;
    naar.bedrag -= bedrag;
  };

  for (const s of schuld) {
    const t = tegoed.find((x) => x.bedrag === s.bedrag);
    if (t) betaal(s, t, s.bedrag);
  }
  for (;;) {
    const van = schuld.filter((x) => x.bedrag > 0).sort(orde)[0];
    const naar = tegoed.filter((x) => x.bedrag > 0).sort(orde)[0];
    if (!van || !naar) break;
    betaal(van, naar, Math.min(van.bedrag, naar.bedrag));
  }
  return uit;
}

export const zelfdeBetaling = (a, b) => a.vanId === b.vanId && a.naarId === b.naarId && a.bedrag === b.bedrag;
