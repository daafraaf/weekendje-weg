// Kookbeurten: maaltijden, koks en wat een kok van de groep te zien krijgt (spec §5.1, §7.10, KOK-1 t/m KOK-4).
// Wie wat mag staat in rechten.js: maaltijden beheert de organisator, kok worden of stoppen kan iedereen.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { blokkenVan } from '../../shared/lijsten.js';
import { DAGEN, SOORTEN, STANDAARD_MAALTIJDEN, MAALTIJD_GRENZEN, opMaaltijd, maaltijdNaam, dagDatum } from '../../shared/maaltijden.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { deelnemersVan, mijnRij, naamFunctie } from './posten.js';
import { etenDrinkenTelling } from './items.js';

export const maaltijdenVan = (store, editieId) => store.lees('Maaltijden').filter((m) => m.editieId === editieId);

function bestaandeMaaltijd(store, editieId, id) {
  const m = store.vind('Maaltijden', id);
  if (!m || m.editieId !== editieId) throw new ApiFout('gewijzigd');
  return m;
}

// KOK-1, AAN-18: bij het vastleggen van het weekend verschijnen de standaardmaaltijden, maar alleen als er nog geen zijn.
export function maakStandaardMaaltijden(store, editieId) {
  if (maaltijdenVan(store, editieId).length) return 0;
  for (const [dag, soort] of STANDAARD_MAALTIJDEN) store.voegToe('Maaltijden', { editieId, dag, soort, omschrijving: '' });
  return STANDAARD_MAALTIJDEN.length;
}

// KOK-1, AAN-68: de organisator past een maaltijd aan of voegt er een toe; verwijderen kan niet (de spec kent die actie niet).
export const maaltijdOpslaan = {
  schema: v.object({
    id: v.optioneel(v.id()),
    dag: v.keuze(DAGEN),
    soort: v.keuze(SOORTEN),
    omschrijving: v.tekst({ max: MAALTIJD_GRENZEN.omschrijvingMax }),
  }),
  uitvoeren({ store, editieId, data }) {
    const velden = { dag: data.dag, soort: data.soort, omschrijving: data.omschrijving.trim().replace(/\s+/g, ' ') };
    let rij;
    if (!data.id) {
      if (maaltijdenVan(store, editieId).length >= MAALTIJD_GRENZEN.aantalMax) throw new ApiFout('ongeldig', `Er passen hooguit ${MAALTIJD_GRENZEN.aantalMax} maaltijden in een editie.`);
      rij = store.voegToe('Maaltijden', { editieId, ...velden });
    } else {
      bestaandeMaaltijd(store, editieId, data.id);
      rij = store.werkBij('Maaltijden', data.id, velden);
    }
    return { id: rij.id };
  },
};

// KOK-2, §7.10.2: meerdere koks per maaltijd kan; twee keer aanmelden geeft één rij. Een afgehaakte deelnemer kookt niet (AAN-68).
export const kokWorden = {
  schema: v.object({ maaltijdId: v.id() }),
  uitvoeren({ store, sessie, editieId, data }) {
    const ik = mijnRij(store, sessie, editieId);
    if (!ik) throw new ApiFout('geen_toegang');
    const m = bestaandeMaaltijd(store, editieId, data.maaltijdId);
    if (store.vind('Deelnemers', ik).afgehaakt) throw new ApiFout('gesloten', 'Je bent afgehaakt en kunt niet meer koken.');
    if (!store.lees('Koks').some((k) => k.maaltijdId === m.id && k.deelnemerId === ik)) store.voegToe('Koks', { maaltijdId: m.id, deelnemerId: ik });
    return { maaltijdId: m.id };
  },
};

export const kokStoppen = {
  schema: v.object({ maaltijdId: v.id() }),
  uitvoeren({ store, sessie, editieId, data }) {
    const ik = mijnRij(store, sessie, editieId);
    if (!ik) throw new ApiFout('geen_toegang');
    const m = bestaandeMaaltijd(store, editieId, data.maaltijdId);
    const k = store.lees('Koks').find((x) => x.maaltijdId === m.id && x.deelnemerId === ik);
    if (k) store.verwijder('Koks', k.id); // al gestopt is geen fout
    return { maaltijdId: m.id };
  },
};

// Willekeurige volgorde (§7.10.4); de volgorde mag niets verraden over wie wat schreef.
function schud(lijst, random) {
  const l = [...lijst];
  for (let i = l.length - 1; i > 0; i -= 1) {
    const [a, b] = random.bytes(2);
    const j = ((a << 8) | b) % (i + 1);
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

// KOK-4, AAN-34, §7.10.4: aantallen per eetwens en de teksten uit het vrije veld, zonder namen of ID's.
function eetwensen(h, editie, deelnemers) {
  const actief = new Set(deelnemers.filter((d) => !d.afgehaakt).map((d) => d.id));
  const teksten = h.store.lees('Antwoorden')
    .filter((a) => a.editieId === editie.id && actief.has(a.deelnemerId))
    .map((a) => String((a.data || {}).etenDrinkenEigen || '').trim())
    .filter(Boolean);
  return {
    aantallen: etenDrinkenTelling(h.store, editie, deelnemers).filter((w) => w.aantal > 0),
    teksten: schud(teksten, h.deps.random),
  };
}

// Scherm `kookbeurten`: maaltijden met koks (alleen voornamen) en ingrediënten. De eetwensen krijgen alleen de koks van die maaltijd.
export function kookbeurtenScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const organisator = sessie.rol === 'organisator';
  const alle = deelnemersVan(store, editie.id);
  const naam = naamFunctie(store, alle);
  const afgehaakt = new Set(alle.filter((d) => d.afgehaakt).map((d) => d.id));
  const ik = mijnRij(store, sessie, editie.id);
  const koks = store.lees('Koks');
  const items = store.lees('Items').filter((i) => i.editieId === editie.id && i.maaltijdId);
  const wensen = blokkenVan(editie).etenDrinken ? eetwensen(h, editie, alle) : { aantallen: [], teksten: [] };
  const weekend = editie.vastgelegdWeekend || '';
  return {
    edities,
    editie: editieStappen(editie),
    ikDeelnemer: Boolean(ik),
    organisator,
    alleenLezen: editie.stap === 'afgerond',
    definitief: Boolean(editie.boodschappenDefinitief),
    vastgelegdWeekend: weekend,
    maaltijden: maaltijdenVan(store, editie.id).sort(opMaaltijd).map((m) => {
      const van = koks.filter((k) => k.maaltijdId === m.id && !afgehaakt.has(k.deelnemerId));
      const kok = Boolean(ik) && van.some((k) => k.deelnemerId === ik);
      return {
        id: m.id, dag: m.dag, soort: m.soort, omschrijving: m.omschrijving, naam: maaltijdNaam(m),
        datum: weekend ? dagDatum(weekend, m.dag) : '',
        koks: van.map((k) => ({ naam: naam(k.deelnemerId), ik: k.deelnemerId === ik })),
        kok,
        ingredienten: items.filter((i) => i.maaltijdId === m.id).map((i) => ({ id: i.id, naam: i.naam, versie: i.versie, afgevinkt: Boolean(i.afgevinkt) })),
        ...(kok ? { wensen } : {}),
      };
    }),
  };
}

export const maaltijdenHandlers = { maaltijdOpslaan, kokWorden, kokStoppen };
