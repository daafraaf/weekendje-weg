// Stap zetten, verwachte data per stap en de deadline verlengen (spec §7.2, EDI-7, EDI-8, EDI-10).
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { STAPPEN, stapMogelijk } from '../../shared/stappen.js';

const DATUM_OF_LEEG = /^(\d{4}-\d{2}-\d{2})?$/;

// Velden van `editieBijwerken` die bij de stappen horen; de rest staat in vragen.js.
export const stapVelden = {
  deadline: v.optioneel(v.isoTijd()),
  stapData: v.optioneel(v.object(Object.fromEntries(STAPPEN.map((s) => [s, v.optioneel(v.tekst({ min: 0, max: 10, patroon: DATUM_OF_LEEG }))])))),
};

export const stappenVan = (editie) => ({ ...((editie && editie.stapData) || {}) });

// Wat de stappenschermen van een editie nodig hebben.
export const editieStappen = (e) => ({ id: e.id, titel: e.titel, jaar: e.jaar, stap: e.stap, deadline: e.deadline, stapData: stappenVan(e), versie: e.versie });

// EDI-8: de organisator past de verwachte datum per stap aan; een lege waarde betekent "volgt".
// EDI-10, AAN-57: verlengen kan alleen in de stap Invullen en alleen naar een latere deadline;
// de verwachte datum van Invullen schuift mee, de andere stappen blijven staan.
export function stapWijzigingen(editie, data) {
  const uit = {};
  const stapData = stappenVan(editie);
  if (data.stapData) {
    for (const [stap, datum] of Object.entries(data.stapData)) {
      if (datum) stapData[stap] = datum;
      else delete stapData[stap];
    }
    uit.stapData = stapData;
  }
  if (data.deadline !== undefined) {
    if (editie.stap !== 'invullen') throw new ApiFout('gesloten', 'De deadline kan alleen verlengd worden zolang de stap Invullen is.');
    if (!(Date.parse(data.deadline) > Date.parse(editie.deadline || 0))) throw new ApiFout('ongeldig', 'Kies een latere deadline dan de huidige.');
    uit.deadline = data.deadline;
    stapData.invullen = data.deadline.slice(0, 10);
    uit.stapData = stapData;
  }
  return uit;
}

// EDI-7: één stap vooruit of terug volgens §7.2.2. De voorkant toont daarna de WhatsApp-tekst van de nieuwe stap.
export const stapZetten = {
  schema: v.object({ stap: v.keuze(STAPPEN) }),
  uitvoeren({ store, editie, data }) {
    if (!stapMogelijk(editie.stap, data.stap)) {
      throw new ApiFout('ongeldig', data.stap === 'invullen' ? 'Terug naar Invullen kan niet meer vanaf Accommodatie.' : 'Je zet de stap één stap vooruit of één stap terug.');
    }
    const rij = store.werkBij('Edities', editie.id, { stap: data.stap }, editie.versie);
    return { editie: editieStappen(rij) };
  },
};

export const stappenHandlers = { stapZetten };
