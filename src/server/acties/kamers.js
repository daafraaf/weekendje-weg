// Kamers en kamerindeling (spec §5.1, §7.11.2, §7.11.4, KMR-1).
// Wie wat mag staat in rechten.js: de organisator maakt kamers en deelt in, iedereen ziet de indeling.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { KAMER_GRENZEN as G } from '../../shared/kamers.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { deelnemersVan, mijnRij, naamFunctie } from './posten.js';

const kamersVan = (store, editieId) => store.lees('Kamers').filter((k) => k.editieId === editieId);
const bewonersVan = (store, kamerId) => store.lees('Kamerindeling').filter((r) => r.kamerId === kamerId);

function bestaandeKamer(store, editieId, id) {
  const k = store.vind('Kamers', id);
  if (!k || k.editieId !== editieId) throw new ApiFout('gewijzigd');
  return k;
}

// §7.11.4: een afgehaakte deelnemer verdwijnt uit de kamerindeling (terugdraaien brengt hem niet terug).
export function verwijderUitKamers(store, deelnemerId) {
  for (const r of store.lees('Kamerindeling').filter((x) => x.deelnemerId === deelnemerId)) store.verwijder('Kamerindeling', r.id);
}

// KMR-1, AAN-23, AAN-70: naam en slaapplaatsen; minder slaapplaatsen dan er bewoners zijn kan niet.
// `verwijderen` haalt de kamer met zijn indeling weg (de spec kent geen aparte actie).
export const kamersOpslaan = {
  schema: v.object({
    id: v.optioneel(v.id()),
    naam: v.optioneel(v.tekst({ max: G.naamMax })),
    slaapplaatsen: v.optioneel(v.getal({ min: 1, max: G.slaapplaatsenMax })),
    verwijderen: v.optioneel(v.bool()),
  }),
  uitvoeren({ store, editieId, data }) {
    if (data.verwijderen) {
      if (!data.id) throw new ApiFout('ongeldig', 'Kies de kamer die weg moet.');
      const k = bestaandeKamer(store, editieId, data.id);
      for (const r of bewonersVan(store, k.id)) store.verwijder('Kamerindeling', r.id);
      store.verwijder('Kamers', k.id);
      return {};
    }
    const naam = (data.naam || '').trim().replace(/\s+/g, ' ');
    if (!naam) throw new ApiFout('ongeldig', 'Geef de kamer een naam.');
    if (!data.slaapplaatsen) throw new ApiFout('ongeldig', 'Geef het aantal slaapplaatsen op.');
    if (!data.id) {
      if (kamersVan(store, editieId).length >= G.aantalMax) throw new ApiFout('ongeldig', `Er passen hooguit ${G.aantalMax} kamers in een editie.`);
      return { id: store.voegToe('Kamers', { editieId, naam, slaapplaatsen: data.slaapplaatsen }).id };
    }
    const k = bestaandeKamer(store, editieId, data.id);
    if (bewonersVan(store, k.id).length > data.slaapplaatsen) throw new ApiFout('ongeldig', 'Er slapen al meer mensen in deze kamer.');
    store.werkBij('Kamers', k.id, { naam, slaapplaatsen: data.slaapplaatsen });
    return { id: k.id };
  },
};

// KMR-1, AAN-23: iemand in een kamer zetten of eruit halen (zonder kamerId). Een deelnemer slaapt in hooguit één kamer;
// een volle kamer weigert een extra persoon.
export const kamerIndelen = {
  schema: v.object({ deelnemerId: v.id(), kamerId: v.optioneel(v.id()) }),
  uitvoeren({ store, editieId, data }) {
    const d = store.vind('Deelnemers', data.deelnemerId);
    if (!d || d.editieId !== editieId) throw new ApiFout('ongeldig', 'Deze deelnemer hoort niet bij de editie.');
    const eigen = store.lees('Kamerindeling').find((r) => r.deelnemerId === d.id);
    if (!data.kamerId) {
      if (eigen) store.verwijder('Kamerindeling', eigen.id);
      return { deelnemerId: d.id };
    }
    if (d.afgehaakt) throw new ApiFout('ongeldig', 'Een afgehaakte deelnemer deel je niet in.');
    const k = bestaandeKamer(store, editieId, data.kamerId);
    if (eigen && eigen.kamerId === k.id) return { deelnemerId: d.id, kamerId: k.id };
    if (bewonersVan(store, k.id).length >= k.slaapplaatsen) throw new ApiFout('ongeldig', `${k.naam} is vol.`); // AAN-23
    if (eigen) store.werkBij('Kamerindeling', eigen.id, { kamerId: k.id });
    else store.voegToe('Kamerindeling', { kamerId: k.id, deelnemerId: d.id });
    return { deelnemerId: d.id, kamerId: k.id };
  },
};

// Scherm `kamers`: kamers met bewoners en wie nog geen kamer heeft, elk met de wens voor een eigen kamer.
// Alleen de organisator krijgt deelnemer-ID's, want alleen hij deelt in.
export function kamersScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const organisator = sessie.rol === 'organisator';
  const actief = deelnemersVan(store, editie.id).filter((d) => !d.afgehaakt);
  const naam = naamFunctie(store, actief);
  const ik = mijnRij(store, sessie, editie.id);
  const wens = new Map(store.lees('Antwoorden').filter((a) => a.editieId === editie.id).map((a) => [a.deelnemerId, ((a.data || {}).verblijf || {}).eigenKamer || '']));
  const persoon = (id) => ({ ...(organisator ? { deelnemerId: id } : {}), naam: naam(id), ik: id === ik, eigenKamer: wens.get(id) || '' });
  const ingedeeld = new Set();
  const kamers = kamersVan(store, editie.id).sort((a, b) => a.naam.localeCompare(b.naam, 'nl')).map((k) => {
    const bewoners = bewonersVan(store, k.id).filter((r) => actief.some((d) => d.id === r.deelnemerId));
    bewoners.forEach((r) => ingedeeld.add(r.deelnemerId));
    return { id: k.id, naam: k.naam, slaapplaatsen: k.slaapplaatsen, vrij: Math.max(0, k.slaapplaatsen - bewoners.length), bewoners: bewoners.map((r) => persoon(r.deelnemerId)) };
  });
  return {
    edities,
    editie: editieStappen(editie),
    organisator,
    ikDeelnemer: Boolean(ik),
    alleenLezen: editie.stap === 'afgerond',
    kamers,
    zonderKamer: actief.filter((d) => !ingedeeld.has(d.id)).map((d) => persoon(d.id)).sort((a, b) => a.naam.localeCompare(b.naam, 'nl')),
  };
}

export const kamersHandlers = { kamersOpslaan, kamerIndelen };
