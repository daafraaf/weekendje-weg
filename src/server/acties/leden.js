// Leden beheren en het beheerscherm lezen (spec §5.3, GRP-5). Leden worden nooit verwijderd.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { MIN_LEDEN, MAX_LEDEN } from './opzet.js';
import { vragenVan, heeftAntwoord } from './vragen.js';
import { lijstenVan, blokkenVan } from '../../shared/lijsten.js';

const actieven = (store) => store.lees('Leden').filter((l) => l.actief);

export const ledenBeheren = {
  schema: v.object({
    soort: v.keuze(['toevoegen', 'woonplaats', 'inactief']),
    id: v.optioneel(v.tekst({ min: 1, max: 64 })),
    voornaam: v.optioneel(v.tekst({ min: 1, max: 40 })),
    woonplaats: v.optioneel(v.tekst({ min: 0, max: 60 })),
  }),
  uitvoeren({ store, data }) {
    const bestaand = () => {
      const lid = data.id && store.vind('Leden', data.id);
      if (!lid) throw new ApiFout('ongeldig', 'Dit lid bestaat niet.');
      return lid;
    };
    if (data.soort === 'toevoegen') {
      const voornaam = (data.voornaam || '').trim();
      if (!voornaam) throw new ApiFout('ongeldig', 'Een lid heeft een voornaam.');
      if (actieven(store).length >= MAX_LEDEN) throw new ApiFout('gesloten', `Een groep heeft hooguit ${MAX_LEDEN} leden.`);
      return { lid: store.voegToe('Leden', { voornaam, woonplaats: (data.woonplaats || '').trim(), actief: true }) };
    }
    const lid = bestaand();
    if (data.soort === 'woonplaats') {
      if (data.woonplaats === undefined) throw new ApiFout('ongeldig', 'Veld data.woonplaats: ontbreekt.');
      return { lid: store.werkBij('Leden', lid.id, { woonplaats: data.woonplaats.trim() }) };
    }
    // inactief maken: het lid blijft staan, zodat oude edities kloppen.
    if (lid.actief && actieven(store).length <= MIN_LEDEN) throw new ApiFout('gesloten', `Er blijven minstens ${MIN_LEDEN} actieve leden.`);
    return { lid: store.werkBij('Leden', lid.id, { actief: false }) };
  },
};

// Scherm `beheer`: groep, leden, beheerlinks en de edities van deze organisator, zonder geheimen (TOE-8).
export function beheerScherm({ store, sessie }) {
  const groep = store.lees('Groep')[0];
  const deelnemers = store.lees('Deelnemers');
  const eigenEdities = new Set(deelnemers.filter((d) => d.lidId === sessie.lidId && d.rol === 'organisator').map((d) => d.editieId));
  const edities = store.lees('Edities').filter((e) => eigenEdities.has(e.id)).map((e) => ({
    id: e.id, titel: e.titel, jaar: e.jaar, stap: e.stap, deadline: e.deadline, stapData: e.stapData || {}, voorkeursmaanden: e.voorkeursmaanden || [],
    blokken: blokkenVan(e), lijsten: lijstenVan(e),
    vragen: vragenVan(store, e.id).map((q) => ({ ...q, heeftAntwoord: heeftAntwoord(store, e.id, q.id) })),
    deelnemers: deelnemers.filter((d) => d.editieId === e.id).map((d) => ({ id: d.id, lidId: d.lidId, rol: d.rol, heeftLink: Boolean(d.tokenHash) })),
  }));
  return {
    groep: { naam: groep ? groep.naam : '' },
    eigenLidId: sessie.lidId,
    leden: store.lees('Leden'),
    edities,
    beheerlinks: store.lees('Beheerlinks').map((b) => ({ id: b.id, lidId: b.lidId, actief: b.actief, heeftWachtwoord: Boolean(b.wachtwoordHash), gemaakt: b.gemaakt })),
  };
}

export const ledenHandlers = { ledenBeheren };
