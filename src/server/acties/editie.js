// Editie aanmaken, links en pincodes maken en vernieuwen, beheerlink voor een lid
// (spec §5.3, §7.1.5, §7.1.7, §7.2.4, EDI-1, EDI-4, EDI-5, EDI-6, TOE-8, TOE-12).
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { hashToken, hashGeheim, maakToken, maakSalt, maakPincode } from '../crypto.js';
import { resetPogingen } from './toegang.js';
import { beheerlinkVoorLid } from './opzet.js';
import { startlijsten, lijstenVan, blokkenVan } from '../../shared/lijsten.js';
import { maakStartItems } from './items.js';
import { BLOKKEN_STANDAARD, MAANDEN_STANDAARD } from '../../shared/editie.js';

const MAX_DEELNEMERS = 20; // AAN-20: een groep heeft hooguit 20 leden

const unieke = (lijst) => [...new Set(lijst)];

// ARC-2, AAN-71: een nieuwe editie kan alleen voortbouwen op een afgeronde editie waar de maker organisator van is.
function bronEditie(store, sessie, id) {
  const bron = store.vind('Edities', id);
  const organisator = bron && store.lees('Deelnemers').some((d) => d.editieId === id && d.lidId === sessie.lidId && d.rol === 'organisator');
  if (!organisator) throw new ApiFout('geen_toegang');
  if (bron.stap !== 'afgerond') throw new ApiFout('gesloten', 'Een nieuwe editie bouwt voort op een afgeronde editie.');
  return bron;
}

export const editieAanmaken = {
  schema: v.object({
    titel: v.tekst({ min: 1, max: 80 }),
    jaar: v.getal({ min: 2000, max: 2100 }),
    periodeVan: v.datum(),
    periodeTot: v.datum(),
    voorkeursmaanden: v.optioneel(v.lijst(v.getal({ min: 1, max: 12 }), { max: 12 })),
    deadline: v.isoTijd(),
    blokken: v.optioneel(v.object({
      etenDrinken: v.optioneel(v.bool()), activiteiten: v.optioneel(v.bool()), programma: v.optioneel(v.bool()), samenwerken: v.optioneel(v.bool()),
    })),
    deelnemers: v.lijst(v.id(), { max: MAX_DEELNEMERS }),
    organisatoren: v.lijst(v.id(), { max: MAX_DEELNEMERS }),
    vanEditieId: v.optioneel(v.id()),
    zonderMaker: v.optioneel(v.bool()),
  }),
  uitvoeren({ store, sessie, data }) {
    const titel = data.titel.trim();
    if (!titel) throw new ApiFout('ongeldig', 'Geef de editie een titel.');
    if (data.periodeTot < data.periodeVan) throw new ApiFout('ongeldig', 'De periode eindigt voor ze begint.');
    const bron = data.vanEditieId ? bronEditie(store, sessie, data.vanEditieId) : null;
    // ARC-2, AAN-71: zonder eigen keuze nemen de deelnemers en organisatoren van de afgeronde editie over.
    const overnemen = bron && !data.deelnemers.length && !data.organisatoren.length;
    const vorige = (rol) => (overnemen ? store.lees('Deelnemers').filter((d) => d.editieId === bron.id && (!rol || d.rol === rol)).map((d) => d.lidId) : []);
    // AAN-46: wie de editie maakt, is er deelnemer en organisator van, tenzij hij met `zonderMaker` de organisatie
    // aan een ander lid geeft; dan doet hij alleen mee als hij bij de deelnemers staat. Een editie heeft altijd
    // minstens één organisator en minstens twee deelnemers.
    const leden = new Map(store.lees('Leden').map((l) => [l.id, l]));
    const weg = (id) => overnemen && !(leden.get(id) || {}).actief; // een lid dat intussen inactief is, blijft bij overnemen weg
    const zonderMaker = data.zonderMaker === true;
    const organisatoren = unieke([...(zonderMaker ? [] : [sessie.lidId]), ...data.organisatoren, ...vorige('organisator')])
      .filter((id) => (id === sessie.lidId ? !zonderMaker : !weg(id)));
    if (!organisatoren.length) throw new ApiFout('ongeldig', 'Kies minstens één organisator.');
    const lidIds = unieke([...organisatoren, ...data.deelnemers, ...vorige().filter((id) => !weg(id))]);
    if (lidIds.length < 2) throw new ApiFout('ongeldig', 'Kies minstens twee deelnemers.');
    for (const id of lidIds) {
      const lid = leden.get(id);
      if (!lid || !lid.actief) throw new ApiFout('ongeldig', 'Een gekozen lid bestaat niet of is inactief.');
    }
    const maanden = unieke(data.voorkeursmaanden || (bron && bron.voorkeursmaanden) || MAANDEN_STANDAARD).sort((a, b) => a - b);
    const lijsten = bron ? JSON.parse(JSON.stringify(lijstenVan(bron))) : startlijsten();
    const editie = store.voegToe('Edities', {
      jaar: data.jaar, titel, stap: 'invullen',
      periodeVan: data.periodeVan, periodeTot: data.periodeTot, voorkeursmaanden: maanden, deadline: data.deadline,
      blokken: { ...(bron ? blokkenVan(bron) : BLOKKEN_STANDAARD), ...(data.blokken || {}) }, lijsten,
      vastgelegdWeekend: '', deelvorm: 'info', geboektAccommodatieId: '', boodschappenDefinitief: false,
    });
    maakStartItems(store, editie.id, lijsten); // §7.7.2: startlijst keuken en spullen
    // Zonder link en pincode: die komen pas bij `linksMaken` (EDI-4).
    const deelnemers = lidIds.map((lidId) => store.voegToe('Deelnemers', {
      editieId: editie.id, lidId, tokenHash: '', pinHash: '', pinSalt: '',
      rol: organisatoren.includes(lidId) ? 'organisator' : 'deelnemer', afgehaakt: false, ingevuld: false, ingevuldOp: '',
    }));
    return { editie: { id: editie.id, titel: editie.titel, jaar: editie.jaar, stap: editie.stap }, eigenOrganisator: organisatoren.includes(sessie.lidId), deelnemers: deelnemers.map((d) => ({ id: d.id, lidId: d.lidId, rol: d.rol })) };
  },
};

