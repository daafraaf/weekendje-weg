// Afrekening: scherm `afrekening`, betaling markeren en terugdraaien (spec §5.3, §7.13.6 t/m §7.13.8, GELD-8, GELD-9).
// Wie wat mag staat in rechten.js: een deelnemer alleen betalingen waar hij `van` of `naar` is, de organisator alle.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { POST_GRENZEN } from '../../shared/geld.js';
import { saldi, totalen } from '../../shared/saldo.js';
import { afrekening, zelfdeBetaling } from '../../shared/afrekening.js';
import { kiesEditie } from './overzicht.js';
import { editieStappen } from './stappen.js';
import { deelnemersVan, mijnRij, naamFunctie } from './posten.js';

const opNaam = (a, b) => a.voornaam.localeCompare(b.voornaam, 'nl') || (a.id < b.id ? -1 : 1);

// Saldi na alle posten en gedane betalingen, en de openstaande betalingen die daaruit volgen.
export function stand(store, editieId) {
  const deelnemers = deelnemersVan(store, editieId);
  const naamVan = naamFunctie(store, deelnemers);
  const posten = store.lees('Posten').filter((p) => p.editieId === editieId);
  const betaald = store.lees('Betalingen').filter((b) => b.editieId === editieId);
  const s = saldi(posten, betaald, { deelnemers: deelnemers.map((d) => d.id), naamVan });
  return { deelnemers, naamVan, posten, betaald, saldi: s, open: afrekening(s, naamVan) };
}

const betrokken = (sessie, b) => Boolean(sessie.deelnemerId) && (b.vanId === sessie.deelnemerId || b.naarId === sessie.deelnemerId);

export const betalingMarkeren = {
  schema: v.object({ vanId: v.id(), naarId: v.id(), bedrag: v.getal({ min: 1, max: POST_GRENZEN.bedragMax * 100 }) }),
  context: ({ sessie, data }) => ({ betrokken: betrokken(sessie, data) }),
  uitvoeren({ store, editieId, data, deps }) {
    // AAN-62: alleen een betaling die nu open staat in de afrekening; is die intussen veranderd, dan `gewijzigd`.
    if (!stand(store, editieId).open.some((b) => zelfdeBetaling(b, data))) throw new ApiFout('gewijzigd');
    const rij = store.voegToe('Betalingen', { editieId, vanId: data.vanId, naarId: data.naarId, bedrag: data.bedrag, betaaldOp: deps.nu().toISOString() });
    return { id: rij.id };
  },
};

// Een betaling die niet meer bestaat telt als betrokken, zodat de handler `gewijzigd` geeft in plaats van geen toegang.
export const betalingTerugdraaien = {
  schema: v.object({ id: v.id() }),
  context: ({ store, sessie, data }) => {
    const b = store.vind('Betalingen', data.id);
    return { betrokken: !b || betrokken(sessie, b) };
  },
  uitvoeren({ store, editieId, data }) {
    const b = store.vind('Betalingen', data.id);
    if (!b || b.editieId !== editieId) throw new ApiFout('gewijzigd');
    store.verwijder('Betalingen', b.id); // §7.13.8: terugdraaien verwijdert de rij
    return {};
  },
};

// Scherm `afrekening`: saldo nu, openstaande en betaalde betalingen (GELD-8, GELD-9, GELD-10).
export function afrekeningScherm(h) {
  const { store, sessie } = h;
  const { editie, edities } = kiesEditie(h);
  if (!editie) return { edities, editie: null };
  const st = stand(store, editie.id);
  const ik = mijnRij(store, sessie, editie.id);
  const organisator = sessie.rol === 'organisator';
  const alleenLezen = editie.stap === 'afgerond'; // na Afgerond alleen lezen (rechten.js)
  const mag = (b) => !alleenLezen && (organisator || (Boolean(ik) && (b.vanId === ik || b.naarId === ik)));
  return {
    edities,
    editie: editieStappen(editie),
    ik,
    organisator,
    alleenLezen,
    deelnemers: st.deelnemers.map((d) => ({ id: d.id, voornaam: st.naamVan(d.id), afgehaakt: Boolean(d.afgehaakt) })).sort(opNaam),
    uitgaven: totalen(st.posten).totaal,
    open: st.open.map((b) => ({ ...b, magMarkeren: mag(b) })),
    betaald: st.betaald.sort((a, b) => (a.betaaldOp || '').localeCompare(b.betaaldOp || ''))
      .map((b) => ({ id: b.id, vanId: b.vanId, naarId: b.naarId, bedrag: b.bedrag, betaaldOp: b.betaaldOp, magTerugdraaien: mag(b) })),
    saldi: Object.entries(st.saldi).map(([id, saldo]) => ({ id, voornaam: st.naamVan(id), saldo })).sort(opNaam),
  };
}

export const afrekeningHandlers = { betalingMarkeren, betalingTerugdraaien };
