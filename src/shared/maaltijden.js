// Maaltijden en programma die voorkant en script delen (spec §5.1, §7.10, §7.11.1, KOK-1 t/m KOK-4, PRG-1 t/m PRG-3).
import { datumPlus } from './editie.js';

export const DAGEN = ['vr', 'za', 'zo'];
export const DAGNAMEN = { vr: 'Vrijdag', za: 'Zaterdag', zo: 'Zondag' };
export const DAGEN_KORT = { vr: 'Vr', za: 'Za', zo: 'Zo' };
export const SOORTEN = ['ontbijt', 'lunch', 'diner'];
export const SOORT_NAMEN = { ontbijt: 'Ontbijt', lunch: 'Lunch', diner: 'Diner' };

// AAN-68: grenzen van maaltijden en programmapunten.
export const MAALTIJD_GRENZEN = { omschrijvingMax: 100, aantalMax: 12 };
export const PROGRAMMA_GRENZEN = { titelMax: 80, adresMax: 120, linkMax: 300, notitieMax: 300, aantalMax: 60 };

// AAN-18, KOK-1, §7.10.1: de standaardmaaltijden bij het vastleggen van het weekend.
export const STANDAARD_MAALTIJDEN = [
  ['vr', 'diner'], ['za', 'ontbijt'], ['za', 'lunch'], ['za', 'diner'], ['zo', 'ontbijt'], ['zo', 'lunch'],
];

const dagIndex = (d) => DAGEN.indexOf(d);
const soortIndex = (s) => SOORTEN.indexOf(s);

// Eerst de dag, dan ontbijt, lunch, diner.
export const opMaaltijd = (a, b) => dagIndex(a.dag) - dagIndex(b.dag) || soortIndex(a.soort) - soortIndex(b.soort);

// 'Zaterdag diner': de naam waarmee de maaltijd op de boodschappenlijst staat (KOK-3).
export const maaltijdNaam = (m) => `${DAGNAMEN[m.dag]} ${m.soort}`;

// De datum van een dag van het weekend, gegeven de vrijdag.
export const dagDatum = (vrijdag, dag) => datumPlus(vrijdag, dagIndex(dag));

// De dag (vr, za, zo) waarop een datum valt in het weekend, of null.
export function dagVanDatum(vrijdag, datum) {
  if (!vrijdag || !datum) return null;
  return DAGEN.find((d) => dagDatum(vrijdag, d) === datum) || null;
}

// §7.11.1, AAN-25: per dag op begintijd; gelijke tijd op titel.
export const opTijd = (a, b) => a.begin.localeCompare(b.begin) || a.titel.localeCompare(b.titel, 'nl', { sensitivity: 'base' });
export const puntenVanDag = (punten, dag) => punten.filter((p) => p.dag === dag).sort(opTijd);

// PRG-3, AAN-69: het punt dat nu loopt, anders het eerstvolgende. Een punt zonder eindtijd loopt tot het volgende begint.
// `tijd` is 'UU:MM'. Geeft { punt, nu } of null als er niets meer komt.
export function uitgelicht(puntenDag, tijd) {
  const lijst = [...puntenDag].sort(opTijd);
  for (let i = 0; i < lijst.length; i += 1) {
    const p = lijst[i];
    if (p.begin > tijd) return { punt: p, nu: false };
    const einde = p.eind || (lijst[i + 1] ? lijst[i + 1].begin : '');
    if (!einde || tijd < einde) {
      // Het laatste punt zonder eindtijd blijft "nu" tot het einde van de dag.
      return { punt: p, nu: true };
    }
  }
  return null;
}
