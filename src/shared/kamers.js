// Grenzen en teksten voor kamers en carpool (spec §7.11.2, §7.11.3). AAN-70: de grenzen zijn gekozen, de spec geeft ze niet.
import { VERBLIJF_WENSEN } from './antwoorden.js';

export const KAMER_GRENZEN = { naamMax: 40, slaapplaatsenMax: 12, aantalMax: 30 };
export const RIT_GRENZEN = { plaatsMax: 60, vrijeMax: 8 };

// De wens voor een eigen kamer uit het verblijfsblok (Ja, Liever wel, Maakt niet uit); leeg als niets is ingevuld.
const EIGEN_KAMER = VERBLIJF_WENSEN.find((w) => w.sleutel === 'eigenKamer');
export const eigenKamerLabel = (sleutel) => {
  const optie = EIGEN_KAMER.opties.find(([k]) => k === sleutel);
  return optie ? optie[1] : '';
};
