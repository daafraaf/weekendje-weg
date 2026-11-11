// Weekend vastleggen en accommodaties: beheren, verrassing of samen kiezen, top 3, boeken en onthullen
// (spec §5.1, §7.6, ACC-1, ACC-2, ACC-6 t/m ACC-14). Wie wat mag staat in rechten.js.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { vrijdagen } from '../../shared/datums.js';
import { tellWeekenden, topWeekenden } from '../../shared/rangorde.js';
import { DEELVORMEN, ACC_GRENZEN, prijsPerPersoon, isHttpsLink, deelvormVan, rangVan, telPunten, maxRang, beddenFout } from '../../shared/accommodatie.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { deelnemersVan, mijnRij } from './posten.js';
import { maakStandaardMaaltijden } from './maaltijden.js';
import { verborgenVoor, isOrganisatorVan } from './geheim.js';

const accommodatiesVan = (store, editieId) => store.lees('Accommodaties').filter((a) => a.editieId === editieId);
const stemmenVan = (store, editieId) => store.lees('Stemmen').filter((s) => s.editieId === editieId);

function bestaande(store, editieId, id) {
  const a = store.vind('Accommodaties', id);
  if (!a || a.editieId !== editieId) throw new ApiFout('gewijzigd');
  return a;
}

// Omzetting (shared/accommodatie.js): elke schrijfactie op de editie zet de deelvorm meteen in de nieuwe vorm.
const editieVelden = (editie, velden) => ({ deelvorm: deelvormVan(editie.deelvorm), ...velden });

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

