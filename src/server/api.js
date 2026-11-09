// API-contract van het doorgeefluik (spec §3, §5.3, §7.16). Eén logica voor Apps Script en de
// nepbackend; de adapters leveren store, slot, willekeur, sha256 en klok.
import { ApiFout, foutAntwoord } from './fouten.js';
import { reden, ALLE_SCHERMEN } from './rechten.js';
import { valideer, v } from './validatie.js';
import { hashToken } from './crypto.js';

export const API_VERSIE = 1;
export const SLOT_WACHTTIJD_MS = 10000;
const MAX_VERZOEK = 200000;

// Per actie: schrijft (onder het slot, met Log), sessie nodig, editie nodig.
const S = { schrijft: true, sessie: true, editie: true };
const SG = { schrijft: true, sessie: true, editie: false };
const OPEN = { schrijft: true, sessie: false, editie: false };

export const ACTIES = {
  status: { schrijft: false, sessie: false, editie: false },
  scherm: { schrijft: false, sessie: true, editie: false },
  inloggenDeelnemer: OPEN, inloggenBeheer: OPEN, wachtwoordInstellen: OPEN, uitloggen: SG,
  groepOpzetten: OPEN,
  ledenBeheren: SG,
  editieAanmaken: SG, editieBijwerken: S, deelnemersBeheren: S, linksMaken: S, linkVernieuwen: S,
  pincodeVernieuwen: S, beheerlinkMaken: SG, stapZetten: S, afhakenMarkeren: S, vragenBeheren: S,
  antwoordenOpslaan: S,
  weekendVastleggen: S, accommodatieOpslaan: S, accommodatieVerwijderen: S, deelvormZetten: S, stemmen: S,
  itemOpslaan: S, itemVerwijderen: S, claimen: S, claimIntrekken: S, afvinken: S,
  boodschappenDefinitief: S, maaltijdOpslaan: S, kokWorden: S, kokStoppen: S, programmaOpslaan: S,
  programmaVerwijderen: S, kamersOpslaan: S, kamerIndelen: S, ritOpslaan: S, meerijden: S, meerijdenStoppen: S,
  postOpslaan: S, postVerwijderen: S, betalingMarkeren: S, betalingTerugdraaien: S,
};

const ENVELOP = v.object({
  actie: v.keuze(Object.keys(ACTIES)),
  sessie: v.optioneel(v.tekst({ max: 64 })),
  editieId: v.optioneel(v.id()),
  data: v.optioneel(v.vrij()),
  apiVersie: v.optioneel(v.getal({ min: 0, max: 1000 })),
});

// Handlers: { schema?, context?(h) -> rijcontext, uitvoeren(h) -> data }.
// h = { store, sessie, editie, editieId, data, ctx, deps }.
const STANDAARD = {
  status: {
    schema: v.object({}),
    uitvoeren: ({ store }) => {
      const groep = store.lees('Groep')[0];
      return { apiVersie: API_VERSIE, opgezet: Boolean(groep && groep.opgezet) };
    },
  },
};

