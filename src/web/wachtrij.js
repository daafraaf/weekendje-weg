// Schrijfwachtrij voor kleine handelingen (SYNC-1 t/m SYNC-7, spec §7.16.5). Een scherm zet een actie in de
// wachtrij en past haar zelf lokaal toe (stand.js); de wachtrij bundelt na een korte stilte alles tot één
// aanroep `bundel`, bewaart wat nog niet bevestigd is in localStorage en probeert het bij een fout opnieuw.
// Pure module: opslag, verzenden, timers en verbinding worden meegegeven, zodat Node hem kan testen.
import { DEBOUNCE_MS, WACHTTIJDEN_MS, BUNDEL_MAX, BUNDEL_ACTIES } from '../shared/synchronisatie.js';
import { leesbareMelding } from './foutteksten.js';

export const WACHTRIJ_SLEUTEL = 'ww-wachtrij';
export const SYNC_TEKST = {
  bezig: 'Opslaan…',
  opgeslagen: 'Opgeslagen',
  fout: 'Niet opgeslagen, opnieuw proberen',
};
export const TERUG_TEKST = 'Niet opgeslagen. Je wijziging is teruggezet.';

// Fouten van de hele bundel waarbij opnieuw proberen zinloos is: de wijziging gaat terug.
const BLIJVEND = new Set(['geen_toegang', 'api_versie', 'gesloten', 'ongeldig', 'gewijzigd', 'geblokkeerd']);

// Een actie uit de opslag wordt alleen teruggezet als ze de vorm heeft die de wachtrij zelf schreef.
function geldig(a) {
  return Boolean(a) && typeof a === 'object' && BUNDEL_ACTIES.includes(a.actie) && Boolean(a.data) && typeof a.data === 'object'
    && typeof a.sleutel === 'string' && typeof (a.editieId ?? '') === 'string';
}

