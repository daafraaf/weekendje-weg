// Verbinding met het script (spec §3, §5.3): POST met text/plain, geen preflight.
// NFR-5: fetch gaat alleen naar script.google.com; de nepbackend gebruikt dezelfde vorm op localhost.
export const API_VERSIE = 1;
export const OFFLINE_TEKST = 'Geen verbinding, je gegevens zijn veilig opgeslagen in de Sheet';

export class ApiFoutKlient extends Error {
  constructor(code, melding) { super(melding); this.code = code; }
}

export function maakApi({ basisUrl, sessie = () => '', editieId = () => '', fetchFn = (...a) => fetch(...a), online = () => navigator.onLine }) {
  return {
    // NFR-12: zonder verbinding wordt opslaan geblokkeerd; lezen mag het toch proberen.
    async anroep(actie, data = {}, { schrijft = false } = {}) {
      if (schrijft && !online()) throw new ApiFoutKlient('offline', OFFLINE_TEKST);
      let antwoord;
      try {
        const r = await fetchFn(basisUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ actie, sessie: sessie(), editieId: editieId(), data, apiVersie: API_VERSIE }),
        });
        antwoord = await r.json();
      } catch {
        throw new ApiFoutKlient('offline', OFFLINE_TEKST);
      }
      if (!antwoord.ok) throw new ApiFoutKlient(antwoord.fout, antwoord.melding);
      return antwoord.data;
    },
  };
}
