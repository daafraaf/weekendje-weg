// UIT-2: alle uitlegteksten van de stappen op één plek. De namen komen uit STAPNAMEN (STA-8); uitgezette onderdelen
// (OND-1) komen er niet in (een test controleert dat). Per stap: wat er gebeurt, wat het oplevert en wat jij doet,
// voor de deelnemer en de organisator apart waar ze verschillen. Alleen gewone tekst, getoond via textContent (NFR-5).
import { STAPPEN } from '../shared/stappen.js';

export const UITLEG = {
  invullen: {
    gebeurt: 'Iedereen vult los van de rest in wanneer het kan, wat hij of zij leuk vindt en wat het mag kosten.',
    oplevert: 'Een eerlijk beeld van de groep.',
    deelnemer: 'Vul het formulier in. Elk veld wordt meteen bewaard, opslaan hoeft dus niet. De deadline is een vriendelijke duw, geen harde grens.',
    organisator: 'Nodig iedereen uit, houd de voortgang bij en stuur een herinnering naar wie nog stil is. Vul zelf ook in.',
  },
  overzicht: {
    gebeurt: 'Alle antwoorden komen samen in één overzicht. Je ziet direct welke weekenden voor de meesten werken.',
    oplevert: 'Eén weekend dat vastligt.',
    deelnemer: 'Kijk mee en zie welk weekend het gaat worden. Prikken doet de organisator.',
    organisator: 'Kies het beste weekend en leg het vast. Bedacht je je? Met Ander weekend kiezen maak je het weer los.',
  },
  accommodatie: {
    gebeurt: 'Er komt een plek om te slapen. Dat is een verrassing of iets wat de groep samen kiest.',
    oplevert: 'Een geboekte accommodatie.',
    deelnemer: 'Bij Samen kiezen zet je je top 3 neer (3, 2 en 1 punt). Bij Verrassing hoef je niets te doen, behalve nieuwsgierig zijn.',
    organisator: 'Kies Verrassing of Samen kiezen, voeg opties toe met bedden en eigen kamers en boek. Een verrassing onthul je zelf, nooit automatisch.',
  },
  voorbereiding: {
    gebeurt: 'Wie neemt wat mee wordt verdeeld, zodat niemand met vijf grillpannen aankomt.',
    oplevert: 'Een lijst met wie wat regelt.',
    deelnemer: 'Claim wat jij meeneemt. Bedacht je je? Trek je claim gewoon weer in.',
    organisator: 'Houd in de gaten wat nog niemand heeft geclaimd en zet daar desnoods een naam achter.',
  },
  weekend: {
    gebeurt: 'Het weekend zelf. Wat je voor de groep betaalt, zet je in de app.',
    oplevert: 'Alle kosten op één plek.',
    deelnemer: 'Betaal je iets voor de groep? Voeg de uitgave toe bij Afrekening, onder Wie betaalt wat.',
    organisator: 'Hetzelfde als de rest: voeg uitgaven toe en kijk of de lijst klopt.',
  },
  afrekenen: {
    gebeurt: 'De uitgaven worden verrekend. Onder Wie betaalt wat staan de uitgaven, onder Eindafrekening wie aan wie hoeveel overmaakt.',
    oplevert: 'Niemand betaalt te veel en niemand te weinig.',
    deelnemer: 'Kijk in de Eindafrekening wat jij moet betalen of krijgt en maak het over.',
    organisator: 'Controleer de uitgaven en houd bij wie al betaald heeft. Daarna kan de editie afgerond worden.',
  },
  afgerond: {
    gebeurt: 'Alles is geregeld. Het weekend staat in Afgelopen weekenden.',
    oplevert: 'Een mooie herinnering en een lege agenda voor volgend jaar.',
    deelnemer: 'Terugkijken kan op Start, onder Afgelopen weekenden.',
    organisator: 'Terugkijken kan op Start. Klaar voor de volgende? Begin een nieuwe editie.',
  },
};

// De route op Start toont de stappen tot en met Afrekening; Afgerond is de finish en staat alleen bij het info-icoon.
export const ROUTE_STAPPEN = STAPPEN.filter((s) => s !== 'afgerond');

export const uitlegVoor = (stap, organisator) => {
  const u = UITLEG[stap];
  return u ? { gebeurt: u.gebeurt, oplevert: u.oplevert, jij: organisator ? u.organisator : u.deelnemer } : null;
};

// AAN-85: de vlag staat per apparaat in localStorage en staat los van de rondleiding (AAN-73). Zonder opslag
// (privémodus, geblokkeerd) telt de route als niet gezien en blijft sluiten voor die sessie gelden.
export const ROUTE_SLEUTEL = 'ww-route-gezien';
export function routeGezien(opslag) {
  try { return opslag.getItem(ROUTE_SLEUTEL) === '1'; } catch { return false; }
}
export function zetRouteGezien(opslag) {
  try { opslag.setItem(ROUTE_SLEUTEL, '1'); } catch { /* geen opslag: de kaart blijft dicht tot het scherm opnieuw laadt */ }
}
