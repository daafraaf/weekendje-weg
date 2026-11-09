// Inloggen en uitloggen van deelnemers (spec §7.1, TOE-1 t/m TOE-4, TOE-9).
// Link en pincode worden hier gecontroleerd; de rechtenlaag laat deze acties altijd door.
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { hashToken, hashGeheim, gelijk, maakToken } from '../crypto.js';

// AAN-01: vijf foute pogingen blokkeren het token 15 minuten; na drie blokkades is de pincode ongeldig.
export const MAX_FOUT = 5;
export const BLOKKADE_MS = 15 * 60 * 1000;
export const MAX_BLOKKADES = 3;
// AAN-02: een deelnemerssessie is 60 dagen geldig (beheer 12 uur, volgt met de beheerlogin).
export const SESSIE_DEELNEMER_MS = 60 * 24 * 60 * 60 * 1000;

const MELDING_ONGELDIG = 'De pincode werkt niet meer. Vraag je organisator om een nieuwe pincode.';

// TOE-4: een nieuwe pincode of link zet de teller van dat token op nul.
export function resetPogingen(store, tokenHash) {
  if (store.vind('Pogingen', tokenHash)) store.werkBij('Pogingen', tokenHash, { fout: 0, geblokkeerdTot: '', blokkades: 0 });
}

function blokkadeFout(p, nuMs) {
  if (p.blokkades >= MAX_BLOKKADES) return new ApiFout('geblokkeerd', MELDING_ONGELDIG, { nieuwePincodeNodig: true });
  if (p.geblokkeerdTot && Date.parse(p.geblokkeerdTot) > nuMs) return new ApiFout('geblokkeerd', undefined, { tot: p.geblokkeerdTot });
  return null;
}

export const inloggenDeelnemer = {
  schema: v.object({
    token: v.tekst({ min: 22, max: 22, patroon: /^[A-Za-z0-9_-]{22}$/ }),
    pin: v.tekst({ min: 6, max: 6, patroon: /^[0-9]{6}$/ }),
  }),
  uitvoeren({ store, data, deps }) {
    const { sha256, random, nu } = deps;
    const nuMs = nu().getTime();
    const hash = hashToken(sha256, data.token);
    // TOE-1: een onbekend token of een rij zonder pincode krijgt hetzelfde antwoord, zonder naam of editie.
    const d = store.lees('Deelnemers').find((r) => r.tokenHash === hash);
    if (!d || !d.pinHash) throw new ApiFout('geen_toegang');

    const p = store.vind('Pogingen', hash);
    const geblokkeerd = p && blokkadeFout(p, nuMs);
    if (geblokkeerd) throw geblokkeerd; // ook met de juiste pincode: raden tijdens de blokkade levert niets op

    if (!gelijk(hashGeheim(sha256, data.pin, d.pinSalt), d.pinHash)) {
      const fout = (p ? p.fout : 0) + 1;
      const rij = { sleutel: hash, fout, geblokkeerdTot: '', blokkades: p ? p.blokkades : 0 };
      if (fout >= MAX_FOUT) Object.assign(rij, { fout: 0, geblokkeerdTot: new Date(nuMs + BLOKKADE_MS).toISOString(), blokkades: rij.blokkades + 1 });
      if (p) store.werkBij('Pogingen', hash, rij); else store.voegToe('Pogingen', rij);
      store.flush(); // de teller moet ook bewaard blijven als dit verzoek met een fout eindigt
      if (fout >= MAX_FOUT) throw blokkadeFout(rij, nuMs);
      throw new ApiFout('geen_toegang', 'Deze pincode klopt niet.', { resterend: MAX_FOUT - fout });
    }

    if (p && (p.fout || p.geblokkeerdTot)) store.werkBij('Pogingen', hash, { fout: 0, geblokkeerdTot: '' });
    // Verlopen sessies opruimen bij elke login (§7.1.6).
    for (const s of store.lees('Sessies')) if (!(Date.parse(s.verloopt) > nuMs)) store.verwijder('Sessies', s.id);
    const sessie = maakToken(random);
    const verloopt = new Date(nuMs + SESSIE_DEELNEMER_MS).toISOString();
    store.voegToe('Sessies', { tokenHash: hashToken(sha256, sessie), soort: 'deelnemer', subjectId: d.id, verloopt });
    return { sessie, soort: 'deelnemer', verloopt, editieId: d.editieId };
  },
};

// TOE-9: de sessie verdwijnt uit de Sheet; de voorkant wist zijn eigen kopie.
export const uitloggen = {
  uitvoeren({ store, sessie }) {
    store.verwijder('Sessies', sessie.sessieId);
  },
};

export const toegangHandlers = { inloggenDeelnemer, uitloggen };
