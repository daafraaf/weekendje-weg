// Regels rond een nieuwe editie die voorkant en script delen (spec §7.2.4, §7.4.2, EDI-1).

// AAN-21 (§7.4.2): Eten en drinken, Activiteiten en Programma staan standaard aan, Samenwerken uit.
export const BLOKKEN_STANDAARD = { etenDrinken: true, activiteiten: true, programma: true, samenwerken: false };
export const BLOKKEN_NAMEN = { etenDrinken: 'Eten en drinken', activiteiten: 'Activiteiten', programma: 'Programma en sfeer', samenwerken: 'Samenwerken op vrijdag' };
export const MAANDEN_STANDAARD = [4, 5, 9, 10]; // EDI-1
export const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const dag = (datum) => Date.UTC(+datum.slice(0, 4), +datum.slice(5, 7) - 1, +datum.slice(8, 10));

export function datumPlus(datum, dagen) {
  return new Date(dag(datum) + dagen * 86400000).toISOString().slice(0, 10);
}

function laatsteZondag(jaar, maand) {
  const d = new Date(Date.UTC(jaar, maand + 1, 0)); // laatste dag van de maand
  return Date.UTC(jaar, maand, d.getUTCDate() - d.getUTCDay(), 1); // 01:00 UTC
}

// Tijdzone Europe/Amsterdam: zomertijd van de laatste zondag van maart tot die van oktober, beide 01:00 UTC.
export function amsterdamOffset(datum) {
  const jaar = +datum.slice(0, 4);
  const middag = dag(datum) + 12 * 3600000;
  return middag >= laatsteZondag(jaar, 2) && middag < laatsteZondag(jaar, 9) ? '+02:00' : '+01:00';
}

// AAN-48: de deadline van een editie eindigt om 23:59 (tijd van Amsterdam) op de gekozen dag.
export function deadlineIso(datum) {
  return `${datum}T23:59:00${amsterdamOffset(datum)}`;
}