// Nieuwe geheimen voor een deelnemer: het script kiest token en pincode (AAN-36).
function nieuwePincode({ sha256, random }) {
  const pin = maakPincode(random);
  const pinSalt = maakSalt(random);
  return { pin, rij: { pinSalt, pinHash: hashGeheim(sha256, pin, pinSalt) } };
}

function nieuweLink(deps) {
  const token = maakToken(deps.random);
  return { token, rij: { tokenHash: hashToken(deps.sha256, token) } };
}

function deelnemerVan(store, editieId, id) {
  const d = store.vind('Deelnemers', id);
  if (!d || d.editieId !== editieId) throw new ApiFout('ongeldig', 'Deze deelnemer hoort niet bij deze editie.');
  return d;
}

const voornaamVan = (store, lidId) => { const l = store.vind('Leden', lidId); return l ? l.voornaam : ''; };

// TOE-8: link en pincode komen alleen in dit antwoord, in klare tekst; in de Sheet staan hashes.
// AAN-47: alleen deelnemers zonder link krijgen er een; wie er al een heeft, houdt die (vernieuwen is een eigen actie).
// AAN-31: een link en pincode horen bij de deelnemersrij van één editie; een nieuwe editie krijgt nieuwe rijen
// en dus nieuwe links. De oude link blijft werken en is na Afgerond alleen-lezen (rechten.js, AAN-29).
export const linksMaken = {
  schema: v.object({}),
  uitvoeren({ store, editieId, deps }) {
    const links = [];
    for (const d of store.lees('Deelnemers')) {
      if (d.editieId !== editieId || d.tokenHash) continue;
      const l = nieuweLink(deps);
      const p = nieuwePincode(deps);
      store.werkBij('Deelnemers', d.id, { ...l.rij, ...p.rij });
      links.push({ deelnemerId: d.id, lidId: d.lidId, voornaam: voornaamVan(store, d.lidId), token: l.token, pin: p.pin });
    }
    return { links };
  },
};

// EDI-5: de oude pincode werkt direct niet meer; de link blijft gelijk. TOE-4: de teller gaat op nul.
export const pincodeVernieuwen = {
  schema: v.object({ deelnemerId: v.id() }),
  uitvoeren({ store, editieId, data, deps }) {
    const d = deelnemerVan(store, editieId, data.deelnemerId);
    if (!d.tokenHash) throw new ApiFout('ongeldig', 'Maak eerst links voor deze editie.');
    const p = nieuwePincode(deps);
    store.werkBij('Deelnemers', d.id, p.rij);
    resetPogingen(store, d.tokenHash);
    return { deelnemerId: d.id, pin: p.pin };
  },
};

// TOE-12: nieuw token en nieuwe pincode; de oude link en de sessies van die deelnemer vervallen.
export const linkVernieuwen = {
  schema: v.object({ deelnemerId: v.id() }),
  uitvoeren({ store, editieId, data, deps }) {
    const d = deelnemerVan(store, editieId, data.deelnemerId);
    const l = nieuweLink(deps);
    const p = nieuwePincode(deps);
    store.werkBij('Deelnemers', d.id, { ...l.rij, ...p.rij });
    if (d.tokenHash) resetPogingen(store, d.tokenHash);
    for (const s of store.lees('Sessies')) if (s.soort === 'deelnemer' && s.subjectId === d.id) store.verwijder('Sessies', s.id);
    return { deelnemerId: d.id, token: l.token, pin: p.pin };
  },
};

// EDI-6: een beheerlink voor een lid; het lid kiest bij eerste gebruik zijn eigen wachtwoord.
export const beheerlinkMaken = {
  schema: v.object({ lidId: v.id() }),
  uitvoeren(h) {
    return { lidId: h.data.lidId, token: beheerlinkVoorLid(h, h.data.lidId) };
  },
};

export const editieHandlers = { editieAanmaken, linksMaken, pincodeVernieuwen, linkVernieuwen, beheerlinkMaken };
