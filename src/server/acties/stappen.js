// Stap zetten en de deadline verlengen (spec §7.2, EDI-7, EDI-10). De verwachte data per stap zijn vervallen (DDL-1); de kolom stapData blijft ongebruikt.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { STAPPEN, stapMogelijk } from '../../shared/stappen.js';
import { deelvormVan } from '../../shared/accommodatie.js';

// Velden van `editieBijwerken` die bij de stappen horen; de rest staat in vragen.js.
export const stapVelden = {
  deadline: v.optioneel(v.isoTijd()),
};

// Wat de stappenschermen van een editie nodig hebben.
export const editieStappen = (e) => ({ id: e.id, titel: e.titel, jaar: e.jaar, stap: e.stap, deadline: e.deadline, versie: e.versie });

// EDI-10, AAN-57, DDL-1: verlengen kan alleen in de stap Invullen en alleen naar een latere deadline.
export function stapWijzigingen(editie, data) {
  const uit = {};
  if (data.deadline !== undefined) {
    if (editie.stap !== 'invullen') throw new ApiFout('gesloten', 'De deadline kan alleen verlengd worden zolang de stap Invullen is.');
    if (!(Date.parse(data.deadline) > Date.parse(editie.deadline || 0))) throw new ApiFout('ongeldig', 'Kies een latere deadline dan de huidige.');
    uit.deadline = data.deadline;
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
    return { editie: { ...editieStappen(rij), deelvorm: deelvormVan(rij.deelvorm) } }; // ACC-9: de WhatsApp-tekst hangt ervan af
  },
};

export const stappenHandlers = { stapZetten };
