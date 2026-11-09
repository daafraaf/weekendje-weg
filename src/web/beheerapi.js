// Verbinding met het script voor de beheerschermen: geeft de uitkomst of null en meldt de fout zelf.
import { maakApi } from './api.js';
import { scriptUrl } from './sessie.js';

// sessie: { scriptId, sessie }. editieId() levert de gekozen editie. bijVerlopen() sluit de beheersessie af.
export function maakBeheerApi({ sessie, editieId = () => '', bijVerlopen, toonMelding, fetchFn }) {
  const api = maakApi({ basisUrl: scriptUrl(sessie.scriptId), sessie: () => sessie.sessie, editieId, ...(fetchFn ? { fetchFn } : {}) });
  return async function anroep(actie, data, schrijft) {
    try {
      return await api.anroep(actie, data, { schrijft });
    } catch (f) {
      if (f.code === 'verlopen' || f.code === 'geen_toegang') { bijVerlopen(); return null; }
      toonMelding(f.message || 'Er ging iets mis. Probeer het later opnieuw.');
      return null;
    }
  };
}
