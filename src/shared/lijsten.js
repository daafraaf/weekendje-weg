// Wensblokken en eigen vragen die voorkant en script delen (spec §5.2 Edities.lijsten, §7.4.1, §7.4.2, §7.7.2, FRM-5 t/m FRM-7, EDI-2, EDI-3).
import { BLOKKEN_STANDAARD } from './editie.js';

// AAN-53: de spec noemt alleen een paar voorbeelden; dit zijn de startlijsten voor een nieuwe editie.
// De lijsten keuken en spullen zijn de startlijsten van "wie neemt wat mee" (§7.7.2).
export const LIJSTEN_STANDAARD = {
  activiteiten: [
    ['wandelen', 'Wandelen'], ['fietsen', 'Fietsen'], ['kanoen', 'Kanoën of suppen'], ['escaperoom', 'Escape room'],
    ['smeden', 'Smeden'], ['sauna', 'Sauna of wellness'], ['bowlen', 'Bowlen'], ['bordspellen', 'Bordspellen'],
  ],
  programma: [
    ['uitslapen', 'Uitslapen'], ['vroegopstaan', 'Vroeg op pad'], ['bordspellen', 'Bordspellen'], ['borrelen', 'Lang borrelen'],
    ['kampvuur', 'Kampvuur'], ['film', 'Filmavond'], ['rustig', 'Rustig aan doen'],
  ],
  etenDrinken: [
    ['vegetarisch', 'Vegetarisch'], ['veganistisch', 'Veganistisch'], ['geenvis', 'Geen vis'], ['ipa', 'IPA'],
    ['nulbier', '0,0 bier'], ['wijn', 'Wijn'], ['whisky', 'Whisky'], ['barbecue', 'Barbecue'],
  ],
  keuken: [
    ['olijfolie', 'Olijfolie'], ['zoutpeper', 'Zout en peper'], ['kruiden', 'Kruiden'], ['mayonaise', 'Mayonaise'],
    ['pindakaas', 'Pindakaas'], ['ketchup', 'Ketchup'], ['suiker', 'Suiker'], ['koffie', 'Koffie'], ['thee', 'Thee'],
  ],
  spullen: [['bordspellen', 'Bordspellen'], ['speaker', 'Speaker'], ['kaartspel', 'Kaartspel']],
};

// Welke lijst bij welk formulierblok hoort, met de kop en de tekst van het vrije veld.
export const WENSBLOKKEN = [
  { blok: 'activiteiten', kop: 'Activiteiten', uitleg: 'Waar heb je zin in?', eigenLabel: 'Zelf iets bedacht?' },
  { blok: 'programma', kop: 'Programma en sfeer', uitleg: 'Hoe wil je dat het weekend voelt?', eigenLabel: 'Verder nog iets?' },
  { blok: 'etenDrinken', kop: 'Eten en drinken', uitleg: 'Wat eet en drink je graag, en waar moeten we rekening mee houden?', eigenLabel: 'Allergieën of anders?' },
];

// De vijf lijsten die de organisator beheert, in de volgorde van het scherm.
export const LIJSTEN_NAMEN = {
  activiteiten: 'Activiteiten', programma: 'Programma en sfeer', etenDrinken: 'Eten en drinken',
  keuken: 'Wie neemt wat mee: uit de keuken', spullen: 'Wie neemt wat mee: spullen',
};

export const LIJST_MAX = 40;
export const LABEL_MAX = 60;

const startlijst = (sleutel) => LIJSTEN_STANDAARD[sleutel].map(([s, label]) => ({ sleutel: s, label }));

// Een editie zonder opgeslagen lijst (bijvoorbeeld van vóór fase 8) krijgt de startlijst.
export function lijstenVan(editie) {
  const eigen = (editie && editie.lijsten) || {};
  return Object.fromEntries(Object.keys(LIJSTEN_STANDAARD).map((k) => [k, Array.isArray(eigen[k]) ? eigen[k] : startlijst(k)]));
}

export const startlijsten = () => Object.fromEntries(Object.keys(LIJSTEN_STANDAARD).map((k) => [k, startlijst(k)]));

export const blokkenVan = (editie) => ({ ...BLOKKEN_STANDAARD, ...((editie && editie.blokken) || {}) });

// Sleutel uit een label: kleine letters en cijfers, uniek binnen de lijst.
export function maakSleutel(label, bezet) {
  const basis = (label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)) || 'item';
  let s = basis;
  for (let n = 2; bezet.has(s); n += 1) s = `${basis}${n}`;
  return s;
}

// §5.1 Vragen.type
export const VRAAGTYPEN = ['janee', 'keuze', 'meerkeuze', 'schaal', 'tekst'];
export const VRAAGTYPE_NAMEN = { janee: 'Ja of nee', keuze: 'Eén keuze', meerkeuze: 'Meerdere keuzes', schaal: 'Schaal van 1 tot 5', tekst: 'Tekst' };
export const VRAAG_OPTIES = { min: 2, max: 10 };
export const VRAAG_TEKST_MAX = 200;
export const VRAGEN_MAX = 20;

// AAN-54: een antwoord op een eigen vraag is een tekst in Antwoorden.data.eigenVragen:
// janee 'ja' of 'nee', keuze de sleutel van de optie, meerkeuze de sleutels met komma's, schaal '1' tot '5', tekst de tekst zelf.
export function antwoordGeldig(vraag, waarde) {
  const sleutels = (vraag.opties || []).map((o) => o.sleutel);
  switch (vraag.type) {
    case 'janee': return waarde === 'ja' || waarde === 'nee';
    case 'keuze': return sleutels.includes(waarde);
    case 'meerkeuze': { const d = waarde.split(','); return d.every((s) => sleutels.includes(s)) && new Set(d).size === d.length; }
    case 'schaal': return /^[1-5]$/.test(waarde);
    default: return waarde.length <= 500;
  }
}
