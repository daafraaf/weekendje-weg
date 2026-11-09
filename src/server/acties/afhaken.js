// Afhaken markeren en terugdraaien (EDI-9, GELD-11). Alleen de organisator (rechten.js).
// §7.13.9: bestaande posten blijven zoals ze zijn, dus een afgehaakte houdt zijn aandeel; nieuwe posten
// laten hem weg uit de standaardverdeling (`iedereen` in shared/verdeling.js).
// Claims vervallen bij afhaken (§7.7.5, AAN-11). Kamers en ritten: zie hieronder.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { claimsVervallen } from './items.js';
import { verwijderUitKamers } from './kamers.js';
import { verwijderUitRitten } from './ritten.js';

export const afhakenMarkeren = {
  schema: v.object({ deelnemerId: v.id(), afgehaakt: v.bool() }),
  uitvoeren({ store, editieId, data }) {
    const d = store.vind('Deelnemers', data.deelnemerId);
    if (!d || d.editieId !== editieId) throw new ApiFout('ongeldig', 'Deze deelnemer hoort niet bij de editie.');
    store.werkBij('Deelnemers', d.id, { afgehaakt: data.afgehaakt });
    if (data.afgehaakt) {
      claimsVervallen(store, editieId, d.id); // AAN-11: terugdraaien brengt de claims niet terug
      verwijderUitKamers(store, d.id); // §7.11.4: ook uit kamers en ritten, zonder terugkeer bij terugdraaien
      verwijderUitRitten(store, d.id);
    }
    return { deelnemerId: d.id, afgehaakt: data.afgehaakt };
  },
};

export const afhakenHandlers = { afhakenMarkeren };
