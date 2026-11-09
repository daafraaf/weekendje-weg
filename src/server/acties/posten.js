// Posten invoeren, wijzigen en verwijderen en het scherm `posten` met saldi (spec §5.1, §5.2, §7.13, GELD-1 t/m GELD-7).
// Wie wat mag staat in rechten.js: een deelnemer alleen eigen posten, de organisator alle posten (GELD-5).
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { CATEGORIEEN, CATEGORIE_SLEUTELS, POST_GRENZEN } from '../../shared/geld.js';
import { WIJZEN, AANDEEL_MAX, inVerdeling, verdelingFout, schoonVerdeling } from '../../shared/verdeling.js';
import { saldi, totalen, aandelenVan } from '../../shared/saldo.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';

const MAX_DEELNEMERS = 100;
const verdelingSchema = v.object({
  wijze: v.keuze(WIJZEN),
  deelnemers: v.optioneel(v.lijst(v.id(), { max: MAX_DEELNEMERS })),
  aandelen: v.optioneel(v.map(v.id(), v.getal({ min: 0, max: AANDEEL_MAX }), { max: MAX_DEELNEMERS })),
  bedragen: v.optioneel(v.map(v.id(), v.getal({ min: 0, max: POST_GRENZEN.bedragMax }), { max: MAX_DEELNEMERS })),
});

const deelnemersVan = (store, editieId) => store.lees('Deelnemers').filter((d) => d.editieId === editieId);
const postenVan = (store, editieId) => store.lees('Posten').filter((p) => p.editieId === editieId);

// De deelnemersrij van de sessie in deze editie; een beheersessie zonder editieId zoekt hem op via het lid.
function mijnRij(store, sessie, editieId) {
  if (sessie.deelnemerId) return sessie.deelnemerId;
  const rij = deelnemersVan(store, editieId).find((d) => d.lidId === sessie.lidId);
  return rij ? rij.id : null;
}

function naamFunctie(store, deelnemers) {
  const leden = new Map(store.lees('Leden').map((l) => [l.id, l.voornaam]));
  const namen = new Map(deelnemers.map((d) => [d.id, leden.get(d.lidId) || '']));
  return (id) => namen.get(id) || '';
}

// GELD-5: een bestaande post wijzigen volgt de regel voor verwijderen (rechten.js). Een post die niet meer
// bestaat telt als eigen, zodat de handler `gewijzigd` geeft in plaats van geen toegang.
function postContext({ store, sessie, editieId, data }) {
  if (!data.id) return { nieuw: true };
  const post = store.vind('Posten', data.id);
  if (!post) return { nieuw: false, eigen: true };
  return { nieuw: false, eigen: post.editieId === editieId && Boolean(sessie.deelnemerId) && post.aangemaaktDoor === sessie.deelnemerId };
}

function bestaandePost(store, editieId, id) {
  const post = store.vind('Posten', id);
  if (!post || post.editieId !== editieId) throw new ApiFout('gewijzigd');
  return post;
}

