// Validatie van elk veld: type, lengte, bereik, enum; onbekende velden worden geweigerd (NFR-6).
import { ApiFout } from './fouten.js';

export const v = {
  tekst: (o = {}) => ({ soort: 'tekst', min: 0, max: 200, ...o }),
  getal: (o = {}) => ({ soort: 'getal', geheel: true, min: -1e12, max: 1e12, ...o }),
  bool: (o = {}) => ({ soort: 'bool', ...o }),
  keuze: (waarden, o = {}) => ({ soort: 'keuze', waarden, ...o }),
  datum: (o = {}) => ({ soort: 'datum', ...o }),
  tijd: (o = {}) => ({ soort: 'tijd', ...o }),
  isoTijd: (o = {}) => ({ soort: 'isoTijd', ...o }),
  id: (o = {}) => ({ soort: 'tekst', min: 16, max: 16, patroon: /^[A-Za-z0-9_-]{16}$/, ...o }),
  lijst: (van, o = {}) => ({ soort: 'lijst', van, max: 100, ...o }),
  object: (velden, o = {}) => ({ soort: 'object', velden, ...o }),
  map: (sleutel, waarde, o = {}) => ({ soort: 'map', sleutel, waarde, max: 200, ...o }),
  // Een object dat later door het schema van de actie wordt gecontroleerd.
  vrij: (o = {}) => ({ soort: 'vrij', ...o }),
  optioneel: (schema) => ({ ...schema, optioneel: true }),
};

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const fout = (pad, wat) => { throw new ApiFout('ongeldig', `Veld ${pad}: ${wat}.`); };

function geldigeDatum(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function valideer(schema, waarde, pad = 'data') {
  switch (schema.soort) {
    case 'tekst': {
      if (typeof waarde !== 'string') fout(pad, 'tekst verwacht');
      if (waarde.length < schema.min) fout(pad, 'te kort');
      if (waarde.length > schema.max) fout(pad, 'te lang');
      if (schema.patroon && !schema.patroon.test(waarde)) fout(pad, 'ongeldige vorm');
      return waarde;
    }
    case 'getal': {
      if (typeof waarde !== 'number' || !Number.isFinite(waarde)) fout(pad, 'getal verwacht');
      if (schema.geheel && !Number.isInteger(waarde)) fout(pad, 'geheel getal verwacht');
      if (waarde < schema.min || waarde > schema.max) fout(pad, 'buiten bereik');
      return waarde;
    }
    case 'bool':
      if (typeof waarde !== 'boolean') fout(pad, 'ja of nee verwacht');
      return waarde;
    case 'keuze':
      if (!schema.waarden.includes(waarde)) fout(pad, 'onbekende keuze');
      return waarde;
    case 'datum':
      if (typeof waarde !== 'string' || !geldigeDatum(waarde)) fout(pad, 'datum JJJJ-MM-DD verwacht');
      return waarde;
    case 'tijd':
      if (typeof waarde !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(waarde)) fout(pad, 'tijd UU:MM verwacht');
      return waarde;
    case 'isoTijd': {
      const m = typeof waarde === 'string' && /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(waarde);
      if (!m || !geldigeDatum(m[1]) || !Number.isFinite(Date.parse(waarde))) fout(pad, 'tijdstip met tijdzone verwacht');
      return waarde;
    }
    case 'lijst': {
      if (!Array.isArray(waarde)) fout(pad, 'lijst verwacht');
      if (waarde.length > schema.max) fout(pad, 'te veel items');
      return waarde.map((x, i) => valideer(schema.van, x, `${pad}[${i}]`));
    }
    case 'object': {
      if (!isObject(waarde)) fout(pad, 'object verwacht');
      for (const k of Object.keys(waarde)) {
        if (!Object.prototype.hasOwnProperty.call(schema.velden, k)) fout(`${pad}.${k}`, 'onbekend veld');
      }
      const uit = {};
      for (const [k, sub] of Object.entries(schema.velden)) {
        if (waarde[k] === undefined) {
          if (!sub.optioneel) fout(`${pad}.${k}`, 'ontbreekt');
          continue;
        }
        uit[k] = valideer(sub, waarde[k], `${pad}.${k}`);
      }
      return uit;
    }
    case 'map': {
      if (!isObject(waarde)) fout(pad, 'object verwacht');
      const sleutels = Object.keys(waarde);
      if (sleutels.length > schema.max) fout(pad, 'te veel items');
      const uit = {};
      for (const k of sleutels) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') fout(pad, 'ongeldige sleutel');
        valideer(schema.sleutel, k, `${pad} sleutel`);
        uit[k] = valideer(schema.waarde, waarde[k], `${pad}.${k}`);
      }
      return uit;
    }
    case 'vrij':
      if (!isObject(waarde)) fout(pad, 'object verwacht');
      return waarde;
    default:
      throw new Error('onbekend schema');
  }
}
