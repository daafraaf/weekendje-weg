// Schermen `voortgang` en `overzicht` (spec §5.3, §7.5, OVZ-1 t/m OVZ-7).
// §7.5.6: deelnemers krijgen nooit antwoorden van anderen met naam of deelnemer-ID. Alles wat een
// deelnemer ziet, is een telling; het detail per persoon zit alleen in het antwoord voor een beheersessie.
import { ApiFout } from '../fouten.js';
import { vrijdagen } from '../../shared/datums.js';
import { tellWeekenden, topWeekenden } from '../../shared/rangorde.js';
import { lijstenVan, blokkenVan, WENSBLOKKEN } from '../../shared/lijsten.js';
import { vragenVan } from './vragen.js';
import { editieStappen } from './stappen.js';

const isOrganisator = (sessie) => sessie.rol === 'organisator';

// Edities waarvan het lid van de beheersessie organisator is, oudste eerst.
function eigenEdities(store, sessie) {
  const ids = new Set(store.lees('Deelnemers').filter((d) => d.lidId === sessie.lidId && d.rol === 'organisator').map((d) => d.editieId));
  return store.lees('Edities').filter((e) => ids.has(e.id)).sort((a, b) => a.jaar - b.jaar);
}

// Een beheersessie zonder gekozen editie krijgt de nieuwste eigen editie; een deelnemer altijd zijn eigen editie.
export function kiesEditie({ store, sessie, editie }) {
  if (!isOrganisator(sessie)) {
    if (!editie) throw new ApiFout('geen_toegang');
    return { editie, edities: undefined };
  }
  const edities = eigenEdities(store, sessie);
  const gekozen = editie || edities[edities.length - 1] || null;
  return { editie: gekozen, edities: edities.map((e) => ({ id: e.id, titel: e.titel, jaar: e.jaar })) };
}

const deelnemersVan = (store, editieId) => store.lees('Deelnemers').filter((d) => d.editieId === editieId);
const voornaam = (leden, lidId) => (leden.get(lidId) || {}).voornaam || '';
const opNaam = (a, b) => a.voornaam.localeCompare(b.voornaam, 'nl');

// OVZ-1: per deelnemer voornaam en ingevuld ja of nee, plus de deadline. Geen ID's en geen antwoorden.
export function voortgangScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null, deelnemers: [], organisator: true };
  const leden = new Map(store.lees('Leden').map((l) => [l.id, l]));
  const deelnemers = deelnemersVan(store, editie.id).map((d) => ({
    voornaam: voornaam(leden, d.lidId), ingevuld: Boolean(d.ingevuld), ingevuldOp: d.ingevuld ? d.ingevuldOp || '' : '', afgehaakt: Boolean(d.afgehaakt),
  })).sort(opNaam);
  return { edities, editie: editieStappen(editie), deelnemers, organisator: isOrganisator(sessie) };
}

function bandbreedte(waarden) {
  const lijst = waarden.filter((w) => Number.isFinite(w));
  return lijst.length ? { min: Math.min(...lijst), max: Math.max(...lijst), aantal: lijst.length } : null;
}

// AAN-56: per eigen vraag van het type ja/nee, keuze, meerkeuze of schaal het aantal per optie; tekstvragen alleen voor de organisator.
const TELBARE_VRAGEN = new Set(['janee', 'keuze', 'meerkeuze', 'schaal']);
function optiesVan(vraag) {
  if (vraag.type === 'janee') return [{ sleutel: 'ja', label: 'Ja' }, { sleutel: 'nee', label: 'Nee' }];
  if (vraag.type === 'schaal') return ['1', '2', '3', '4', '5'].map((s) => ({ sleutel: s, label: s }));
  return vraag.opties || [];
}
function telVragen(vragen, datas) {
  return vragen.filter((q) => TELBARE_VRAGEN.has(q.type)).map((q) => {
    const tellingen = new Map(optiesVan(q).map((o) => [o.sleutel, 0]));
    for (const d of datas) {
      const w = (d.eigenVragen || {})[q.id];
      if (typeof w !== 'string' || !w) continue;
      for (const s of q.type === 'meerkeuze' ? w.split(',') : [w]) if (tellingen.has(s)) tellingen.set(s, tellingen.get(s) + 1);
    }
    return { tekst: q.tekst, type: q.type, opties: optiesVan(q).map((o) => ({ label: o.label, aantal: tellingen.get(o.sleutel) })) };
  });
}

