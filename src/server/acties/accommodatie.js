// Weekend vastleggen, accommodaties beheren, deelvorm kiezen en stemmen (spec §5.1, §7.6, ACC-1 t/m ACC-5).
// Wie wat mag staat in rechten.js: beheren alleen de organisator, stemmen een deelnemer bij deelvorm `stemmen`.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { vrijdagen } from '../../shared/datums.js';
import { tellWeekenden, topWeekenden } from '../../shared/rangorde.js';
import { DEELVORMEN, ACC_GRENZEN, prijsPerPersoon, isHttpsLink } from '../../shared/accommodatie.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { deelnemersVan, mijnRij } from './posten.js';
import { maakStandaardMaaltijden } from './maaltijden.js';

const accommodatiesVan = (store, editieId) => store.lees('Accommodaties').filter((a) => a.editieId === editieId);
const stemmenVan = (store, editieId) => store.lees('Stemmen').filter((s) => s.editieId === editieId);

function bestaande(store, editieId, id) {
  const a = store.vind('Accommodaties', id);
  if (!a || a.editieId !== editieId) throw new ApiFout('gewijzigd');
  return a;
}

// ACC-1, ACC-6, AAN-63: een weekend is een vrijdag binnen de periode van de editie; er staat er maar één vast,
// een tweede vastlegging is `gesloten` tot het weekend is losgemaakt.
export const weekendVastleggen = {
  schema: v.object({ vrijdag: v.datum() }),
  uitvoeren({ store, editie, data }) {
    if (editie.vastgelegdWeekend) throw new ApiFout('gesloten', 'Er staat al een weekend vast. Kies eerst een ander weekend.');
    const toegestaan = editie.periodeVan && editie.periodeTot ? vrijdagen(editie.periodeVan, editie.periodeTot) : [];
    if (!toegestaan.includes(data.vrijdag)) throw new ApiFout('ongeldig', 'Kies een vrijdag binnen de periode van de editie.');
    store.werkBij('Edities', editie.id, { vastgelegdWeekend: data.vrijdag }, editie.versie);
    const maaltijden = maakStandaardMaaltijden(store, editie.id); // KOK-1
    return { vastgelegdWeekend: data.vrijdag, maaltijden };
  },
};

// ACC-7, AAN-81, besluit K3: losmaken wist alleen het vastgelegde weekend. Een geboekte accommodatie, de maaltijden
// en de stemmen blijven staan; de boeking hoort dan bij de oude datum (de bevestiging in de UI zegt dat).
export const weekendLosmaken = {
  schema: v.object({}),
  uitvoeren({ store, editie }) {
    if (!editie.vastgelegdWeekend) throw new ApiFout('gewijzigd', 'Er staat geen weekend vast.');
    store.werkBij('Edities', editie.id, { vastgelegdWeekend: '' }, editie.versie);
    return { vastgelegdWeekend: '' };
  },
};

// ACC-2, AAN-64: naam, plaats, link, totaalprijs in centen en notitie.
export const accommodatieOpslaan = {
  schema: v.object({
    id: v.optioneel(v.id()),
    versie: v.optioneel(v.getal({ min: 1 })),
    naam: v.tekst({ min: 1, max: ACC_GRENZEN.naamMax }),
    plaats: v.tekst({ max: ACC_GRENZEN.plaatsMax }),
    link: v.tekst({ max: ACC_GRENZEN.linkMax }),
    prijsTotaal: v.getal({ min: 0, max: ACC_GRENZEN.prijsMax }),
    notitie: v.tekst({ max: ACC_GRENZEN.notitieMax }),
  }),
  uitvoeren({ store, editieId, data }) {
    const naam = data.naam.trim();
    if (!naam) throw new ApiFout('ongeldig', 'Geef de accommodatie een naam.');
    const link = data.link.trim();
    if (link && !isHttpsLink(link)) throw new ApiFout('ongeldig', 'Een link begint met https://.'); // NFR-3
    const velden = { naam, plaats: data.plaats.trim(), link, prijsTotaal: data.prijsTotaal, notitie: data.notitie.trim() };
    let rij;
    if (!data.id) {
      if (accommodatiesVan(store, editieId).length >= ACC_GRENZEN.aantalMax) throw new ApiFout('ongeldig', `Er passen hooguit ${ACC_GRENZEN.aantalMax} accommodaties in een editie.`);
      rij = store.voegToe('Accommodaties', { editieId, ...velden });
    } else {
      if (data.versie === undefined) throw new ApiFout('ongeldig', 'Veld data.versie: ontbreekt.');
      bestaande(store, editieId, data.id);
      rij = store.werkBij('Accommodaties', data.id, velden, data.versie);
    }
    return { id: rij.id, versie: rij.versie };
  },
};

