// Afhaken markeren en terugdraaien (EDI-9, GELD-11). Alleen de organisator (rechten.js).
// §7.13.9: bestaande posten blijven zoals ze zijn, dus een afgehaakte houdt zijn aandeel; nieuwe posten
// laten hem weg uit de standaardverdeling (`iedereen` in shared/verdeling.js).
// De gevolgen voor claims (§7.7.5) en kamers en carpool (§7.11.4) horen bij fase 13 en 16.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';

export const afhakenMarkeren = {
  schema: v.object({ deelnemerId: v.id(), afgehaakt: v.bool() }),
  uitvoeren({ store, editieId, data }) {
    const d = store.vind('Deelnemers', data.deelnemerId);
    if (!d || d.editieId !== editieId) throw new ApiFout('ongeldig', 'Deze deelnemer hoort niet bij de editie.');
    store.werkBij('Deelnemers', d.id, { afgehaakt: data.afgehaakt });
    return { deelnemerId: d.id, afgehaakt: data.afgehaakt };
  },
};

export const afhakenHandlers = { afhakenMarkeren };