// opslag: localStorage of een nabootsing. eigenaar(): wie de wachtrij nu gebruikt, bijvoorbeeld
// "<scriptId>:<soort>:<editieId>" zonder geheimen; elke eigenaar heeft zijn eigen sleutel.
// verstuur(acties, editieId) geeft { uitslagen } of gooit een fout met `code`.
export function maakWachtrij({
  opslag, eigenaar = () => '', verstuur, online = () => true,
  timers = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t) },
  debounceMs = DEBOUNCE_MS, wachttijden = WACHTTIJDEN_MS, max = BUNDEL_MAX,
} = {}) {
  let acties = []; // { id, actie, data, sleutel, editieId, onderweg }
  let mislukt = []; // teruggedraaide acties, voor de knop Opnieuw
  let melding = '';
  let status = 'rust'; // rust | bezig | opgeslagen | fout
  let poging = 0;
  let timer = null;
  let lopend = null; // het verzenden dat nu loopt
  let teller = 0;
  let sleutel = '';
  const luisteraars = new Set();

  const kopie = (a) => ({ id: a.id, actie: a.actie, data: a.data, sleutel: a.sleutel, editieId: a.editieId });
  const meld = (soort, extra = {}) => { for (const f of [...luisteraars]) f({ soort, status, melding: mislukt.length ? melding : '', mislukt: mislukt.length, ...extra }); };
  const zetStatus = (s) => { status = s; meld('status'); };

  // SYNC-3: localStorage altijd in try/catch; zonder opslag werkt de wachtrij alleen in het geheugen.
  function bewaar() {
    if (!sleutel) return;
    try {
      if (acties.length) opslag.setItem(sleutel, JSON.stringify(acties.map((a) => ({ actie: a.actie, data: a.data, sleutel: a.sleutel, editieId: a.editieId }))));
      else opslag.removeItem(sleutel);
    } catch { /* volle of geblokkeerde opslag: de wachtrij blijft in het geheugen */ }
  }

  function plan(ms) {
    if (timer) timers.clearTimeout(timer);
    timer = timers.setTimeout(() => { timer = null; verstuurNu(); }, ms);
  }

  function voegToe(a) {
    // SYNC-2: een nieuwere handeling op hetzelfde item of veld vervangt de vorige die nog niet onderweg is.
    acties = acties.filter((x) => x.onderweg || x.sleutel !== a.sleutel || x.editieId !== (a.editieId || ''));
    acties.push({ id: ++teller, actie: a.actie, data: a.data, sleutel: a.sleutel, editieId: a.editieId || '', onderweg: false, hersteld: Boolean(a.hersteld) });
  }

  function terugdraaien(lijst, tekst) {
    const ids = new Set(lijst.map((a) => a.id));
    acties = acties.filter((a) => !ids.has(a.id));
    mislukt.push(...lijst.map(kopie));
    melding = tekst ? `${TERUG_TEKST} ${tekst}` : TERUG_TEKST;
    bewaar();
    meld('teruggedraaid', { acties: lijst.map(kopie) });
  }

  // SYNC-5, BV-24: weigert het script een handeling die uit de opslag van een vorige keer kwam, dan valt ze
  // stil weg. Na herladen is er niets terug te zetten en Opnieuw zou dezelfde weigering geven.
  function weigeren(lijst, tekst) {
    const oud = lijst.filter((a) => a.hersteld);
    const nieuw = lijst.filter((a) => !a.hersteld);
    if (oud.length) {
      const ids = new Set(oud.map((a) => a.id));
      acties = acties.filter((a) => !ids.has(a.id));
      bewaar();
      meld('teruggedraaid', { acties: oud.map(kopie) });
    }
    if (nieuw.length) terugdraaien(nieuw, tekst);
  }

  async function stuur() {
    if (!acties.length) { if (status === 'bezig') zetStatus('opgeslagen'); return; }
    if (!online()) { zetStatus('fout'); return; } // NFR-12: wacht op de verbinding; de schil roept nu() bij `online`
    const editieId = acties[0].editieId;
    const pakket = acties.filter((a) => a.editieId === editieId).slice(0, max);
    for (const a of pakket) a.onderweg = true;
    if (status !== 'fout') zetStatus('bezig');
    let antwoord = null;
    let fout = null;
    try { antwoord = await verstuur(pakket.map((a) => ({ actie: a.actie, data: a.data })), editieId); } catch (e) { fout = e || { code: 'fout' }; }
    for (const a of pakket) a.onderweg = false;

    if (fout) {
      if (fout.code === 'verlopen') { zetStatus('fout'); return; } // bewaard; na opnieuw inloggen gaat het alsnog
      if (BLIJVEND.has(fout.code)) {
        poging = 0;
        weigeren(pakket, fout.message || '');
        if (acties.length) { zetStatus('bezig'); plan(0); } else zetStatus('rust');
        return;
      }
      // SYNC-5: opnieuw proberen met oplopende wachttijd, daarna terugdraaien met melding.
      if (poging < wachttijden.length) { plan(wachttijden[poging]); poging += 1; zetStatus('fout'); return; }
      poging = 0;
      terugdraaien(pakket, '');
      if (acties.length) { plan(wachttijden[0]); zetStatus('fout'); } else zetStatus('rust');
      return;
    }

    poging = 0;
    const uitslagen = antwoord && Array.isArray(antwoord.uitslagen) ? antwoord.uitslagen : [];
    const goed = [];
    const afgewezen = [];
    pakket.forEach((a, i) => (uitslagen[i] && uitslagen[i].ok ? goed : afgewezen).push({ a, u: uitslagen[i] || { ok: false, fout: 'fout' } }));
    const klaar = new Set(goed.map((x) => x.a.id));
    acties = acties.filter((a) => !klaar.has(a.id));
    bewaar();
    if (goed.length) meld('bevestigd', { acties: goed.map((x) => ({ ...kopie(x.a), uitslag: x.u.data })) });
    if (afgewezen.length) {
      const eerste = afgewezen.find((x) => x.u.melding);
      weigeren(afgewezen.map((x) => x.a), eerste ? leesbareMelding(eerste.u.fout, eerste.u.melding, eerste.a.actie) : ''); // NFR-21
    }
    if (acties.length) {
      zetStatus('bezig');
      // Wat tijdens het verzenden bijkwam, wacht zijn eigen stilte af; een andere editie of een volle bundel gaat meteen.
      plan(acties.length >= max || acties[0].editieId !== editieId ? 0 : debounceMs);
      return;
    }
    zetStatus(afgewezen.length ? 'rust' : 'opgeslagen');
  }

  function verstuurNu() {
    if (timer) { timers.clearTimeout(timer); timer = null; }
    if (lopend) return lopend;
    lopend = stuur().finally(() => { lopend = null; });
    return lopend;
  }

  return {
    // Laadt de bewaarde wachtrij van de huidige eigenaar en verstuurt hem (SYNC-3: bij openen alsnog versturen).
    start() {
      const nieuw = eigenaar() ? `${WACHTRIJ_SLEUTEL}:${eigenaar()}` : '';
      if (nieuw === sleutel) return;
      if (timer) { timers.clearTimeout(timer); timer = null; }
      sleutel = nieuw;
      acties = [];
      mislukt = [];
      melding = '';
      poging = 0;
      if (sleutel) {
        let ruw = null;
        try { ruw = JSON.parse(opslag.getItem(sleutel)); } catch { ruw = null; }
        if (Array.isArray(ruw)) for (const a of ruw.filter(geldig)) voegToe({ ...a, hersteld: true });
      }
      status = 'rust';
      meld('gezet');
      if (acties.length) { zetStatus('bezig'); plan(0); }
    },

    // SYNC-1: zet een kleine handeling klaar; het scherm heeft haar al lokaal toegepast.
    zet({ actie, data = {}, sleutel: s, editieId = '' }) {
      if (!BUNDEL_ACTIES.includes(actie)) throw new Error(`${actie} hoort niet in de wachtrij`);
      voegToe({ actie, data, sleutel: s || `${actie}:${JSON.stringify(data)}`, editieId });
      bewaar();
      meld('gezet');
      if (status === 'fout' && timer) return; // tijdens het opnieuw proberen blijft de wachttijd staan
      if (!lopend) zetStatus('bezig');
      if (!lopend) plan(debounceMs);
    },

    // De acties die nog niet bevestigd zijn, in volgorde; een scherm past ze toe op wat de Sheet gaf.
    open: (filter = () => true) => acties.filter((a) => filter(a)).map(kopie),
    aantal: () => acties.length,
    status: () => status,
    melding: () => (mislukt.length ? melding : ''),
    nu: verstuurNu,

    // SYNC-5: de knop Opnieuw zet de teruggedraaide handelingen terug in de wachtrij.
    opnieuw() {
      const terug = mislukt;
      mislukt = [];
      melding = '';
      for (const a of terug) if (!acties.some((x) => x.sleutel === a.sleutel && x.editieId === a.editieId)) voegToe(a);
      bewaar();
      poging = 0;
      meld('opnieuw');
      zetStatus('bezig');
      return verstuurNu();
    },
    sluitMelding() { mislukt = []; melding = ''; meld('status'); },

    // fn({ soort, status, melding, mislukt, acties? }); soort: gezet, bevestigd, teruggedraaid, opnieuw, status.
    bij(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); },
  };
}
