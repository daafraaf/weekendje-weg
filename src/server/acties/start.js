// Schermen `start` en `archief` (spec §5.3, §7.14, §7.15, STA-3 t/m STA-6, ARC-1).
// Het startscherm geeft per editie alleen tellingen en eigen gegevens; wat een deelnemer niet van een ander
// mag zien, staat er niet in (geen ID's, geen claims met naam).
import { stapIndex } from '../../shared/stappen.js';
import { totalen } from '../../shared/saldo.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { deelnemersVan, mijnRij } from './posten.js';
import { stand } from './afrekening.js';

const opNaam = (a, b) => a.localeCompare(b, 'nl');
const van = (store, tabel, editieId) => store.lees(tabel).filter((r) => r.editieId === editieId);

function geboektVan(store, editie) {
  const a = editie.geboektAccommodatieId && store.vind('Accommodaties', editie.geboektAccommodatieId);
  return a ? { naam: a.naam, plaats: a.plaats, link: a.link } : null;
}

// Wat de stap Voorbereiding laat zien: per onderdeel een telling en wat er van jou is.
function voorbereiding(store, editie, actief, ikId) {
  const items = van(store, 'Items', editie.id);
  const claims = store.lees('Claims');
  const spullen = items.filter((i) => i.soort === 'spullen');
  const maaltijden = van(store, 'Maaltijden', editie.id);
  const koks = store.lees('Koks');
  const kamers = van(store, 'Kamers', editie.id);
  const kamerIds = new Set(kamers.map((k) => k.id));
  const indeling = store.lees('Kamerindeling').filter((k) => kamerIds.has(k.kamerId));
  const ritten = van(store, 'Ritten', editie.id);
  const ritIds = new Set(ritten.map((r) => r.id));
  const meerijders = store.lees('Meerijders').filter((m) => ritIds.has(m.ritId));
  const metRit = new Set([...ritten.map((r) => r.bestuurderId), ...meerijders.map((m) => m.deelnemerId)]);
  const mijnKamer = indeling.find((k) => k.deelnemerId === ikId);
  const mijnRit = ritten.find((r) => r.bestuurderId === ikId);
  const meeMet = meerijders.find((m) => m.deelnemerId === ikId);
  const bestuurder = meeMet && ritten.find((r) => r.id === meeMet.ritId);
  return {
    boodschappen: { aantal: items.filter((i) => i.soort === 'boodschap').length, definitief: Boolean(editie.boodschappenDefinitief) },
    spullen: { totaal: spullen.length, geclaimd: spullen.filter((i) => claims.some((c) => c.itemId === i.id)).length },
    maaltijden: { totaal: maaltijden.length, metKok: maaltijden.filter((m) => koks.some((k) => k.maaltijdId === m.id)).length, mijn: maaltijden.filter((m) => koks.some((k) => k.maaltijdId === m.id && k.deelnemerId === ikId)).length },
    kamers: { aantal: kamers.length, ingedeeld: actief.filter((d) => indeling.some((k) => k.deelnemerId === d.id)).length, mijn: mijnKamer ? (kamers.find((k) => k.id === mijnKamer.kamerId) || {}).naam || '' : '' },
    carpool: {
      ritten: ritten.length, zonderRit: actief.filter((d) => !metRit.has(d.id)).length,
      mijn: mijnRit ? 'rijdt' : bestuurder ? 'meerijden' : '',
    },
  };
}

// Wat jij moet betalen of krijgt; de organisator ziet de openstaande betalingen van iedereen (spec §7.14).
function afrekeningVan(store, editie, ikId, organisator) {
  const st = stand(store, editie.id);
  const open = st.open
    .filter((b) => organisator || b.vanId === ikId || b.naarId === ikId)
    .map((b) => ({ van: st.naamVan(b.vanId), naar: st.naamVan(b.naarId), bedrag: b.bedrag, ikBetaal: b.vanId === ikId, ikKrijg: b.naarId === ikId }));
  return { open, aantalOpen: st.open.length, saldo: ikId && st.saldi[ikId] !== undefined ? st.saldi[ikId] : 0, uitgaven: totalen(st.posten).totaal, betaald: st.betaald.length };
}

export function startScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  const organisator = sessie.rol === 'organisator';
  if (!editie) return { edities, editie: null, organisator };
  const leden = new Map(store.lees('Leden').map((l) => [l.id, l]));
  const naamVan = (d) => (leden.get(d.lidId) || {}).voornaam || '';
  const alle = deelnemersVan(store, editie.id);
  const actief = alle.filter((d) => !d.afgehaakt);
  const ikId = mijnRij(store, sessie, editie.id);
  const ik = alle.find((d) => d.id === ikId);
  const uit = {
    edities, organisator,
    editie: { ...editieStappen(editie), vastgelegdWeekend: editie.vastgelegdWeekend || '', deelvorm: editie.deelvorm || 'info', boodschappenDefinitief: Boolean(editie.boodschappenDefinitief) },
    ik: ik ? { voornaam: naamVan(ik), ingevuld: Boolean(ik.ingevuld), afgehaakt: Boolean(ik.afgehaakt) } : null,
    voortgang: { aantal: actief.length, ingevuld: actief.filter((d) => d.ingevuld).length, nogNiet: actief.filter((d) => !d.ingevuld).map(naamVan).sort(opNaam) },
    geboekt: geboektVan(store, editie),
    programma: { punten: van(store, 'Programma', editie.id).length },
    deelnemers: actief.length,
  };
  if (stapIndex(editie.stap) >= stapIndex('voorbereiding')) uit.voorbereiding = voorbereiding(store, editie, actief, ikId);
  if (stapIndex(editie.stap) >= stapIndex('afrekenen')) uit.afrekening = afrekeningVan(store, editie, ikId, organisator);
  else uit.afrekening = { open: [], aantalOpen: 0, saldo: 0, uitgaven: 0, betaald: 0 };
  return uit;
}

// ARC-1, §7.15, AAN-30: alle edities van de groep, nieuwste bovenaan, voor iedereen met een geldige sessie.
export function archiefScherm({ store }) {
  const leden = new Map(store.lees('Leden').map((l) => [l.id, l]));
  const deelnemers = store.lees('Deelnemers');
  const namen = (editieId, rol) => deelnemers
    .filter((d) => d.editieId === editieId && (rol === undefined || d.rol === rol))
    .map((d) => (leden.get(d.lidId) || {}).voornaam || '').filter(Boolean).sort(opNaam);
  const edities = [...store.lees('Edities')].sort((a, b) => b.jaar - a.jaar || (a.id < b.id ? 1 : -1)).map((e) => ({
    id: e.id, jaar: e.jaar, titel: e.titel, stap: e.stap, vastgelegdWeekend: e.vastgelegdWeekend || '',
    accommodatie: geboektVan(store, e),
    organisatoren: namen(e.id, 'organisator'), deelnemers: namen(e.id),
  }));
  return { edities };
}
