// Antwoorden van een deelnemer opslaan en het formulier lezen (spec §5.2, §7.4, FRM-1 t/m FRM-4, FRM-8 t/m FRM-10).
import { ApiFout } from '../fouten.js';
import { v, valideer } from '../validatie.js';
import { vrijdagen } from '../../shared/datums.js';
import { vragenVan, schoonEigenVragen } from './vragen.js';
import { lijstenVan, blokkenVan } from '../../shared/lijsten.js';
import { TAG_MAX, TAGS_MAX, tagsFout } from '../../shared/tags.js';
import { BUDGET_VERBLIJF, BUDGET_WEEKEND, REISTIJD, WOONPLAATS, VRIJ_VELD_MAX, VERBLIJF_WENSEN, indexVanBovengrens, ontbreekt } from '../../shared/antwoorden.js';

const vrij = () => v.tekst({ min: 0, max: VRIJ_VELD_MAX });
const tags = () => v.lijst(v.tekst({ min: 1, max: TAG_MAX }), { max: TAGS_MAX }); // TAG-5, TAG-7
const lijstVan = () => v.lijst(v.tekst({ min: 1, max: 60 }), { max: 60 });
const verblijfSchema = v.object(Object.fromEntries(VERBLIJF_WENSEN.map((w) => [w.sleutel, v.optioneel(v.keuze(w.opties.map(([k]) => k)))])));

// Alles is optioneel: Opslaan bewaart ook een half ingevuld formulier (§7.4.8).
const dataSchema = v.object({
  beschikbaarheid: v.optioneel(v.map(v.datum(), v.keuze(['ja', 'misschien', 'nee']), { max: 160 })),
  budgetVerblijf: v.optioneel(v.getal({ min: 1, max: 1000000 })),
  budgetWeekend: v.optioneel(v.getal({ min: 1, max: 1000000 })),
  woonplaats: v.optioneel(v.tekst({ min: 0, max: 100 })),
  maxReistijdUur: v.optioneel(v.getal({ min: REISTIJD.min, max: REISTIJD.max })),
  verblijf: v.optioneel(verblijfSchema),
  activiteiten: v.optioneel(lijstVan()), activiteitenEigen: v.optioneel(tags()),
  programma: v.optioneel(lijstVan()), programmaEigen: v.optioneel(tags()),
  etenDrinken: v.optioneel(lijstVan()), etenDrinkenEigen: v.optioneel(tags()),
  samenwerken: v.optioneel(v.keuze(['ja', 'misschien', 'nee'])),
  eigenVragen: v.optioneel(v.map(v.tekst({ min: 1, max: 64 }), vrij(), { max: 50 })),
});

const eigenRij = (store, editieId, deelnemerId) => store.lees('Antwoorden').find((a) => a.editieId === editieId && a.deelnemerId === deelnemerId);

function controleer(data, editie) {
  const fout = (t) => { throw new ApiFout('ongeldig', t); };
  if (data.budgetVerblijf != null && indexVanBovengrens(BUDGET_VERBLIJF, data.budgetVerblijf) === null) fout('Kies een budget voor het verblijf uit de schijven.');
  if (data.budgetWeekend != null && indexVanBovengrens(BUDGET_WEEKEND, data.budgetWeekend) === null) fout('Kies een budget voor het weekend uit de schijven.');
  if (data.woonplaats !== undefined) {
    const lengte = data.woonplaats.trim().length;
    if (lengte < WOONPLAATS.min || lengte > WOONPLAATS.max) fout(`Een woonplaats heeft ${WOONPLAATS.min} tot ${WOONPLAATS.max} tekens.`);
  }
  for (const k of ['activiteitenEigen', 'programmaEigen', 'etenDrinkenEigen']) {
    const f = data[k] === undefined ? null : tagsFout(data[k]);
    if (f) fout(f);
  }
  if (data.beschikbaarheid && editie.periodeVan && editie.periodeTot) {
    const geldig = new Set(vrijdagen(editie.periodeVan, editie.periodeTot));
    if (Object.keys(data.beschikbaarheid).some((d) => !geldig.has(d))) fout('Een gekozen weekend ligt buiten de periode van de editie.');
  }
}

