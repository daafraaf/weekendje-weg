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

// Leesactie `scherm`: per naam één functie; schermen zonder functie bestaan nog niet.
const SCHERM_UITVOEREN = { beheer: beheerScherm, formulier: formulierScherm, voortgang: voortgangScherm, overzicht: overzichtScherm };
const scherm = {
  uitvoeren(h) {
    const f = SCHERM_UITVOEREN[h.ctx.scherm];
    if (!f) throw new ApiFout('ongeldig', 'Deze actie bestaat nog niet.');
    return f(h);
  },
};

export const ALLE_HANDLERS = { ...toegangHandlers, ...beheertoegangHandlers, ...opzetHandlers, ...ledenHandlers, ...editieHandlers, ...antwoordenHandlers, ...vragenHandlers, ...stappenHandlers, scherm };
