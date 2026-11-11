// Verbinding met het script (spec §3, §5.3): POST met text/plain, geen preflight.
// NFR-5: fetch gaat alleen naar script.google.com; de nepbackend gebruikt dezelfde vorm op localhost.
import { VEROUDERD_TEKST, leesbareMelding } from './foutteksten.js';

// NFR-22, §7.17: gelijk aan API_VERSIE in src/server/api.js; elke wijziging van ACTIES verhoogt hem aan beide
// kanten (de snapshot in test/unit/foutafhandeling.test.mjs bewaakt dat).
export const API_VERSIE = 2;
export { VEROUDERD_TEKST };
export const OFFLINE_TEKST = 'Geen verbinding, je gegevens zijn veilig opgeslagen in de Sheet';

export class ApiFoutKlient extends Error {
  constructor(code, melding, data) { super(melding); this.code = code; this.data = data; }
}

// Bezig-melding: de schil luistert mee, zodat elk scherm dezelfde lader krijgt en opslaan niet dubbel gaat.
// De luisteraar krijgt { alle, schrijft }: het aantal lopende verzoeken en hoeveel daarvan schrijven.
const lopend = { alle: 0, schrijft: 0 };
let bezigLuisteraar = null;
export function bijBezig(fn) { bezigLuisteraar = fn; }
function tel(d, schrijft) {
  lopend.alle += d;
  if (schrijft) lopend.schrijft += d;
  if (bezigLuisteraar) bezigLuisteraar({ ...lopend });
}

export function maakApi({ basisUrl, sessie = () => '', editieId = () => '', fetchFn = (...a) => fetch(...a), online = () => navigator.onLine }) {
  return {
    // NFR-12: zonder verbinding wordt een grote actie geblokkeerd; lezen mag het toch proberen. Kleine
    // handelingen wachten in de wachtrij tot de verbinding terug is.
    // SYNC-1: `stil` (de wachtrij) telt niet mee voor de lader en de blokkade van de schrijfknoppen.
    async anroep(actie, data = {}, { schrijft = false, stil = false } = {}) {
      if (schrijft && !online()) throw new ApiFoutKlient('offline', OFFLINE_TEKST);
      let antwoord;
      if (!stil) tel(1, schrijft);
      try {
        const r = await fetchFn(basisUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ actie, ...(sessie() ? { sessie: sessie() } : {}), ...(editieId() ? { editieId: editieId() } : {}), data, apiVersie: API_VERSIE }),
        });
        antwoord = await r.json();
      } catch {
        throw new ApiFoutKlient('offline', OFFLINE_TEKST);
      } finally {
        if (!stil) tel(-1, schrijft);
      }
      // NFR-21: de gebruiker ziet de melding in gewone taal; een veldnaam van het script komt niet in beeld.
      if (!antwoord.ok) throw new ApiFoutKlient(antwoord.fout, antwoord.fout === 'api_versie' ? VEROUDERD_TEKST : leesbareMelding(antwoord.fout, antwoord.melding, actie), antwoord.data);
      return antwoord.data;
    },
  };
}