export function maakApi(deps) {
  const { store, lock, sha256, nu } = deps;
  const handlers = { ...STANDAARD, ...(deps.handlers || {}) };
  const logFout = deps.logFout || (() => {});

  function leesVerzoek(tekst) {
    if (typeof tekst !== 'string' || tekst.length === 0 || tekst.length > MAX_VERZOEK) throw new ApiFout('ongeldig');
    let ruw;
    try { ruw = JSON.parse(tekst); } catch { throw new ApiFout('ongeldig'); }
    const verzoek = valideer(ENVELOP, ruw, 'verzoek');
    if (verzoek.apiVersie === undefined && verzoek.actie !== 'status') throw new ApiFout('ongeldig', 'Veld verzoek.apiVersie: ontbreekt.');
    if (verzoek.apiVersie !== undefined && verzoek.apiVersie !== API_VERSIE) throw new ApiFout('api_versie');
    return verzoek;
  }

  function zoekSessie(token) {
    const gast = { rol: 'gast' };
    if (!token) return gast;
    const hash = hashToken(sha256, token);
    const rij = store.lees('Sessies').find((r) => r.tokenHash === hash);
    if (!rij) return gast;
    if (!(Date.parse(rij.verloopt) > nu().getTime())) return { rol: 'gast', verlopen: true };
    if (rij.soort === 'deelnemer') {
      const d = store.vind('Deelnemers', rij.subjectId);
      if (!d) return gast;
      return { rol: 'deelnemer', sessieId: rij.id, subjectId: rij.subjectId, deelnemerId: d.id, lidId: d.lidId, editieId: d.editieId };
    }
    if (rij.soort === 'beheer') {
      const bl = store.vind('Beheerlinks', rij.subjectId);
      if (!bl || !bl.actief) return gast;
      return { rol: 'organisator', sessieId: rij.id, subjectId: rij.subjectId, lidId: bl.lidId };
    }
    return gast;
  }

  function uitvoeren(verzoek) {
    const def = ACTIES[verzoek.actie];
    store.nieuwVerzoek();
    const sessie = zoekSessie(verzoek.sessie);
    if (def.sessie && sessie.rol === 'gast') throw new ApiFout(sessie.verlopen ? 'verlopen' : 'geen_toegang'); // TOE-6

    let editieId = verzoek.editieId;
    if (sessie.rol === 'deelnemer') {
      if (editieId && editieId !== sessie.editieId) throw new ApiFout('geen_toegang');
      editieId = sessie.editieId;
    } else if (sessie.rol !== 'organisator') {
      editieId = undefined;
    }
    if (def.editie && !editieId) throw new ApiFout('ongeldig', 'Veld verzoek.editieId: ontbreekt.');

    const ctx = {};
    let editie = null;
    if (editieId) {
      editie = store.vind('Edities', editieId);
      if (!editie) throw new ApiFout('geen_toegang');
      ctx.editieId = editieId;
      ctx.stap = editie.stap;
      ctx.naDeadline = Boolean(editie.deadline) && nu().getTime() > Date.parse(editie.deadline);
      ctx.deelvorm = editie.deelvorm;
      ctx.definitief = editie.boodschappenDefinitief;
      if (sessie.rol === 'organisator') {
        const eigen = store.lees('Deelnemers').find((d) => d.editieId === editieId && d.lidId === sessie.lidId);
        ctx.organisatorVanEditie = Boolean(eigen && eigen.rol === 'organisator');
        sessie.deelnemerId = eigen ? eigen.id : undefined; // AAN-39 gebruikt deze rij
      }
    }

    const impl = handlers[verzoek.actie];
    const ruweData = verzoek.data || {};
    if (verzoek.actie === 'scherm') {
      if (!ALLE_SCHERMEN.includes(ruweData.naam)) throw new ApiFout('ongeldig', 'Veld data.naam: onbekend scherm.');
      ctx.scherm = ruweData.naam;
    }
    const data = impl && impl.schema ? valideer(impl.schema, ruweData) : ruweData;
    const h = { store, sessie, editie, editieId, data, ctx, deps };
    if (impl && impl.context) Object.assign(ctx, impl.context(h));

    const r = reden(sessie.rol, verzoek.actie, ctx);
    if (r) throw new ApiFout(r);
    if (!impl) throw new ApiFout('ongeldig', 'Deze actie bestaat nog niet.');

    const uit = impl.uitvoeren(h);
    if (def.schrijft) {
      // NFR-16: alleen actie, wie en editie; geen vrije tekst of geheimen.
      store.voegToe('Log', { tijd: nu().toISOString(), actie: verzoek.actie, wie: sessie.subjectId || 'gast', editieId: editieId || '', detail: '' });
      store.flush();
    }
    return { ok: true, data: uit === undefined ? {} : uit };
  }

  function verwerk(tekst) {
    try {
      const verzoek = leesVerzoek(tekst);
      if (!ACTIES[verzoek.actie].schrijft) return uitvoeren(verzoek);
      // §7.16.1: slot pakken, lezen, rechten en versie, valideren, schrijven, flush, vrijgeven.
      if (!lock.tryLock(SLOT_WACHTTIJD_MS)) throw new ApiFout('druk');
      try {
        return uitvoeren(verzoek);
      } finally {
        lock.releaseLock();
      }
    } catch (e) {
      if (e instanceof ApiFout) return foutAntwoord(e.code, e.melding, e.data);
      logFout(e);
      return foutAntwoord('fout');
    }
  }

  return {
    verwerk,
    verwerkGet: () => verwerk(JSON.stringify({ actie: 'status' })),
  };
}
