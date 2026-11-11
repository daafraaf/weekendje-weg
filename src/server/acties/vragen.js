// Blokken en lijsten van een editie aanpassen, eigen vragen beheren en hun antwoorden controleren
// (spec §5.2, §7.4, EDI-2, EDI-3, FRM-5 t/m FRM-7, AAN-21).
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { BLOKKEN_NAMEN } from '../../shared/editie.js';
import { stapVelden, stapWijzigingen, editieStappen } from './stappen.js';
import { LIJSTEN_STANDAARD, LIJST_MAX, LABEL_MAX, VRAAGTYPEN, VRAAG_OPTIES, VRAAG_TEKST_MAX, VRAGEN_MAX, lijstenVan, blokkenVan, maakSleutel, antwoordGeldig } from '../../shared/lijsten.js';

const SLEUTEL = /^[a-z0-9]{1,30}$/;
const optie = () => v.object({ sleutel: v.optioneel(v.tekst({ min: 1, max: 30, patroon: SLEUTEL })), label: v.tekst({ min: 1, max: LABEL_MAX }) });
const lijst = (max) => v.optioneel(v.lijst(optie(), { max }));

// EDI-2, EDI-3, AAN-55: aanpassen kan tot de stap Overzicht; daarna zijn blokken, lijsten en vragen vast.
function alleenInvullen(editie) {
  if (editie.stap !== 'invullen') throw new ApiFout('gesloten', 'Dit kan alleen tot de stap Weekendje prikker.');
}

// Behoudt de sleutel van een bestaand item (hernoemen) en maakt een nieuwe sleutel voor een nieuw item.
function maakLijst(nieuw, bestaand) {
  const bekend = new Set(bestaand.map((o) => o.sleutel));
  const gebruikt = new Set();
  const uit = [];
  for (const item of nieuw) {
    const label = item.label.trim();
    if (!label) throw new ApiFout('ongeldig', 'Een onderdeel van een lijst heeft een naam nodig.');
    let sleutel = item.sleutel;
    if (!sleutel || !bekend.has(sleutel) || gebruikt.has(sleutel)) sleutel = maakSleutel(label, new Set([...bekend, ...gebruikt]));
    gebruikt.add(sleutel);
    uit.push({ sleutel, label });
  }
  return uit;
}

// AAN-21: de organisator zet Eten en drinken, Activiteiten, Programma en Samenwerken aan of uit; de vier vaste blokken niet.
export const editieBijwerken = {
  schema: v.object({
    blokken: v.optioneel(v.object(Object.fromEntries(Object.keys(BLOKKEN_NAMEN).map((k) => [k, v.optioneel(v.bool())])))),
    lijsten: v.optioneel(v.object(Object.fromEntries(Object.keys(LIJSTEN_STANDAARD).map((k) => [k, lijst(LIJST_MAX)])))),
    ...stapVelden, // EDI-8, EDI-10: verwachte data en deadline, zie stappen.js
  }),
  uitvoeren({ store, editie, data }) {
    const velden = stapWijzigingen(editie, data);
    if (data.blokken || data.lijsten) {
      alleenInvullen(editie);
      velden.blokken = { ...blokkenVan(editie), ...(data.blokken || {}) };
      velden.lijsten = lijstenVan(editie);
      for (const [sleutel, nieuw] of Object.entries(data.lijsten || {})) velden.lijsten[sleutel] = maakLijst(nieuw, velden.lijsten[sleutel]);
    }
    const rij = Object.keys(velden).length ? store.werkBij('Edities', editie.id, velden, editie.versie) : editie;
    return { blokken: blokkenVan(rij), lijsten: lijstenVan(rij), editie: editieStappen(rij) };
  },
};

export const heeftAntwoord = (store, editieId, vraagId) => store.lees('Antwoorden').some((a) => {
  if (a.editieId !== editieId) return false;
  const w = ((a.data || {}).eigenVragen || {})[vraagId];
  return typeof w === 'string' && w !== '';
});

export const vragenVan = (store, editieId) => store.lees('Vragen').filter((q) => q.editieId === editieId).sort((a, b) => a.volgorde - b.volgorde);

