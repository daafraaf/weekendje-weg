// SheetStore: adapter van de Store-interface op Google Sheets (spec §5 Celopslag, NFR-15, NFR-19).
// Elke waarde gaat als tekst de Sheet in: vóór elke setValues zet de adapter het bereik op '@',
// zodat '=...', '+31', '2027-04-09' of '09:30' niet in formules, getallen of datums veranderen.
import { maakStore } from '../store.js';

function celNaarTekst(waarde) {
  if (waarde === null || waarde === undefined) return '';
  if (waarde instanceof Date) return waarde.toISOString(); // alleen bij handmatig getypte cellen
  return String(waarde);
}

export function maakSheetAdapter(spreadsheet, flush) {
  function blad(tab) {
    return spreadsheet.getSheetByName(tab) || spreadsheet.insertSheet(tab);
  }
  return {
    leesWaarden(tab) {
      const waarden = blad(tab).getDataRange().getValues();
      if (waarden.length === 1 && waarden[0].every((c) => c === '' || c === null)) return [];
      return waarden.map((rij) => rij.map(celNaarTekst));
    },
    schrijfRij(tab, rijNr, waarden) {
      const b = blad(tab);
      // Een kop met nieuwe kolommen (store.js) kan breder zijn dan het blad; dan komen er kolommen bij.
      const breed = typeof b.getMaxColumns === 'function' ? b.getMaxColumns() : waarden.length;
      if (breed < waarden.length) b.insertColumnsAfter(breed, waarden.length - breed);
      const bereik = b.getRange(rijNr, 1, 1, waarden.length);
      bereik.setNumberFormat('@');
      bereik.setValues([waarden.map(String)]);
    },
    verwijderRij(tab, rijNr) {
      blad(tab).deleteRow(rijNr);
    },
    verwijderRijen(tab, vanaf, aantal) {
      blad(tab).deleteRows(vanaf, aantal);
    },
    flush,
  };
}

export function maakSheetStore(spreadsheet, { flush, random, nu }) {
  return maakStore(maakSheetAdapter(spreadsheet, flush), { random, nu });
}
