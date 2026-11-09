// Inloggen van een beheerlink en het kiezen van het eerste wachtwoord (spec §7.1.10, TOE-5).
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { hashToken, hashGeheim, gelijk, maakToken, maakSalt } from '../crypto.js';
import { MAX_FOUT, BLOKKADE_MS } from './toegang.js';

// AAN-02: een beheersessie is 12 uur geldig (TOE-5).
export const SESSIE_BEHEER_MS = 12 * 60 * 60 * 1000;
export const MIN_WACHTWOORD = 10;

const TOKEN = v.tekst({ min: 22, max: 22, patroon: /^[A-Za-z0-9_-]{22}$/ });

// Maakt een beheersessie voor een beheerlink en ruimt verlopen sessies op (§7.1.6).
export function startBeheerSessie({ store, deps }, beheerlinkId) {
  const { sha256, random, nu } = deps;
  const nuMs = nu().getTime();
  for (const s of store.lees('Sessies')) if (!(Date.parse(s.verloopt) > nuMs)) store.verwijder('Sessies', s.id);
  const sessie = maakToken(random);
  const verloopt = new Date(nuMs + SESSIE_BEHEER_MS).toISOString();
  store.voegToe('Sessies', { tokenHash: hashToken(sha256, sessie), soort: 'beheer', subjectId: beheerlinkId, verloopt });
  return { sessie, soort: 'beheer', verloopt, editieId: '' };
}

function beheerlinkVanToken(store, sha256, token) {
  const hash = hashToken(sha256, token);
  const bl = store.lees('Beheerlinks').find((r) => r.tokenHash === hash);
  return { hash, bl: bl && bl.actief ? bl : null };
}

export const inloggenBeheer = {
  schema: v.object({ token: TOKEN, wachtwoord: v.tekst({ min: 0, max: 200 }) }),
  uitvoeren(h) {
    const { store, data, deps } = h;
    const { sha256, nu } = deps;
    const nuMs = nu().getTime();
    const { hash, bl } = beheerlinkVanToken(store, sha256, data.token);
    // Een onbekende of ingetrokken beheerlink geeft hetzelfde antwoord als een fout wachtwoord zonder details.
    if (!bl) throw new ApiFout('geen_toegang');
    // De voorkant vraagt zo welk scherm hoort: eerste wachtwoord kiezen of inloggen.
    if (!bl.wachtwoordHash) throw new ApiFout('geen_toegang', 'Kies eerst een wachtwoord.', { wachtwoordInstellen: true });

    const p = store.vind('Pogingen', hash);
    if (p && p.geblokkeerdTot && Date.parse(p.geblokkeerdTot) > nuMs) throw new ApiFout('geblokkeerd', undefined, { tot: p.geblokkeerdTot });
    if (data.wachtwoord === '') throw new ApiFout('geen_toegang', 'Vul je wachtwoord in.');

    if (!gelijk(hashGeheim(sha256, data.wachtwoord, bl.wachtwoordSalt), bl.wachtwoordHash)) {
      // AAN-44: dezelfde teller als bij de pincode (vijf fouten, 15 minuten), zonder blijvende blokkade.
      const fout = (p ? p.fout : 0) + 1;
      const blokkade = fout >= MAX_FOUT;
      const rij = { sleutel: hash, fout: blokkade ? 0 : fout, geblokkeerdTot: blokkade ? new Date(nuMs + BLOKKADE_MS).toISOString() : '', blokkades: (p ? p.blokkades : 0) + (blokkade ? 1 : 0) };
      if (p) store.werkBij('Pogingen', hash, rij); else store.voegToe('Pogingen', rij);
      store.flush(); // de teller blijft ook bewaard als dit verzoek met een fout eindigt
      if (blokkade) throw new ApiFout('geblokkeerd', undefined, { tot: rij.geblokkeerdTot });
      throw new ApiFout('geen_toegang', 'Dit wachtwoord klopt niet.', { resterend: MAX_FOUT - fout });
    }
    if (p && (p.fout || p.geblokkeerdTot)) store.werkBij('Pogingen', hash, { fout: 0, geblokkeerdTot: '' });
    return startBeheerSessie(h, bl.id);
  },
};

export const wachtwoordInstellen = {
  schema: v.object({ token: TOKEN, nieuw: v.tekst({ min: MIN_WACHTWOORD, max: 200 }) }),
  uitvoeren(h) {
    const { store, data, deps } = h;
    const { bl } = beheerlinkVanToken(store, deps.sha256, data.token);
    // Alleen zolang het wachtwoord nog leeg is; een tweede keer gaat via het Sheet-menu (reset).
    if (!bl || bl.wachtwoordHash) throw new ApiFout('geen_toegang');
    const wachtwoordSalt = maakSalt(deps.random);
    store.werkBij('Beheerlinks', bl.id, { wachtwoordSalt, wachtwoordHash: hashGeheim(deps.sha256, data.nieuw, wachtwoordSalt) });
    return startBeheerSessie(h, bl.id);
  },
};

export const beheertoegangHandlers = { inloggenBeheer, wachtwoordInstellen };
