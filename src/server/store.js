// Store-interface (spec §5, §7.16, NFR-15, NFR-19).
// Eén logica voor typen, cache en versies; de adapter levert alleen ruwe tekstcellen:
//   adapter.leesWaarden(tab) -> string[][] (rij 1 is de kop; leeg blad geeft [])
//   adapter.schrijfRij(tab, rijNr, string[])   rijNr telt vanaf 1, zoals in Sheets
//   adapter.verwijderRij(tab, rijNr)
//   adapter.verwijderRijen(tab, vanafRijNr, aantal)
//   adapter.flush()
import { ApiFout } from './fouten.js';
import { maakId } from './crypto.js';

// Kolomtypen: s tekst, n getal, b boolean, j JSON.
const s = 's', n = 'n', b = 'b', j = 'j';

export const TABS = {
  Groep: { sleutel: null, kolommen: { naam: s, apiVersie: n, opgezet: b, aangemaakt: s } },
  Leden: { kolommen: { id: s, voornaam: s, woonplaats: s, actief: b } },
  Edities: { kolommen: { id: s, jaar: n, titel: s, stap: s, stapData: j, periodeVan: s, periodeTot: s, voorkeursmaanden: j, deadline: s, blokken: j, lijsten: j, vastgelegdWeekend: s, deelvorm: s, geboektAccommodatieId: s, boodschappenDefinitief: b, versie: n, bijgewerkt: s } },
  Deelnemers: { kolommen: { id: s, editieId: s, lidId: s, tokenHash: s, pinHash: s, pinSalt: s, rol: s, afgehaakt: b, ingevuld: b, ingevuldOp: s } },
  Beheerlinks: { kolommen: { id: s, lidId: s, tokenHash: s, wachtwoordHash: s, wachtwoordSalt: s, actief: b, gemaakt: s } },
  Antwoorden: { kolommen: { id: s, editieId: s, deelnemerId: s, data: j, versie: n, bijgewerkt: s } },
  Vragen: { kolommen: { id: s, editieId: s, volgorde: n, type: s, tekst: s, opties: j } },
  Accommodaties: { kolommen: { id: s, editieId: s, naam: s, plaats: s, link: s, prijsTotaal: n, notitie: s, versie: n } },
  Stemmen: { kolommen: { id: s, editieId: s, deelnemerId: s, accommodatieId: s } },
  Items: { kolommen: { id: s, editieId: s, soort: s, naam: s, categorie: s, maaltijdId: s, toegevoegdDoor: s, afgevinkt: b, versie: n } },
  Claims: { kolommen: { id: s, itemId: s, deelnemerId: s, gemaakt: s } },
  Maaltijden: { kolommen: { id: s, editieId: s, dag: s, soort: s, omschrijving: s } },
  Koks: { kolommen: { id: s, maaltijdId: s, deelnemerId: s } },
  Programma: { kolommen: { id: s, editieId: s, dag: s, begin: s, eind: s, titel: s, adres: s, link: s, notitie: s } },
  Kamers: { kolommen: { id: s, editieId: s, naam: s, slaapplaatsen: n } },
  Kamerindeling: { kolommen: { id: s, kamerId: s, deelnemerId: s } },
  Ritten: { kolommen: { id: s, editieId: s, bestuurderId: s, vertrekplaats: s, vrijePlaatsen: n } },
  Meerijders: { kolommen: { id: s, ritId: s, deelnemerId: s } },
  Posten: { kolommen: { id: s, editieId: s, soort: s, omschrijving: s, bedrag: n, betalerId: s, datum: s, categorie: s, verdeling: j, aangemaaktDoor: s, aangepastDoorOrganisator: b, versie: n, bijgewerkt: s } },
  Betalingen: { kolommen: { id: s, editieId: s, vanId: s, naarId: s, bedrag: n, betaaldOp: s } },
  Sessies: { kolommen: { id: s, tokenHash: s, soort: s, subjectId: s, verloopt: s } },
  Pogingen: { sleutel: 'sleutel', kolommen: { sleutel: s, fout: n, geblokkeerdTot: s, blokkades: n } },
  Log: { sleutel: null, kolommen: { tijd: s, actie: s, wie: s, editieId: s, detail: s } },
};

const sleutelVan = (tab) => (TABS[tab].sleutel === undefined ? 'id' : TABS[tab].sleutel);

export function naarCel(type, waarde) {
  if (waarde === null || waarde === undefined) return '';
  switch (type) {
    case s: if (typeof waarde !== 'string') throw new Error('tekst verwacht'); return waarde;
    case n: if (typeof waarde !== 'number' || !Number.isFinite(waarde)) throw new Error('getal verwacht'); return String(waarde);
    case b: if (typeof waarde !== 'boolean') throw new Error('boolean verwacht'); return waarde ? 'true' : 'false';
    case j: return JSON.stringify(waarde);
    default: throw new Error('onbekend type');
  }
}

export function uitCel(type, tekst) {
  const t = tekst === null || tekst === undefined ? '' : String(tekst);
  switch (type) {
    case s: return t;
    case n: return t === '' ? null : Number(t);
    case b: return t === 'true';
    case j: return t === '' ? null : JSON.parse(t);
    default: throw new Error('onbekend type');
  }
}

