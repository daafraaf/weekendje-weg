// Wie neemt wat mee: items en claims (spec §5.1, §7.7, §7.16.3, MEE-1 t/m MEE-4).
// Wie wat mag staat in rechten.js; hier staat de rijcontext die daarvoor nodig is en de gevolgen voor de rijen.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { CATEGORIEEN, STANDAARD_CATEGORIE, stelCategorieVoor } from '../../shared/categorieen.js';
import { lijstenVan } from '../../shared/lijsten.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { deelnemersVan, mijnRij, naamFunctie } from './posten.js';

export const SOORTEN = ['spullen', 'keuken', 'boodschap'];
// AAN-66: grenzen van een item.
export const ITEM_GRENZEN = { naamMax: 60, aantalMax: 200 };

const itemsVan = (store, editieId) => store.lees('Items').filter((i) => i.editieId === editieId);

function bestaandItem(store, editieId, id) {
  const i = store.vind('Items', id);
  if (!i || i.editieId !== editieId) throw new ApiFout('gewijzigd');
  return i;
}

// §7.7.2: de startlijst keuken en spullen van de editie als items; zonder `toegevoegdDoor`, dus aan te passen door de organisator.
export function startItems(lijsten) {
  const l = lijstenVan({ lijsten });
  return [
    ...l.spullen.map((x) => ({ soort: 'spullen', naam: x.label, categorie: STANDAARD_CATEGORIE })),
    ...l.keuken.map((x) => ({ soort: 'keuken', naam: x.label, categorie: stelCategorieVoor(x.label) })),
  ];
}

export function maakStartItems(store, editieId, lijsten) {
  for (const i of startItems(lijsten)) store.voegToe('Items', { editieId, ...i, maaltijdId: '', toegevoegdDoor: '', afgevinkt: false });
}

// AAN-26: een bestaand item wijzigen of verwijderen volgt "eigen item"; de rechtenregel beslist met deze context.
function itemContext({ store, sessie, editieId, data }) {
  const id = data.id || data.itemId;
  if (!id) return { nieuw: true };
  const i = store.vind('Items', id);
  const ik = mijnRij(store, sessie, editieId);
  return { eigen: !i || i.editieId !== editieId || (Boolean(ik) && i.toegevoegdDoor === ik) };
}

// MEE-4, AAN-66: naam, soort en categorie; zonder categorie volgt het voorstel uit de woordenlijst.
export const itemOpslaan = {
  schema: v.object({
    id: v.optioneel(v.id()),
    versie: v.optioneel(v.getal({ min: 1 })),
    soort: v.keuze(SOORTEN),
    naam: v.tekst({ min: 1, max: ITEM_GRENZEN.naamMax }),
    categorie: v.optioneel(v.keuze(CATEGORIEEN)),
  }),
  context: itemContext,
  uitvoeren({ store, sessie, editieId, data }) {
    const naam = data.naam.trim().replace(/\s+/g, ' ');
    if (!naam) throw new ApiFout('ongeldig', 'Geef het item een naam.');
    const categorie = data.categorie || stelCategorieVoor(naam);
    let rij;
    if (!data.id) {
      if (itemsVan(store, editieId).length >= ITEM_GRENZEN.aantalMax) throw new ApiFout('ongeldig', `Er passen hooguit ${ITEM_GRENZEN.aantalMax} items in een editie.`);
      rij = store.voegToe('Items', { editieId, soort: data.soort, naam, categorie, maaltijdId: '', toegevoegdDoor: mijnRij(store, sessie, editieId) || '', afgevinkt: false });
    } else {
      if (data.versie === undefined) throw new ApiFout('ongeldig', 'Veld data.versie: ontbreekt.');
      bestaandItem(store, editieId, data.id);
      rij = store.werkBij('Items', data.id, { soort: data.soort, naam, categorie }, data.versie);
    }
    return { id: rij.id, versie: rij.versie, categorie: rij.categorie };
  },
};

// AAN-26: eigen item tot definitief, de organisator elk item. De claims op het item gaan mee.
export const itemVerwijderen = {
  schema: v.object({ id: v.id(), versie: v.getal({ min: 1 }) }),
  context: itemContext,
  uitvoeren({ store, editieId, data }) {
    const i = bestaandItem(store, editieId, data.id);
    store.verwijder('Items', i.id, data.versie);
    for (const c of store.lees('Claims').filter((x) => x.itemId === i.id)) store.verwijder('Claims', c.id);
    return {};
  },
};