export const postOpslaan = {
  schema: v.object({
    id: v.optioneel(v.id()),
    versie: v.optioneel(v.getal({ min: 1 })),
    soort: v.keuze(['uitgave', 'ontvangst']),
    omschrijving: v.tekst({ min: 1, max: POST_GRENZEN.omschrijvingMax }),
    bedrag: v.getal({ min: 1, max: POST_GRENZEN.bedragMax }),
    betalerId: v.id(),
    datum: v.datum(),
    categorie: v.keuze(CATEGORIE_SLEUTELS),
    verdeling: verdelingSchema,
  }),
  context: postContext,
  uitvoeren({ store, sessie, editieId, data }) {
    if (!sessie.deelnemerId) throw new ApiFout('geen_toegang');
    const omschrijving = data.omschrijving.trim();
    if (!omschrijving) throw new ApiFout('ongeldig', 'Geef de post een omschrijving.');
    const ids = new Set(deelnemersVan(store, editieId).map((d) => d.id));
    if (!ids.has(data.betalerId)) throw new ApiFout('ongeldig', 'Kies wie betaalde uit de deelnemers.');
    const fout = verdelingFout(data.bedrag, data.verdeling);
    if (fout) throw new ApiFout('ongeldig', fout.endsWith('.') ? fout : `${fout}.`);
    const verdeling = schoonVerdeling(data.verdeling);
    if (inVerdeling(verdeling).some((id) => !ids.has(id))) throw new ApiFout('ongeldig', 'De verdeling noemt iemand die niet meedoet.');
    const velden = { soort: data.soort, omschrijving, bedrag: data.bedrag, betalerId: data.betalerId, datum: data.datum, categorie: data.categorie, verdeling };
    let rij;
    if (!data.id) {
      rij = store.voegToe('Posten', { editieId, ...velden, aangemaaktDoor: sessie.deelnemerId, aangepastDoorOrganisator: false });
    } else {
      if (data.versie === undefined) throw new ApiFout('ongeldig', 'Veld data.versie: ontbreekt.');
      const post = bestaandePost(store, editieId, data.id);
      // §7.13.10: wijzigt de organisator een post van een ander, dan blijft de aantekening staan.
      if (sessie.rol === 'organisator' && post.aangemaaktDoor !== sessie.deelnemerId) velden.aangepastDoorOrganisator = true;
      rij = store.werkBij('Posten', post.id, velden, data.versie);
    }
    return { id: rij.id, versie: rij.versie };
  },
};

export const postVerwijderen = {
  schema: v.object({ id: v.id(), versie: v.getal({ min: 1 }) }),
  context: postContext,
  uitvoeren({ store, editieId, data }) {
    const post = bestaandePost(store, editieId, data.id);
    store.verwijder('Posten', post.id, data.versie);
    return {};
  },
};

// Scherm `posten`: posten met verdeling en aandelen, saldi en totalen (spec §5.3, GELD-6, GELD-7).
export function postenScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const deelnemers = deelnemersVan(store, editie.id);
  const naamVan = naamFunctie(store, deelnemers);
  const ik = mijnRij(store, sessie, editie.id);
  const isOrganisator = sessie.rol === 'organisator';
  const alleenLezen = editie.stap === 'afgerond'; // na Afgerond alleen lezen (rechten.js)
  const posten = postenVan(store, editie.id)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || (b.bijgewerkt || '').localeCompare(a.bijgewerkt || ''));
  const betalingen = store.lees('Betalingen').filter((b) => b.editieId === editie.id);
  const stand = saldi(posten, betalingen, { deelnemers: deelnemers.map((d) => d.id), naamVan });
  return {
    edities,
    editie: editieStappen(editie),
    ik,
    organisator: isOrganisator,
    alleenLezen,
    categorieen: CATEGORIEEN,
    deelnemers: deelnemers.map((d) => ({ id: d.id, voornaam: naamVan(d.id), afgehaakt: Boolean(d.afgehaakt) }))
      .sort((a, b) => a.voornaam.localeCompare(b.voornaam, 'nl') || (a.id < b.id ? -1 : 1)),
    posten: posten.map((p) => ({
      id: p.id, soort: p.soort, omschrijving: p.omschrijving, bedrag: p.bedrag, betalerId: p.betalerId, datum: p.datum,
      categorie: p.categorie, verdeling: p.verdeling, aangemaaktDoor: p.aangemaaktDoor,
      aangepastDoorOrganisator: Boolean(p.aangepastDoorOrganisator), versie: p.versie,
      aandelen: aandelenVan(p, naamVan),
      magWijzigen: !alleenLezen && (isOrganisator || (Boolean(ik) && p.aangemaaktDoor === ik)),
    })),
    saldi: Object.entries(stand).map(([id, saldo]) => ({ id, voornaam: naamVan(id), saldo }))
      .sort((a, b) => a.voornaam.localeCompare(b.voornaam, 'nl') || (a.id < b.id ? -1 : 1)),
    ...perCategorie(totalen(posten, { ikId: ik, naamVan })),
  };
}

const perCategorie = ({ totaal, mijnDeel, categorieen }) => ({ totaal, mijnDeel, perCategorie: categorieen });

export const postenHandlers = { postOpslaan, postVerwijderen };
