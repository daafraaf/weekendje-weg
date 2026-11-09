// Carpool: ritten en meerijders (spec §5.1, §7.11.3, §7.11.4, CAR-1, CAR-2).
// Wie wat mag staat in rechten.js: een deelnemer beheert zijn eigen rit en zijn eigen plek, de organisator iedereen (CAR-2).
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { RIT_GRENZEN as G } from '../../shared/kamers.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { deelnemersVan, mijnRij, naamFunctie } from './posten.js';

const rittenVan = (store, editieId) => store.lees('Ritten').filter((r) => r.editieId === editieId);
const meerijdersVan = (store, ritId) => store.lees('Meerijders').filter((m) => m.ritId === ritId);

function bestaandeRit(store, editieId, id) {
  const r = store.vind('Ritten', id);
  if (!r || r.editieId !== editieId) throw new ApiFout('gewijzigd');
  return r;
}

function actieveDeelnemer(store, editieId, id) {
  const d = id && store.vind('Deelnemers', id);
  if (!d || d.editieId !== editieId) throw new ApiFout('ongeldig', 'Deze deelnemer hoort niet bij de editie.');
  if (d.afgehaakt) throw new ApiFout('ongeldig', 'Een afgehaakte deelnemer doet niet meer mee aan de carpool.');
  return d;
}

// §7.11.4: een afgehaakte deelnemer verdwijnt uit de ritten. Zijn eigen rit gaat mee weg, met de plekken van zijn meerijders.
export function verwijderUitRitten(store, deelnemerId) {
  for (const m of store.lees('Meerijders').filter((x) => x.deelnemerId === deelnemerId)) store.verwijder('Meerijders', m.id);
  for (const r of store.lees('Ritten').filter((x) => x.bestuurderId === deelnemerId)) verwijderRit(store, r);
}

function verwijderRit(store, rit) {
  for (const m of meerijdersVan(store, rit.id)) store.verwijder('Meerijders', m.id);
  store.verwijder('Ritten', rit.id);
}

// Eigen rit: een bestaande rit van de sessie, of een nieuwe zonder (ander) bestuurder. De rechtenregel beslist hiermee (AAN-24).
function ritContext({ store, sessie, editieId, data }) {
  const ik = mijnRij(store, sessie, editieId);
  if (data.id) {
    const r = store.vind('Ritten', data.id);
    return { eigen: !r || r.editieId !== editieId || (Boolean(ik) && r.bestuurderId === ik) }; // een rit die niet bestaat geeft `gewijzigd`
  }
  return { eigen: !data.bestuurderId || data.bestuurderId === ik };
}

// CAR-1, AAN-24, AAN-70: vertrekplaats en vrije plaatsen. Een bestuurder heeft één rit; opnieuw aanbieden past die aan.
// Minder vrije plaatsen dan er meerijders zijn kan niet. `verwijderen` haalt de rit met zijn meerijders weg.
export const ritOpslaan = {
  schema: v.object({
    id: v.optioneel(v.id()),
    bestuurderId: v.optioneel(v.id()),
    vertrekplaats: v.optioneel(v.tekst({ max: G.plaatsMax })),
    vrijePlaatsen: v.optioneel(v.getal({ min: 1, max: G.vrijeMax })),
    verwijderen: v.optioneel(v.bool()),
  }),
  context: ritContext,
  uitvoeren({ store, sessie, editieId, data }) {
    if (data.verwijderen) {
      if (!data.id) throw new ApiFout('ongeldig', 'Kies de rit die weg moet.');
      verwijderRit(store, bestaandeRit(store, editieId, data.id));
      return {};
    }
    const plaats = (data.vertrekplaats || '').trim().replace(/\s+/g, ' ');
    if (!plaats) throw new ApiFout('ongeldig', 'Geef een vertrekplaats op.');
    if (!data.vrijePlaatsen) throw new ApiFout('ongeldig', 'Geef het aantal vrije plaatsen op.');
    let rit = data.id ? bestaandeRit(store, editieId, data.id) : null;
    if (!rit) {
      const bestuurder = actieveDeelnemer(store, editieId, data.bestuurderId || mijnRij(store, sessie, editieId));
      // Wie zelf rijdt, rijdt niet mee; een tweede aanbod van dezelfde bestuurder past de eerste rit aan.
      rit = rittenVan(store, editieId).find((r) => r.bestuurderId === bestuurder.id) || null;
      if (!rit) {
        for (const m of store.lees('Meerijders').filter((x) => x.deelnemerId === bestuurder.id)) store.verwijder('Meerijders', m.id);
        return { id: store.voegToe('Ritten', { editieId, bestuurderId: bestuurder.id, vertrekplaats: plaats, vrijePlaatsen: data.vrijePlaatsen }).id };
      }
    }
    if (meerijdersVan(store, rit.id).length > data.vrijePlaatsen) throw new ApiFout('ongeldig', 'Er rijden al meer mensen mee.');
    store.werkBij('Ritten', rit.id, { vertrekplaats: plaats, vrijePlaatsen: data.vrijePlaatsen });
    return { id: rit.id };
  },
};