// MEE-2, spec §7.7.3 en §7.8.5: een tweede claim van dezelfde persoon wordt genegeerd; na definitief
// geen claims meer op boodschap- en keuken-items. Claims zijn eigen rijen zonder versie (§7.16.3).
export const claimen = {
  schema: v.object({ itemId: v.id() }),
  uitvoeren({ store, sessie, editie, editieId, deps, data }) {
    const ik = mijnRij(store, sessie, editieId);
    if (!ik) throw new ApiFout('geen_toegang');
    const i = bestaandItem(store, editieId, data.itemId);
    const d = store.vind('Deelnemers', ik);
    // AAN-11: een afgehaakte deelnemer heeft geen claims; hij kan er ook geen nieuwe maken.
    if (d.afgehaakt) throw new ApiFout('gesloten', 'Je bent afgehaakt en kunt niets meer meenemen.');
    if (editie.boodschappenDefinitief && i.soort !== 'spullen') throw new ApiFout('gesloten', 'De boodschappen zijn definitief. Claimen kan niet meer.');
    const bestaat = store.lees('Claims').some((c) => c.itemId === i.id && c.deelnemerId === ik);
    if (!bestaat) store.voegToe('Claims', { itemId: i.id, deelnemerId: ik, gemaakt: deps.nu().toISOString() });
    return { itemId: i.id };
  },
};

// MEE-2, spec §7.7.4: iedereen trekt zijn eigen claim in, de organisator elke claim (met `deelnemerId`).
export const claimIntrekken = {
  schema: v.object({ itemId: v.id(), deelnemerId: v.optioneel(v.id()) }),
  context({ store, sessie, editieId, data }) {
    const ik = mijnRij(store, sessie, editieId);
    return { eigen: !data.deelnemerId || data.deelnemerId === ik };
  },
  uitvoeren({ store, sessie, editie, editieId, data }) {
    const doel = data.deelnemerId || mijnRij(store, sessie, editieId);
    const i = bestaandItem(store, editieId, data.itemId);
    if (editie.boodschappenDefinitief && i.soort !== 'spullen') throw new ApiFout('gesloten', 'De boodschappen zijn definitief. Intrekken kan niet meer.');
    const c = store.lees('Claims').find((x) => x.itemId === i.id && x.deelnemerId === doel);
    if (c) store.verwijder('Claims', c.id); // al ingetrokken is geen fout
    return { itemId: i.id };
  },
};

// AAN-11: bij afhaken vervallen alle claims van die persoon; de items staan weer open.
export function claimsVervallen(store, editieId, deelnemerId) {
  const mijn = new Set(itemsVan(store, editieId).map((i) => i.id));
  for (const c of store.lees('Claims').filter((x) => x.deelnemerId === deelnemerId && mijn.has(x.itemId))) store.verwijder('Claims', c.id);
}

// Scherm `meenemen`: alle items met de namen van wie ze meeneemt, op volgorde van claim (§7.7.3).
export function meenemenScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const organisator = sessie.rol === 'organisator';
  const alle = deelnemersVan(store, editie.id);
  const naam = naamFunctie(store, alle);
  const ik = mijnRij(store, sessie, editie.id);
  const claims = store.lees('Claims');
  const definitief = Boolean(editie.boodschappenDefinitief);
  return {
    edities,
    editie: editieStappen(editie),
    ik,
    organisator,
    alleenLezen: editie.stap === 'afgerond',
    definitief,
    categorieen: CATEGORIEEN,
    items: itemsVan(store, editie.id).map((i) => ({
      id: i.id, soort: i.soort, naam: i.naam, categorie: i.categorie, versie: i.versie,
      eigen: Boolean(ik) && i.toegevoegdDoor === ik,
      claims: claims.filter((c) => c.itemId === i.id).map((c) => ({
        naam: naam(c.deelnemerId), ik: c.deelnemerId === ik, ...(organisator ? { deelnemerId: c.deelnemerId } : {}),
      })),
    })),
  };
}

export const itemsHandlers = { itemOpslaan, itemVerwijderen, claimen, claimIntrekken };