// AAN-65: een verwijderde accommodatie neemt zijn stemmen mee; was het de geboekte, dan wordt de deelvorm weer `info`.
export const accommodatieVerwijderen = {
  schema: v.object({ id: v.id(), versie: v.getal({ min: 1 }) }),
  uitvoeren({ store, editie, editieId, data }) {
    const a = bestaande(store, editieId, data.id);
    store.verwijder('Accommodaties', a.id, data.versie);
    for (const s of stemmenVan(store, editieId).filter((x) => x.accommodatieId === a.id)) store.verwijder('Stemmen', s.id);
    if (editie.geboektAccommodatieId === a.id) store.werkBij('Edities', editie.id, { deelvorm: 'info', geboektAccommodatieId: '' }, editie.versie);
    return {};
  },
};

// ACC-3, AAN-65: `geboekt` hoort bij precies één accommodatie; een andere deelvorm wist de geboekte.
export const deelvormZetten = {
  schema: v.object({ deelvorm: v.keuze(DEELVORMEN), accommodatieId: v.optioneel(v.id()) }),
  uitvoeren({ store, editie, editieId, data }) {
    let geboekt = '';
    if (data.deelvorm === 'geboekt') {
      const gekozen = data.accommodatieId || editie.geboektAccommodatieId;
      if (!gekozen) throw new ApiFout('ongeldig', 'Kies de accommodatie die geboekt is.');
      geboekt = bestaande(store, editieId, gekozen).id;
    }
    store.werkBij('Edities', editie.id, { deelvorm: data.deelvorm, geboektAccommodatieId: geboekt }, editie.versie);
    return { deelvorm: data.deelvorm, geboektAccommodatieId: geboekt };
  },
};

// ACC-4, AAN-08: één favoriet per persoon; opnieuw stemmen vervangt de eerdere stem.
export const stemmen = {
  schema: v.object({ accommodatieId: v.id() }),
  uitvoeren({ store, sessie, editieId, data }) {
    if (!sessie.deelnemerId) throw new ApiFout('geen_toegang');
    const a = bestaande(store, editieId, data.accommodatieId);
    const eerder = stemmenVan(store, editieId).find((s) => s.deelnemerId === sessie.deelnemerId);
    if (!eerder) store.voegToe('Stemmen', { editieId, deelnemerId: sessie.deelnemerId, accommodatieId: a.id });
    else if (eerder.accommodatieId !== a.id) store.werkBij('Stemmen', eerder.id, { accommodatieId: a.id });
    return { accommodatieId: a.id };
  },
};

// De top 5 weekenden voor de organisator (ACC-1), op dezelfde manier geteld als het overzicht.
function weekendKeuze(store, editie) {
  const alle = editie.periodeVan && editie.periodeTot ? vrijdagen(editie.periodeVan, editie.periodeTot) : [];
  const antwoordVan = new Map(store.lees('Antwoorden').filter((a) => a.editieId === editie.id).map((a) => [a.deelnemerId, a.data || {}]));
  const datas = deelnemersVan(store, editie.id).filter((d) => !d.afgehaakt).map((d) => (antwoordVan.get(d.id) || {}).beschikbaarheid || {});
  const top = topWeekenden(tellWeekenden(alle, datas, editie.voorkeursmaanden || []));
  return { weekenden: alle, top: top.map((t) => ({ vrijdag: t.vrijdag, plek: t.plek, ja: t.ja, misschien: t.misschien, nee: t.nee })) };
}

// Scherm `accommodaties`: lijst met stemaantallen, mijn stem en het vastgelegde weekend (spec §5.3).
export function accommodatiesScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const organisator = sessie.rol === 'organisator';
  const aantal = deelnemersVan(store, editie.id).filter((d) => !d.afgehaakt).length;
  const ik = mijnRij(store, sessie, editie.id);
  const stemmenLijst = stemmenVan(store, editie.id);
  const telt = editie.deelvorm === 'stemmen';
  const uit = {
    edities,
    editie: { ...editieStappen(editie), periodeVan: editie.periodeVan, periodeTot: editie.periodeTot },
    ik,
    organisator,
    alleenLezen: editie.stap === 'afgerond', // na Afgerond alleen lezen (rechten.js)
    deelvorm: editie.deelvorm || 'info',
    vastgelegdWeekend: editie.vastgelegdWeekend || '',
    losmakenMogelijk: ['overzicht', 'accommodatie'].includes(editie.stap), // AAN-81
    geboektId: editie.geboektAccommodatieId || '',
    aantal,
    mijnStem: (stemmenLijst.find((s) => ik && s.deelnemerId === ik) || {}).accommodatieId || '',
    accommodaties: accommodatiesVan(store, editie.id).map((a) => ({
      id: a.id, naam: a.naam, plaats: a.plaats, link: a.link, prijsTotaal: a.prijsTotaal, notitie: a.notitie, versie: a.versie,
      prijsPerPersoon: prijsPerPersoon(a.prijsTotaal, aantal),
      stemmen: telt ? stemmenLijst.filter((s) => s.accommodatieId === a.id).length : 0, // aantallen, geen namen
    })),
  };
  if (organisator) Object.assign(uit, weekendKeuze(store, editie));
  return uit;
}

export const accommodatieHandlers = { weekendVastleggen, weekendLosmaken, accommodatieOpslaan, accommodatieVerwijderen, deelvormZetten, stemmen };