export function maakStore(adapter, { random, nu }) {
  let cache = new Map();

  function tabel(tab) {
    if (!TABS[tab]) throw new Error(`onbekende tab ${tab}`);
    let t = cache.get(tab);
    if (t) return t;
    const waarden = adapter.leesWaarden(tab); // NFR-15: hooguit één keer per tab per verzoek
    const schema = TABS[tab].kolommen;
    let kop = waarden.length ? waarden[0].map(String) : null;
    if (kop) for (const k of Object.keys(schema)) if (!kop.includes(k)) throw new Error(`kolom ${k} ontbreekt in ${tab}`);
    const rijen = waarden.slice(1).map((ruw) => ({ ruw: ruw.map((v) => (v === null || v === undefined ? '' : String(v))) }));
    t = { kop, rijen };
    cache.set(tab, t);
    return t;
  }

  function naarObject(tab, t, rij) {
    const schema = TABS[tab].kolommen;
    const obj = {};
    for (const [k, type] of Object.entries(schema)) obj[k] = uitCel(type, rij.ruw[t.kop.indexOf(k)]);
    return obj;
  }

  function naarRuw(tab, t, obj, basis) {
    const schema = TABS[tab].kolommen;
    for (const k of Object.keys(obj)) if (!schema[k]) throw new Error(`onbekende kolom ${k} in ${tab}`);
    const ruw = basis ? basis.slice() : t.kop.map(() => '');
    while (ruw.length < t.kop.length) ruw.push('');
    for (const [k, v] of Object.entries(obj)) ruw[t.kop.indexOf(k)] = naarCel(schema[k], v);
    return ruw;
  }

  function zorgVoorKop(tab, t) {
    if (t.kop) return;
    t.kop = Object.keys(TABS[tab].kolommen);
    adapter.schrijfRij(tab, 1, t.kop.slice());
  }

  function zoek(tab, t, waarde) {
    const sleutel = sleutelVan(tab);
    if (sleutel === null) return t.rijen.length ? 0 : -1;
    const kol = t.kop ? t.kop.indexOf(sleutel) : -1;
    return kol < 0 ? -1 : t.rijen.findIndex((r) => r.ruw[kol] === waarde);
  }

  const heeft = (tab, kol) => Object.prototype.hasOwnProperty.call(TABS[tab].kolommen, kol);

  return {
    nieuwVerzoek() { cache = new Map(); },

    lees(tab) {
      const t = tabel(tab);
      return t.kop ? t.rijen.map((r) => naarObject(tab, t, r)) : [];
    },

    vind(tab, waarde) {
      const t = tabel(tab);
      const i = zoek(tab, t, waarde);
      return i < 0 ? null : naarObject(tab, t, t.rijen[i]);
    },

    voegToe(tab, velden) {
      const t = tabel(tab);
      zorgVoorKop(tab, t);
      const obj = { ...velden };
      if (sleutelVan(tab) === 'id' && !obj.id) obj.id = maakId(random);
      if (heeft(tab, 'versie')) obj.versie = 1;
      if (heeft(tab, 'bijgewerkt')) obj.bijgewerkt = nu().toISOString();
      const rij = { ruw: naarRuw(tab, t, obj) };
      t.rijen.push(rij);
      adapter.schrijfRij(tab, t.rijen.length + 1, rij.ruw.slice());
      return naarObject(tab, t, rij);
    },

    // §7.16.2: een rij met versie wordt alleen gewijzigd als de meegestuurde versie gelijk is.
    werkBij(tab, waarde, velden, versie) {
      const t = tabel(tab);
      const i = zoek(tab, t, waarde);
      if (i < 0) throw new ApiFout('gewijzigd');
      const rij = t.rijen[i];
      const obj = { ...velden };
      if (heeft(tab, 'versie')) {
        const huidig = uitCel(n, rij.ruw[t.kop.indexOf('versie')]);
        if (versie !== huidig) throw new ApiFout('gewijzigd');
        obj.versie = huidig + 1;
      }
      if (heeft(tab, 'bijgewerkt')) obj.bijgewerkt = nu().toISOString();
      rij.ruw = naarRuw(tab, t, obj, rij.ruw);
      adapter.schrijfRij(tab, i + 2, rij.ruw.slice());
      return naarObject(tab, t, rij);
    },

    verwijder(tab, waarde, versie) {
      const t = tabel(tab);
      const i = zoek(tab, t, waarde);
      if (i < 0) throw new ApiFout('gewijzigd');
      if (heeft(tab, 'versie') && versie !== uitCel(n, t.rijen[i].ruw[t.kop.indexOf('versie')])) throw new ApiFout('gewijzigd');
      t.rijen.splice(i, 1);
      adapter.verwijderRij(tab, i + 2);
    },

    leeg(tab) {
      const t = tabel(tab);
      if (t.rijen.length) adapter.verwijderRijen(tab, 2, t.rijen.length);
      t.rijen = [];
    },

    flush() { adapter.flush(); },
  };
}
