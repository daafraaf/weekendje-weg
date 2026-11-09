// Groep opzetten met een setupcode en de acties van het Sheet-menu (spec §7.1.9, §7.1.10, GRP-1 t/m GRP-4).
// Het menu zelf staat in src/server/gas/menu.js; de logica hier is puur tegen Store en deps.
//   deps.eigenschappen: { lees(sleutel) -> string|null, zet(sleutel, tekst), wis(sleutel) }  (PropertiesService)
import { ApiFout } from '../fouten.js';
import { v } from '../validatie.js';
import { API_VERSIE } from '../api.js';
import { hashToken, hashGeheim, gelijk, maakToken, maakSalt } from '../crypto.js';
import { MIN_WACHTWOORD, startBeheerSessie } from './beheertoegang.js';
import { resetPogingen } from './toegang.js';

// AAN-28: acht tekens, eenmalig, 30 minuten geldig. Alfabet zonder 0, O, 1, I (32 tekens: geen modulo-bias met & 31).
export const SETUPCODE_LENGTE = 8;
export const SETUPCODE_GELDIG_MS = 30 * 60 * 1000;
const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SETUPCODE_SLEUTEL = 'setupcode';

// AAN-20: een groep heeft 2 tot en met 20 leden.
export const MIN_LEDEN = 2;
export const MAX_LEDEN = 20;

export const normaliseerCode = (tekst) => String(tekst ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Maakt een nieuwe setupcode; een eerdere code vervalt. Bewaart alleen de hash en de verlooptijd.
export function setupcodeMaken({ eigenschappen, random, sha256, nu }) {
  const code = random.bytes(SETUPCODE_LENGTE).map((b) => ALFABET[b & 31]).join('');
  const verloopt = new Date(nu().getTime() + SETUPCODE_GELDIG_MS).toISOString();
  eigenschappen.zet(SETUPCODE_SLEUTEL, JSON.stringify({ hash: hashToken(sha256, code), verloopt }));
  return code;
}

export function setupcodeGeldig({ eigenschappen, sha256, nu }, code) {
  let bewaard;
  try { bewaard = JSON.parse(eigenschappen.lees(SETUPCODE_SLEUTEL)); } catch { return false; }
  if (!bewaard || typeof bewaard.hash !== 'string' || !(Date.parse(bewaard.verloopt) > nu().getTime())) return false;
  return gelijk(hashToken(sha256, normaliseerCode(code)), bewaard.hash);
}

export const groepOpgezet = (store) => {
  const groep = store.lees('Groep')[0];
  return Boolean(groep && groep.opgezet);
};

// Maakt een beheerlink voor een lid; met `wachtwoord` meteen ingesteld, anders kiest het lid het bij eerste gebruik.
export function beheerlinkAanmaken({ store, deps }, lidId, wachtwoord) {
  const { sha256, random, nu } = deps;
  const token = maakToken(random);
  const rij = { lidId, tokenHash: hashToken(sha256, token), wachtwoordHash: '', wachtwoordSalt: '', actief: true, gemaakt: nu().toISOString() };
  if (wachtwoord) {
    rij.wachtwoordSalt = maakSalt(random);
    rij.wachtwoordHash = hashGeheim(sha256, wachtwoord, rij.wachtwoordSalt);
  }
  const opgeslagen = store.voegToe('Beheerlinks', rij);
  return { id: opgeslagen.id, token };
}

// Sheet-menu "Beheerlink maken": voor een actief lid. Geeft het token terug (eenmalig zichtbaar, TOE-8).
export function beheerlinkVoorLid(h, lidId) {
  const lid = h.store.vind('Leden', lidId);
  if (!lid || !lid.actief) throw new ApiFout('ongeldig', 'Dit lid bestaat niet of is inactief.');
  return beheerlinkAanmaken(h, lidId).token;
}

// Sheet-menu "Beheerwachtwoord resetten": het wachtwoord wordt leeg, het lid kiest bij eerste gebruik een nieuw wachtwoord.
export function wachtwoordResetten({ store }, beheerlinkId) {
  const bl = store.vind('Beheerlinks', beheerlinkId);
  if (!bl) throw new ApiFout('ongeldig', 'Deze beheerlink bestaat niet.');
  store.werkBij('Beheerlinks', beheerlinkId, { wachtwoordHash: '', wachtwoordSalt: '' });
  for (const s of store.lees('Sessies')) if (s.soort === 'beheer' && s.subjectId === beheerlinkId) store.verwijder('Sessies', s.id);
  resetPogingen(store, bl.tokenHash);
}

const LID = v.object({ voornaam: v.tekst({ min: 1, max: 40 }), woonplaats: v.tekst({ min: 0, max: 60 }) });

export const groepOpzetten = {
  schema: v.object({
    setupcode: v.tekst({ min: 1, max: 40 }),
    groepsnaam: v.tekst({ min: 1, max: 60 }),
    leden: v.lijst(LID, { max: MAX_LEDEN }),
    eigenaar: v.getal({ min: 0, max: MAX_LEDEN - 1 }),
    wachtwoord: v.tekst({ min: MIN_WACHTWOORD, max: 200 }),
  }),
  context({ store, data, deps }) {
    // GRP-3: een opgezette groep wordt nooit nog eens opgezet, ook niet met een geldige setupcode.
    if (groepOpgezet(store)) throw new ApiFout('gesloten', 'Deze groep is al opgezet.');
    return { setupcodeGeldig: setupcodeGeldig(deps, data.setupcode) };
  },
  uitvoeren(h) {
    const { store, data, deps } = h;
    const leden = data.leden.map((l) => ({ voornaam: l.voornaam.trim(), woonplaats: l.woonplaats.trim() }));
    if (leden.length < MIN_LEDEN || leden.length > MAX_LEDEN) throw new ApiFout('ongeldig', `Een groep heeft ${MIN_LEDEN} tot en met ${MAX_LEDEN} leden.`);
    if (leden.some((l) => !l.voornaam)) throw new ApiFout('ongeldig', 'Elk lid heeft een voornaam.');
    if (data.eigenaar >= leden.length) throw new ApiFout('ongeldig', 'Kies welk lid de eigenaar is.');
    const naam = data.groepsnaam.trim();
    if (!naam) throw new ApiFout('ongeldig', 'De groep heeft een naam nodig.');

    const groep = { naam, apiVersie: API_VERSIE, opgezet: true, aangemaakt: deps.nu().toISOString() };
    if (store.lees('Groep').length) store.werkBij('Groep', '', groep); else store.voegToe('Groep', groep);
    const ids = leden.map((l) => store.voegToe('Leden', { ...l, actief: true }).id);
    const bl = beheerlinkAanmaken(h, ids[data.eigenaar], data.wachtwoord);
    deps.eigenschappen.wis(SETUPCODE_SLEUTEL); // eenmalig
    // AAN-43: de eigenaar is na het opzetten meteen ingelogd, zodat de wizard op het beheerscherm eindigt.
    return { beheertoken: bl.token, ...startBeheerSessie(h, bl.id) };
  },
};

export const opzetHandlers = { groepOpzetten };
