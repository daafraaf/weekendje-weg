// Accommodaties: deelvormen, prijs per persoon en linkcontrole (spec §7.6, ACC-2, ACC-3, ACC-5).
export const DEELVORMEN = ['info', 'stemmen', 'geboekt'];
export const DEELVORM_NAMEN = { info: 'Info', stemmen: 'Stemmen', geboekt: 'Geboekt' };

// AAN-64: grenzen van een accommodatie; een totaalprijs van 0 betekent dat de prijs nog niet bekend is.
export const ACC_GRENZEN = { naamMax: 80, plaatsMax: 80, linkMax: 300, notitieMax: 300, prijsMax: 10000000, aantalMax: 12 };

// §7.6.3: het totaal gedeeld door het aantal niet-afgehaakte deelnemers, afgerond op hele euro's (in centen).
export function prijsPerPersoon(totaalCenten, aantal) {
  if (!(totaalCenten > 0) || !(aantal > 0)) return null;
  return Math.round(totaalCenten / aantal / 100) * 100;
}

// NFR-3: een door gebruikers ingevoerde link wordt alleen getoond als hij met https:// begint.
export const isHttpsLink = (t) => typeof t === 'string' && /^https:\/\/[^\s]+$/i.test(t);

// `€ 1.380`: hele euro's met punt als duizendtalteken, zoals in het ontwerp.
export const heleEuro = (centen) => `€ ${String(Math.round(centen / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
