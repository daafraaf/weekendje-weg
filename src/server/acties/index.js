// Alle handlers van het doorgeefluik; Apps Script en de nepbackend gebruiken dezelfde set.
import { ApiFout } from '../fouten.js';
import { toegangHandlers } from './toegang.js';
import { beheertoegangHandlers } from './beheertoegang.js';
import { opzetHandlers } from './opzet.js';
import { ledenHandlers, beheerScherm } from './leden.js';
import { editieHandlers } from './editie.js';
import { vragenHandlers } from './vragen.js';
import { antwoordenHandlers, formulierScherm } from './antwoorden.js';
import { voortgangScherm, overzichtScherm } from './overzicht.js';
import { stappenHandlers } from './stappen.js';
import { postenHandlers, postenScherm } from './posten.js';
import { afrekeningHandlers, afrekeningScherm } from './afrekening.js';
import { afhakenHandlers } from './afhaken.js';
import { accommodatieHandlers, accommodatiesScherm } from './accommodatie.js';
import { itemsHandlers, meenemenScherm } from './items.js';

// Leesactie `scherm`: per naam één functie; schermen zonder functie bestaan nog niet.
const SCHERM_UITVOEREN = { beheer: beheerScherm, formulier: formulierScherm, voortgang: voortgangScherm, overzicht: overzichtScherm, posten: postenScherm, afrekening: afrekeningScherm, accommodaties: accommodatiesScherm, meenemen: meenemenScherm };
const scherm = {
  uitvoeren(h) {
    const f = SCHERM_UITVOEREN[h.ctx.scherm];
    if (!f) throw new ApiFout('ongeldig', 'Deze actie bestaat nog niet.');
    return f(h);
  },
};

export const ALLE_HANDLERS = { ...toegangHandlers, ...beheertoegangHandlers, ...opzetHandlers, ...ledenHandlers, ...editieHandlers, ...antwoordenHandlers, ...vragenHandlers, ...stappenHandlers, ...postenHandlers, ...afrekeningHandlers, ...afhakenHandlers, ...accommodatieHandlers, ...itemsHandlers, scherm };
