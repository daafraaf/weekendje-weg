// Bundel van kleine handelingen uit de wachtrij van de voorkant (SYNC-2, SYNC-7, spec §5.3, §7.16.5).
// De API voert de bundel uit onder één slot met één flush; elke actie in de bundel loopt door dezelfde
// rechten, validatie, uitvoering en Log als een losse aanroep en krijgt een eigen uitslag. Een fout in één
// actie stopt de rest niet. De vaste lijst staat in src/shared/synchronisatie.js.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { BUNDEL_ACTIES, BUNDEL_MAX } from '../../shared/synchronisatie.js';

export const bundelSchema = v.object({
  acties: v.lijst(v.object({ actie: v.keuze(BUNDEL_ACTIES), data: v.optioneel(v.vrij()) }), { max: BUNDEL_MAX }),
});

// voerUit(actie, data) voert één actie uit zoals de API dat doet en geeft haar data terug, of gooit.
export function voerBundelUit(acties, voerUit, logFout = () => {}) {
  const uitslagen = acties.map(({ actie, data }) => {
    try {
      const uit = voerUit(actie, data || {});
      return { ok: true, data: uit === undefined ? {} : uit };
    } catch (e) {
      if (e instanceof ApiFout) return { ok: false, fout: e.code, melding: e.melding };
      logFout(e);
      return { ok: false, fout: 'fout' };
    }
  });
  return { uitslagen };
}
