// Programma van het weekend (spec §5.1, §7.11.1, PRG-1 t/m PRG-3).
// AAN-25: alleen de organisator vult het programma (rechten.js: programmaOpslaan en programmaVerwijderen).
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { isHttpsLink } from '../../shared/accommodatie.js';
import { DAGEN, PROGRAMMA_GRENZEN as G, opTijd } from '../../shared/maaltijden.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { mijnRij } from './posten.js';

const puntenVan = (store, editieId) => store.lees('Programma').filter((p) => p.editieId === editieId);

function bestaandPunt(store, editieId, id) {
  const p = store.vind('Programma', id);
  if (!p || p.editieId !== editieId) throw new ApiFout('gewijzigd');
  return p;
}

// PRG-1, AAN-69: dag, begin, eind (optioneel), titel, adres, link (https) en notitie; het eind ligt na het begin.
export const programmaOpslaan = {
  schema: v.object({
    id: v.optioneel(v.id()),
    dag: v.keuze(DAGEN),
    begin: v.tijd(),
    eind: v.optioneel(v.tekst({ max: 5 })),
    titel: v.tekst({ min: 1, max: G.titelMax }),
    adres: v.tekst({ max: G.adresMax }),
    link: v.tekst({ max: G.linkMax }),
    notitie: v.tekst({ max: G.notitieMax }),
  }),
  uitvoeren({ store, editieId, data }) {
    const titel = data.titel.trim();
    if (!titel) throw new ApiFout('ongeldig', 'Geef het programmapunt een titel.');
    const eind = (data.eind || '').trim();
    if (eind && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(eind) || eind <= data.begin)) throw new ApiFout('ongeldig', 'Het eind ligt na het begin.');
    const link = data.link.trim();
    if (link && !isHttpsLink(link)) throw new ApiFout('ongeldig', 'Een link begint met https://.'); // NFR-3
    const velden = { dag: data.dag, begin: data.begin, eind, titel, adres: data.adres.trim(), link, notitie: data.notitie.trim() };
    let rij;
    if (!data.id) {
      if (puntenVan(store, editieId).length >= G.aantalMax) throw new ApiFout('ongeldig', `Er passen hooguit ${G.aantalMax} punten in het programma.`);
      rij = store.voegToe('Programma', { editieId, ...velden });
    } else {
      bestaandPunt(store, editieId, data.id);
      rij = store.werkBij('Programma', data.id, velden);
    }
    return { id: rij.id };
  },
};

export const programmaVerwijderen = {
  schema: v.object({ id: v.id() }),
  uitvoeren({ store, editieId, data }) {
    store.verwijder('Programma', bestaandPunt(store, editieId, data.id).id);
    return {};
  },
};

// Scherm `programma`: alle punten op dag en begintijd (PRG-2).
export function programmaScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  return {
    edities,
    editie: editieStappen(editie),
    organisator: sessie.rol === 'organisator',
    ikDeelnemer: Boolean(mijnRij(store, sessie, editie.id)),
    alleenLezen: editie.stap === 'afgerond',
    vastgelegdWeekend: editie.vastgelegdWeekend || '',
    punten: puntenVan(store, editie.id).sort((a, b) => DAGEN.indexOf(a.dag) - DAGEN.indexOf(b.dag) || opTijd(a, b))
      .map((p) => ({ id: p.id, dag: p.dag, begin: p.begin, eind: p.eind, titel: p.titel, adres: p.adres, link: p.link, notitie: p.notitie })),
  };
}

export const programmaHandlers = { programmaOpslaan, programmaVerwijderen };
