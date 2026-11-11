// NFR-21: de enige plek waar een foutmelding van het script gewone taal wordt. Het script houdt zijn
// technische teksten ("Veld data.tekst: te kort."), zodat logs en tests ze herkennen; de gebruiker ziet
// nooit een veldnaam of code. Pure module, ook bruikbaar in Node.

// AAN-14 (§7.17): een verouderd script krijgt overal dezelfde melding met de weg naar de uitleg.
export const VEROUDERD_TEKST = 'Het script van deze groep is verouderd. De eigenaar werkt het bij via de uitleg in de README (onderdeel Script bijwerken), altijd als nieuwe versie op de bestaande implementatie en nooit als nieuwe implementatie.';
export const ONBEKENDE_ACTIE_TEKST = 'Deze handeling kent het script van de groep nog niet. Vraag de eigenaar het script bij te werken.';
const ALGEMEEN = 'De invoer klopt niet. Controleer wat je hebt ingevuld.';

// Per veld (laatste deel van het pad) hoe het in een zin heet; per actie kan een veld anders heten.
const VELDEN = {
  tekst: { vul: 'een tekst', de: 'De tekst' },
  naam: { vul: 'een naam', de: 'De naam' },
  label: { vul: 'een naam', de: 'De naam' },
  titel: { vul: 'een titel', de: 'De titel' },
  opties: { vul: 'de antwoordopties', de: 'De antwoordopties' },
  bedrag: { vul: 'een bedrag', de: 'Het bedrag' },
  omschrijving: { vul: 'een omschrijving', de: 'De omschrijving' },
  woonplaats: { vul: 'een woonplaats', de: 'De woonplaats' },
  datum: { vul: 'een datum', de: 'De datum' },
  link: { vul: 'een link', de: 'De link' },
  waarde: { vul: 'een antwoord', de: 'Het antwoord' },
  pincode: { vul: 'de pincode', de: 'De pincode' },
  wachtwoord: { vul: 'een wachtwoord', de: 'Het wachtwoord' },
  categorie: { vul: 'een categorie', de: 'De categorie' },
};
const PER_ACTIE = {
  vragenBeheren: { tekst: { vul: 'een vraag', de: 'De vraag' } },
};

// code en melding komen van het script; actie is de aanroep (bij de wachtrij de actie in de bundel).
export function leesbareMelding(code, melding = '', actie = '') {
  if (code !== 'ongeldig') return melding;
  const m = /^Veld (.+?): (.+?)\.?$/.exec(melding || '');
  if (!m) return melding || ALGEMEEN;
  const [, pad, wat] = m;
  const delen = pad.replace(/\[\d+\]/g, '').split(/[. ]/).filter(Boolean);
  const laatste = delen[delen.length - 1];
  if (pad === 'verzoek.apiVersie') return VEROUDERD_TEKST;
  if (laatste === 'actie' && wat === 'onbekende keuze') return ONBEKENDE_ACTIE_TEKST;
  const veld = (PER_ACTIE[actie] || {})[laatste] || VELDEN[laatste];
  if (!veld) return ALGEMEEN;
  if (wat === 'te kort' || wat === 'ontbreekt') return `Vul ${veld.vul} in.`;
  if (wat === 'te lang') return `${veld.de} is te lang.`;
  if (wat === 'te veel items') return `${veld.de} bevat te veel onderdelen.`;
  return `${veld.de} klopt niet.`;
}