// §7.5.3: per vinkje in activiteiten, programma en eten en drinken het aantal; een sleutel die niet meer in de lijst staat telt niet mee.
function telWensen(editie, datas) {
  const lijsten = lijstenVan(editie);
  const blokken = blokkenVan(editie);
  return WENSBLOKKEN.filter((b) => blokken[b.blok]).map((b) => ({
    blok: b.blok, kop: b.kop,
    items: lijsten[b.blok].map((o) => ({ label: o.label, aantal: datas.filter((d) => Array.isArray(d[b.blok]) && d[b.blok].includes(o.sleutel)).length })),
  }));
}

// §7.5.4: alles per persoon, inclusief vrije tekst, allergieën, woonplaatsen en samenwerken. Alleen voor de beheersessie.
function detail(store, editie, deelnemers, antwoordVan, leden) {
  const vragen = vragenVan(store, editie.id);
  const bestaand = new Set(vragen.map((q) => q.id));
  const personen = deelnemers.map((d) => {
    const lid = leden.get(d.lidId) || {};
    const data = { ...(antwoordVan.get(d.id) || {}) };
    data.eigenVragen = Object.fromEntries(Object.entries(data.eigenVragen || {}).filter(([id]) => bestaand.has(id)));
    return {
      voornaam: lid.voornaam || '', woonplaats: data.woonplaats || lid.woonplaats || '', rol: d.rol,
      ingevuld: Boolean(d.ingevuld), ingevuldOp: d.ingevuld ? d.ingevuldOp || '' : '', afgehaakt: Boolean(d.afgehaakt), data,
    };
  }).sort(opNaam);
  return { personen, vragen: vragen.map((q) => ({ id: q.id, tekst: q.tekst, type: q.type, opties: q.opties || [] })), lijsten: lijstenVan(editie), blokken: blokkenVan(editie) };
}

// OVZ-3 t/m OVZ-6. De rechten (§6) laten een deelnemer pas vanaf de stap Overzicht toe.
export function overzichtScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const leden = new Map(store.lees('Leden').map((l) => [l.id, l]));
  const alle = deelnemersVan(store, editie.id);
  const actief = alle.filter((d) => !d.afgehaakt); // §7.5.1: afgehaakte deelnemers tellen niet mee
  const antwoordVan = new Map(store.lees('Antwoorden').filter((a) => a.editieId === editie.id).map((a) => [a.deelnemerId, a.data || {}]));
  const datas = actief.map((d) => antwoordVan.get(d.id) || {});
  const voorkeursmaanden = editie.voorkeursmaanden || [];
  const weekenden = tellWeekenden(editie.periodeVan && editie.periodeTot ? vrijdagen(editie.periodeVan, editie.periodeTot) : [], datas.map((d) => d.beschikbaarheid || {}), voorkeursmaanden);
  const uit = {
    edities,
    editie: { ...editieStappen(editie), periodeVan: editie.periodeVan, periodeTot: editie.periodeTot, voorkeursmaanden },
    aantal: actief.length,
    ingevuld: actief.filter((d) => d.ingevuld).length,
    weekenden,
    top: topWeekenden(weekenden),
    budgetVerblijf: bandbreedte(datas.map((d) => d.budgetVerblijf)),
    budgetWeekend: bandbreedte(datas.map((d) => d.budgetWeekend)),
    reistijd: bandbreedte(datas.map((d) => d.maxReistijdUur)),
    wensen: telWensen(editie, datas),
    vragen: telVragen(vragenVan(store, editie.id), datas),
  };
  // AAN-07: de groep ziet aantallen zonder namen en de bandbreedte; vrije tekst en allergieën met namen alleen de organisator.
  if (isOrganisator(sessie)) uit.detail = detail(store, editie, alle, antwoordVan, leden);
  return uit;
}