function opties(type, ruw, bestaand) {
  if (type !== 'keuze' && type !== 'meerkeuze') return [];
  const lijstje = maakLijst(ruw || [], bestaand);
  if (lijstje.length < VRAAG_OPTIES.min) throw new ApiFout('ongeldig', 'Geef minstens twee antwoordopties.'); // EDI-12
  if (lijstje.length > VRAAG_OPTIES.max) throw new ApiFout('ongeldig', `Geef ${VRAAG_OPTIES.min} tot ${VRAAG_OPTIES.max} antwoordopties.`);
  return lijstje;
}

// EDI-3: toevoegen, wijzigen en verwijderen tot de stap Overzicht. Heeft een vraag al een antwoord,
// dan mogen alleen de tekst en het verwijderen nog; antwoorden op verwijderde vragen tellen niet mee.
export const vragenBeheren = {
  schema: v.object({
    actie: v.keuze(['toevoegen', 'wijzigen', 'verwijderen']),
    id: v.optioneel(v.id()),
    type: v.optioneel(v.keuze(VRAAGTYPEN)),
    tekst: v.optioneel(v.tekst({ min: 1, max: VRAAG_TEKST_MAX })),
    opties: v.optioneel(v.lijst(optie(), { max: VRAAG_OPTIES.max })),
  }),
  uitvoeren({ store, editie, editieId, data }) {
    alleenInvullen(editie);
    const tekst = data.tekst === undefined ? undefined : data.tekst.trim();
    if (tekst === '') throw new ApiFout('ongeldig', 'Een vraag heeft een tekst nodig.');
    if (data.actie === 'toevoegen') {
      if (!data.type || !tekst) throw new ApiFout('ongeldig', 'Kies een type en schrijf de vraag.');
      const bestaand = vragenVan(store, editieId);
      if (bestaand.length >= VRAGEN_MAX) throw new ApiFout('ongeldig', `Een editie heeft hooguit ${VRAGEN_MAX} eigen vragen.`);
      store.voegToe('Vragen', { editieId, volgorde: bestaand.reduce((m, q) => Math.max(m, q.volgorde), 0) + 1, type: data.type, tekst, opties: opties(data.type, data.opties, []) });
    } else {
      const vraag = data.id && store.vind('Vragen', data.id);
      if (!vraag || vraag.editieId !== editieId) throw new ApiFout('ongeldig', 'Deze vraag bestaat niet.');
      if (data.actie === 'verwijderen') {
        store.verwijder('Vragen', vraag.id);
      } else {
        const type = data.type || vraag.type;
        const nieuw = { tekst: tekst || vraag.tekst };
        if (heeftAntwoord(store, editieId, vraag.id)) {
          const ruweOpties = data.opties && JSON.stringify(data.opties.map((o) => o.label.trim()));
          const wijktAf = type !== vraag.type || (ruweOpties !== undefined && ruweOpties !== JSON.stringify(vraag.opties.map((o) => o.label)));
          if (wijktAf) throw new ApiFout('ongeldig', 'Deze vraag heeft al antwoorden: je kunt alleen de tekst nog wijzigen of de vraag verwijderen.');
        } else {
          nieuw.type = type;
          nieuw.opties = data.opties || data.type ? opties(type, data.opties || vraag.opties, vraag.opties) : vraag.opties;
        }
        store.werkBij('Vragen', vraag.id, nieuw);
      }
    }
    return { vragen: vragenVan(store, editieId).map((q) => ({ ...q, heeftAntwoord: heeftAntwoord(store, editieId, q.id) })) };
  },
};

// FRM-7: bij opslaan blijven alleen antwoorden op bestaande vragen over (verwijderde vragen tellen niet mee);
// een leeg antwoord telt als niet beantwoord. Een ongeldig antwoord weigert het opslaan.
export function schoonEigenVragen(store, editieId, antwoorden) {
  const uit = {};
  const vragen = new Map(vragenVan(store, editieId).map((q) => [q.id, q]));
  for (const [id, waarde] of Object.entries(antwoorden)) {
    const vraag = vragen.get(id);
    if (!vraag || waarde === '') continue;
    if (!antwoordGeldig(vraag, waarde)) throw new ApiFout('ongeldig', `Het antwoord op "${vraag.tekst}" past niet bij de vraag.`);
    uit[id] = waarde;
  }
  return uit;
}

export const vragenHandlers = { editieBijwerken, vragenBeheren };