// ACC-2, ACC-14, AAN-64: naam, plaats, link, totaalprijs in centen, notitie en optioneel bedden en eigen kamers.
// Een weggelaten bedden of eigenKamers maakt het veld leeg.
const aantalSchema = v.optioneel(v.getal({ min: 0, max: ACC_GRENZEN.beddenMax }));
export const accommodatieOpslaan = {
  schema: v.object({
    id: v.optioneel(v.id()),
    versie: v.optioneel(v.getal({ min: 1 })),
    naam: v.tekst({ min: 1, max: ACC_GRENZEN.naamMax }),
    plaats: v.tekst({ max: ACC_GRENZEN.plaatsMax }),
    link: v.tekst({ max: ACC_GRENZEN.linkMax }),
    prijsTotaal: v.getal({ min: 0, max: ACC_GRENZEN.prijsMax }),
    notitie: v.tekst({ max: ACC_GRENZEN.notitieMax }),
    bedden: aantalSchema,
    eigenKamers: aantalSchema,
  }),
  uitvoeren({ store, editieId, data }) {
    const naam = data.naam.trim();
    if (!naam) throw new ApiFout('ongeldig', 'Geef de accommodatie een naam.');
    const link = data.link.trim();
    if (link && !isHttpsLink(link)) throw new ApiFout('ongeldig', 'Een link begint met https://.'); // NFR-3
    const bedden = data.bedden === undefined ? null : data.bedden;
    const eigenKamers = data.eigenKamers === undefined ? null : data.eigenKamers;
    const fout = beddenFout(bedden, eigenKamers);
    if (fout) throw new ApiFout('ongeldig', fout);
    const velden = { naam, plaats: data.plaats.trim(), link, prijsTotaal: data.prijsTotaal, notitie: data.notitie.trim(), bedden, eigenKamers };
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

// ACC-13, AAN-65: een verwijderde accommodatie neemt zijn voorkeuren mee. Was het de geboekte, dan is er weer
// "nog geen accommodatie gekozen" en is een onthulling ook weg (zie verrassingOnthullen); de deelvorm blijft.
export const accommodatieVerwijderen = {
  schema: v.object({ id: v.id(), versie: v.getal({ min: 1 }) }),
  uitvoeren({ store, editie, editieId, data }) {
    const a = bestaande(store, editieId, data.id);
    store.verwijder('Accommodaties', a.id, data.versie);
    for (const s of stemmenVan(store, editieId).filter((x) => x.accommodatieId === a.id)) store.verwijder('Stemmen', s.id);
    if (editie.geboektAccommodatieId === a.id) store.werkBij('Edities', editie.id, editieVelden(editie, { geboektAccommodatieId: '', onthuld: false }), editie.versie);
    return {};
  },
};

// ACC-8, ACC-13, AAN-65: Verrassing of Samen kiezen. Wisselen mag zolang er niets geboekt is; de voorkeuren blijven.
export const deelvormZetten = {
  schema: v.object({ deelvorm: v.keuze(DEELVORMEN) }),
  uitvoeren({ store, editie, data }) {
    if (editie.geboektAccommodatieId) throw new ApiFout('gesloten', 'Er is al geboekt. Wisselen kan alleen zolang er niets geboekt is.');
    store.werkBij('Edities', editie.id, { deelvorm: data.deelvorm, onthuld: false }, editie.versie);
    return { deelvorm: data.deelvorm };
  },
};

// ACC-13, AAN-65: boeken legt één accommodatie vast als geboekt; een andere boeken vervangt de vorige.
export const accommodatieBoeken = {
  schema: v.object({ accommodatieId: v.id() }),
  uitvoeren({ store, editie, editieId, data }) {
    const a = bestaande(store, editieId, data.accommodatieId);
    if (editie.geboektAccommodatieId !== a.id) store.werkBij('Edities', editie.id, editieVelden(editie, { geboektAccommodatieId: a.id }), editie.versie);
    return { geboektAccommodatieId: a.id };
  },
};

// ACC-10, AAN-87: alleen de organisator onthult, nooit automatisch, en alleen een verrassing die geboekt is; dat kan
// vanaf de stap Accommodatie, ook na Afgerond (rechten.js). Onthullen is definitief; nog eens onthullen verandert
// niets. Alleen verwijderen van de geboekte accommodatie maakt onthuld weer onwaar.
export const verrassingOnthullen = {
  schema: v.object({}),
  uitvoeren({ store, editie }) {
    if (deelvormVan(editie.deelvorm) !== 'verrassing') throw new ApiFout('gesloten', 'Alleen een verrassing kun je onthullen.');
    if (!editie.geboektAccommodatieId) throw new ApiFout('ongeldig', 'Boek eerst een accommodatie.');
    if (!editie.onthuld) store.werkBij('Edities', editie.id, { onthuld: true }, editie.versie);
    return { onthuld: true };
  },
};

// ACC-11, AAN-08: de top 3 van de sessie. Opnieuw opgeven vervangt de eerdere keuze helemaal; een lege lijst haalt
// haar weg. Idempotent en laatste wint, zodat de top 3 via de wachtrij kan (AAN-83). Eén rij per keuze in Stemmen.
export const top3Opgeven = {
  schema: v.object({ keuzes: v.lijst(v.object({ accommodatieId: v.id(), rang: v.getal({ min: 1, max: 3 }) }), { max: 3 }) }),
  uitvoeren({ store, sessie, editieId, data }) {
    if (!sessie.deelnemerId) throw new ApiFout('geen_toegang');
    const opties = accommodatiesVan(store, editieId);
    const max = maxRang(opties.length);
    const ids = new Set(), rangen = new Set();
    for (const k of data.keuzes) {
      if (!opties.some((a) => a.id === k.accommodatieId)) throw new ApiFout('gewijzigd', 'Een van je keuzes bestaat niet meer.');
      if (k.rang > max) throw new ApiFout('ongeldig', `Er zijn ${opties.length} opties; kies een plek van 1 tot ${max}.`);
      if (ids.has(k.accommodatieId) || rangen.has(k.rang)) throw new ApiFout('ongeldig', 'Elke optie en elke plek kies je één keer.');
      ids.add(k.accommodatieId); rangen.add(k.rang);
    }
    for (const s of stemmenVan(store, editieId).filter((x) => x.deelnemerId === sessie.deelnemerId)) store.verwijder('Stemmen', s.id);
    for (const k of data.keuzes) store.voegToe('Stemmen', { editieId, deelnemerId: sessie.deelnemerId, accommodatieId: k.accommodatieId, rang: k.rang });
    return { keuzes: data.keuzes };
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

// Scherm `accommodaties` (spec §5.3): de opties met punten, de eigen top 3, het vastgelegde weekend en de boeking.
// ACC-9: bij een niet-onthulde verrassing krijgt een deelnemer geen enkele optie, geen ID en geen telling; alleen
// of het geregeld is. ACC-12: tellingen zonder namen.
export function accommodatiesScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const organisator = sessie.rol === 'organisator';
  const actief = deelnemersVan(store, editie.id).filter((d) => !d.afgehaakt);
  const aantal = actief.length;
  const actieveIds = new Set(actief.map((d) => d.id));
  const ik = mijnRij(store, sessie, editie.id);
  const deelvorm = deelvormVan(editie.deelvorm);
  const verborgen = verborgenVoor(store, sessie, editie);
  const leden = new Map(store.lees('Leden').map((l) => [l.id, l.voornaam]));
  const opties = verborgen ? [] : accommodatiesVan(store, editie.id);
  const geboektId = opties.some((a) => a.id === editie.geboektAccommodatieId) ? editie.geboektAccommodatieId : '';
  const stemmenLijst = deelvorm === 'samen' ? stemmenVan(store, editie.id) : [];
  const telling = telPunten(opties, stemmenLijst, (id) => actieveIds.has(id)); // AAN-08: afgehaakten tellen niet mee
  const perId = new Map(telling.opties.map((o) => [o.id, o]));
  const uit = {
    edities,
    editie: { ...editieStappen(editie), periodeVan: editie.periodeVan, periodeTot: editie.periodeTot },
    ik,
    organisator,
    alleenLezen: editie.stap === 'afgerond', // na Afgerond alleen lezen (rechten.js), onthullen uitgezonderd
    deelvorm,
    onthuld: Boolean(editie.onthuld),
    verborgen,
    geboekt: Boolean(editie.geboektAccommodatieId && store.vind('Accommodaties', editie.geboektAccommodatieId)),
    geboektId,
    regelaars: deelnemersVan(store, editie.id).filter((d) => d.rol === 'organisator').map((d) => leden.get(d.lidId) || '').filter(Boolean),
    vastgelegdWeekend: editie.vastgelegdWeekend || '',
    losmakenMogelijk: ['overzicht', 'accommodatie'].includes(editie.stap), // AAN-81
    aantal,
    gaven: deelvorm === 'samen' ? telling.gaven : 0,
    mijnTop3: deelvorm === 'samen' && ik
      ? stemmenLijst.filter((s) => s.deelnemerId === ik && perId.has(s.accommodatieId)).map((s) => ({ accommodatieId: s.accommodatieId, rang: rangVan(s) })).sort((a, b) => a.rang - b.rang)
      : [],
    accommodaties: opties.map((a) => ({
      id: a.id, naam: a.naam, plaats: a.plaats, link: a.link, prijsTotaal: a.prijsTotaal, notitie: a.notitie, versie: a.versie,
      bedden: a.bedden, eigenKamers: a.eigenKamers,
      prijsPerPersoon: prijsPerPersoon(a.prijsTotaal, aantal),
      punten: perId.get(a.id).punten, mensen: perId.get(a.id).mensen, // aantallen, geen namen
    })),
  };
  if (organisator) Object.assign(uit, weekendKeuze(store, editie));
  if (isOrganisatorVan(store, sessie, editie.id)) uit.onthullenMogelijk = deelvorm === 'verrassing' && uit.geboekt && !uit.onthuld;
  return uit;
}

export const accommodatieHandlers = { weekendVastleggen, weekendLosmaken, accommodatieOpslaan, accommodatieVerwijderen, deelvormZetten, accommodatieBoeken, verrassingOnthullen, top3Opgeven };