// versie 0 betekent: nog niets opgeslagen. Een andere versie dan die in de Sheet geeft `gewijzigd` (FRM-10, §7.16.2).
export const antwoordenOpslaan = {
  schema: v.object({ versie: v.getal({ min: 0 }), data: dataSchema }),
  uitvoeren({ store, sessie, editie, editieId, data, deps }) {
    if (!sessie.deelnemerId) throw new ApiFout('geen_toegang');
    controleer(data.data, editie);
    const nieuw = { ...data.data };
    if (nieuw.eigenVragen) nieuw.eigenVragen = schoonEigenVragen(store, editieId, nieuw.eigenVragen); // FRM-7
    if (nieuw.woonplaats !== undefined) nieuw.woonplaats = nieuw.woonplaats.trim();
    const bestaand = eigenRij(store, editieId, sessie.deelnemerId);
    let rij;
    if (!bestaand) {
      if (data.versie !== 0) throw new ApiFout('gewijzigd');
      rij = store.voegToe('Antwoorden', { editieId, deelnemerId: sessie.deelnemerId, data: nieuw });
    } else {
      rij = store.werkBij('Antwoorden', bestaand.id, { data: nieuw }, data.versie);
    }
    return { versie: rij.versie, bijgewerkt: rij.bijgewerkt, ...zetIngevuld(store, sessie, deps, nieuw) };
  },
};

// FRM-8: de status ingevuld volgt uit de opgeslagen antwoorden.
function zetIngevuld(store, sessie, deps, data) {
  const mist = ontbreekt(data);
  const deelnemer = store.vind('Deelnemers', sessie.deelnemerId);
  const ingevuld = mist.length === 0;
  if (deelnemer.ingevuld !== ingevuld) store.werkBij('Deelnemers', deelnemer.id, { ingevuld, ingevuldOp: ingevuld ? deps.nu().toISOString() : '' });
  return { ingevuld, ontbreekt: mist };
}

export const ANTWOORD_VELDEN = Object.keys(dataSchema.velden);

// K4, SYNC-7: het formulier slaat elk veld apart op via de wachtrij. Eén veld van `Antwoorden.data` wordt gezet
// (of met `waarde: null` weggehaald); de andere velden blijven zoals ze in de Sheet staan. Zonder
// versiecheck, de laatste schrijfactie wint per veld.
// NFR-6: het schema van `waarde` hangt af van het veld; null haalt het veld weg.
function leesVeld(ruw) {
  if (!ruw || typeof ruw !== 'object' || Array.isArray(ruw)) throw new ApiFout('ongeldig', 'Veld data: object verwacht.');
  const veld = valideer(v.keuze(ANTWOORD_VELDEN), ruw.veld, 'data.veld');
  const waarde = ruw.waarde === null ? { soort: 'keuze', waarden: [null] } : { ...dataSchema.velden[veld], optioneel: false };
  return valideer(v.object({ veld: v.keuze([veld]), waarde }), ruw);
}

export const antwoordZetten = {
  uitvoeren({ store, sessie, editie, editieId, data: ruw, deps }) {
    if (!sessie.deelnemerId) throw new ApiFout('geen_toegang');
    const data = leesVeld(ruw);
    const bestaand = eigenRij(store, editieId, sessie.deelnemerId);
    const nieuw = { ...(bestaand ? bestaand.data || {} : {}) };
    if (data.waarde === null) {
      delete nieuw[data.veld];
    } else {
      let w = data.waarde;
      controleer({ [data.veld]: w }, editie);
      if (data.veld === 'eigenVragen') w = schoonEigenVragen(store, editieId, w); // FRM-7
      if (data.veld === 'woonplaats') w = w.trim();
      nieuw[data.veld] = w;
    }
    const rij = bestaand
      ? store.werkBij('Antwoorden', bestaand.id, { data: nieuw }, bestaand.versie)
      : store.voegToe('Antwoorden', { editieId, deelnemerId: sessie.deelnemerId, data: nieuw });
    return { veld: data.veld, versie: rij.versie, ...zetIngevuld(store, sessie, deps, nieuw) };
  },
};

// Scherm `formulier`: instellingen van de editie, lijsten, vragen en mijn antwoorden met versie (spec §5.3).
// `alleenLezen` is 'stap' (vanaf Overzicht, FRM-9), anders null.
export function formulierScherm({ store, sessie, editie, editieId, ctx }) {
  if (!sessie.deelnemerId || !editie) throw new ApiFout('geen_toegang');
  const rij = eigenRij(store, editieId, sessie.deelnemerId);
  const lid = store.vind('Leden', sessie.lidId);
  const data = rij ? rij.data || {} : {};
  return {
    editie: {
      id: editie.id, titel: editie.titel, stap: editie.stap, deadline: editie.deadline,
      periodeVan: editie.periodeVan, periodeTot: editie.periodeTot, voorkeursmaanden: editie.voorkeursmaanden || [],
      blokken: blokkenVan(editie), lijsten: lijstenVan(editie),
    },
    vragen: vragenVan(store, editieId),
    standaardWoonplaats: lid ? lid.woonplaats : '',
    alleenLezen: editie.stap !== 'invullen' ? 'stap' : null, // DDL-1: de deadline sluit niets af
    antwoorden: { data, versie: rij ? rij.versie : 0 },
    ontbreekt: ontbreekt(data),
  };
}

export const antwoordenHandlers = { antwoordenOpslaan, antwoordZetten };
