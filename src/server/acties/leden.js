// Leden beheren en het beheerscherm lezen (spec §5.3, GRP-5). Leden worden nooit verwijderd.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { MIN_LEDEN, MAX_LEDEN } from './opzet.js';

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

// Scherm `beheer` (voor nu: groep, leden en beheerlinks zonder geheimen; editie-instellingen volgen met EDI).
export function beheerScherm({ store, sessie }) {
  const groep = store.lees('Groep')[0];
  return {
    groep: { naam: groep ? groep.naam : '' },
    eigenLidId: sessie.lidId,
    leden: store.lees('Leden'),
    beheerlinks: store.lees('Beheerlinks').map((b) => ({ id: b.id, lidId: b.lidId, actief: b.actief, heeftWachtwoord: Boolean(b.wachtwoordHash), gemaakt: b.gemaakt })),
  };
}

export const ledenHandlers = { ledenBeheren };
