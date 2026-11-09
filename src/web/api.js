// Verbinding met het script (spec §3, §5.3): POST met text/plain, geen preflight.
// NFR-5: fetch gaat alleen naar script.google.com; de nepbackend gebruikt dezelfde vorm op localhost.
export const API_VERSIE = 1;
// AAN-14 (§7.17): een verouderd script krijgt overal dezelfde melding met de weg naar de uitleg.
export const VEROUDERD_TEKST = 'Het script van deze groep is verouderd. De eigenaar werkt het bij via de uitleg in de README (onderdeel Script bijwerken), altijd als nieuwe versie op de bestaande implementatie en nooit als nieuwe implementatie.';
export const OFFLINE_TEKST = 'Geen verbinding, je gegevens zijn veilig opgeslagen in de Sheet';

export class ApiFoutKlient extends Error {
  constructor(code, melding, data) { super(melding); this.code = code; this.data = data; }
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
          body: JSON.stringify({ actie, ...(sessie() ? { sessie: sessie() } : {}), ...(editieId() ? { editieId: editieId() } : {}), data, apiVersie: API_VERSIE }),
        });
        antwoord = await r.json();
      } catch {
        throw new ApiFoutKlient('offline', OFFLINE_TEKST);
      }
      if (!antwoord.ok) throw new ApiFoutKlient(antwoord.fout, antwoord.fout === 'api_versie' ? VEROUDERD_TEKST : antwoord.melding, antwoord.data);
      return antwoord.data;
    },
  };
}
