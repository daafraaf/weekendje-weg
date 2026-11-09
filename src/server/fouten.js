// Foutcodes en meldingen van het API-contract (spec §5.3).

export const MELDINGEN = {
  geen_toegang: 'Je hebt hier geen toegang toe.',
  geblokkeerd: 'Te veel foute pogingen. Probeer het later opnieuw.',
  verlopen: 'Je sessie is verlopen. Log opnieuw in.',
  gewijzigd: 'Iemand anders heeft dit net gewijzigd. Laad opnieuw en probeer het nog eens.',
  ongeldig: 'De invoer klopt niet.',
  gesloten: 'Dit kan nu niet meer.',
  druk: 'Even druk, probeer het opnieuw.',
  api_versie: 'Het script van deze groep is verouderd.',
  fout: 'Er ging iets mis. Probeer het later opnieuw.',
};

export class ApiFout extends Error {
  constructor(code, melding, data) {
    super(code);
    this.code = MELDINGEN[code] ? code : 'fout';
    this.melding = melding || MELDINGEN[this.code];
    this.data = data; // optioneel, bijvoorbeeld { tot } bij een blokkade
  }
}

export function foutAntwoord(code, melding, data) {
  const c = MELDINGEN[code] ? code : 'fout';
  const antwoord = { ok: false, fout: c, melding: melding || MELDINGEN[c] };
  if (data !== undefined) antwoord.data = data;
  return antwoord;
}