const meerijdContext = ({ store, sessie, editieId, data }) => ({ eigen: !data.deelnemerId || data.deelnemerId === mijnRij(store, sessie, editieId) });

// CAR-1, CAR-2, AAN-24: meerijden in een rit; zonder deelnemerId ben je het zelf. Je zit in hooguit één rit,
// een volle rit weigert een extra persoon en een bestuurder rijdt niet bij een ander mee.
export const meerijden = {
  schema: v.object({ ritId: v.id(), deelnemerId: v.optioneel(v.id()) }),
  context: meerijdContext,
  uitvoeren({ store, sessie, editieId, data }) {
    const d = actieveDeelnemer(store, editieId, data.deelnemerId || mijnRij(store, sessie, editieId));
    const rit = bestaandeRit(store, editieId, data.ritId);
    if (rittenVan(store, editieId).some((r) => r.bestuurderId === d.id)) throw new ApiFout('ongeldig', 'Wie zelf een rit aanbiedt, rijdt niet bij een ander mee.');
    const eigen = store.lees('Meerijders').find((m) => m.deelnemerId === d.id);
    if (eigen && eigen.ritId === rit.id) return { ritId: rit.id };
    if (meerijdersVan(store, rit.id).length >= rit.vrijePlaatsen) throw new ApiFout('ongeldig', 'Deze rit is vol.');
    if (eigen) store.werkBij('Meerijders', eigen.id, { ritId: rit.id });
    else store.voegToe('Meerijders', { ritId: rit.id, deelnemerId: d.id });
    return { ritId: rit.id };
  },
};

export const meerijdenStoppen = {
  schema: v.object({ deelnemerId: v.optioneel(v.id()) }),
  context: meerijdContext,
  uitvoeren({ store, sessie, editieId, data }) {
    const doel = data.deelnemerId || mijnRij(store, sessie, editieId);
    const d = doel && store.vind('Deelnemers', doel);
    if (!d || d.editieId !== editieId) throw new ApiFout('ongeldig', 'Deze deelnemer hoort niet bij de editie.');
    const m = store.lees('Meerijders').find((x) => x.deelnemerId === d.id);
    if (m) store.verwijder('Meerijders', m.id); // al uitgestapt is geen fout
    return { deelnemerId: d.id };
  },
};

// Scherm `carpool`: ritten met bestuurder, meerijders en vrije plekken, en wie nog geen rit heeft, elk met woonplaats.
// De woonplaats is die uit het invulformulier, anders die van het lid (zoals bij Per persoon). Alleen de organisator krijgt ID's.
export function carpoolScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const organisator = sessie.rol === 'organisator';
  const actief = deelnemersVan(store, editie.id).filter((d) => !d.afgehaakt);
  const ids = new Set(actief.map((d) => d.id));
  const naam = naamFunctie(store, actief);
  const leden = new Map(store.lees('Leden').map((l) => [l.id, l]));
  const antwoord = new Map(store.lees('Antwoorden').filter((a) => a.editieId === editie.id).map((a) => [a.deelnemerId, a.data || {}]));
  const plaats = new Map(actief.map((d) => [d.id, (antwoord.get(d.id) || {}).woonplaats || (leden.get(d.lidId) || {}).woonplaats || '']));
  const ik = mijnRij(store, sessie, editie.id);
  const persoon = (id) => ({ ...(organisator ? { deelnemerId: id } : {}), naam: naam(id), woonplaats: plaats.get(id) || '', ik: id === ik });
  const opNaam = (a, b) => a.naam.localeCompare(b.naam, 'nl');
  const ritten = rittenVan(store, editie.id).filter((r) => ids.has(r.bestuurderId));
  const heeftRit = new Set(ritten.map((r) => r.bestuurderId));
  const rijdtMee = new Set();
  const lijst = ritten.map((r) => {
    const meer = meerijdersVan(store, r.id).filter((m) => ids.has(m.deelnemerId));
    meer.forEach((m) => rijdtMee.add(m.deelnemerId));
    return {
      id: r.id, vertrekplaats: r.vertrekplaats, vrijePlaatsen: r.vrijePlaatsen, vrij: Math.max(0, r.vrijePlaatsen - meer.length),
      bestuurder: persoon(r.bestuurderId), meerijders: meer.map((m) => persoon(m.deelnemerId)).sort(opNaam),
    };
  }).sort((a, b) => a.bestuurder.naam.localeCompare(b.bestuurder.naam, 'nl'));
  return {
    edities,
    editie: editieStappen(editie),
    organisator,
    ikDeelnemer: Boolean(ik),
    alleenLezen: editie.stap === 'afgerond',
    ikBestuurder: Boolean(ik) && heeftRit.has(ik),
    ikMeerijder: Boolean(ik) && rijdtMee.has(ik),
    standaardPlaats: ik ? plaats.get(ik) || '' : '',
    ritten: lijst,
    zonderRit: actief.filter((d) => !heeftRit.has(d.id) && !rijdtMee.has(d.id)).map((d) => persoon(d.id)).sort(opNaam),
  };
}

export const rittenHandlers = { ritOpslaan, meerijden, meerijdenStoppen };
