// Verbinding met het script voor de beheerschermen: geeft de uitkomst of null en meldt de fout zelf.
import { maakApi } from './api.js';
import { scriptUrl } from './sessie.js';

// sessie: { scriptId, sessie }. editieId() levert de gekozen editie. bijVerlopen() sluit de beheersessie af.
export function maakBeheerApi({ sessie, editieId = () => '', bijVerlopen, toonMelding, fetchFn }) {
  const api = maakApi({ basisUrl: scriptUrl(sessie.scriptId), sessie: () => sessie.sessie, editieId, ...(fetchFn ? { fetchFn } : {}) });
  // bijGesloten (optioneel): een scherm dat nog niet aan de beurt is, toont dat zelf in plaats van de foutmelding.
  return async function anroep(actie, data, schrijft, { bijGesloten } = {}) {
    try {
      return await api.anroep(actie, data, { schrijft });
    } catch (f) {
      if (f.code === 'verlopen' || f.code === 'geen_toegang') { bijVerlopen(); return null; }
      if (f.code === 'gesloten' && bijGesloten) { bijGesloten(); return null; }
      toonMelding(f.message || 'Er ging iets mis. Probeer het later opnieuw.');
      return null;
    }
  };
}
