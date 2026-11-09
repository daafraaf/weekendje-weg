// Demodata voor de nepbackend en de tests: groep, leden en deelnemers uit test/fixtures/demo.json.
// De fixture bewaart de klare tokens en pincodes; hier worden ze gehasht zoals het script dat doet.
import { readFileSync } from 'node:fs';
import { hashToken, hashGeheim, maakSalt } from '../../src/server/crypto.js';
import { nodeSha256, nodeRandom } from './memorystore.mjs';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url), 'utf8'));
export const DEMO_EDITIE_ID = 'demo-editie-2027';

// opties.blokkades: aantal blokkades dat de organisator (eerste deelnemer) al heeft gehad.
export function maakDemo({ blokkades = 0 } = {}) {
  const deelnemers = fixture.deelnemers.map((d) => {
    const pinSalt = maakSalt(nodeRandom);
    return {
      id: d.id, editieId: DEMO_EDITIE_ID, lidId: d.lidId, rol: d.rol,
      tokenHash: hashToken(nodeSha256, d.token), pinSalt, pinHash: hashGeheim(nodeSha256, d.pin, pinSalt),
    };
  });
  const seed = {
    Groep: [fixture.groep],
    Leden: fixture.leden,
    // Een minimale editie, zodat sessies van deze deelnemers door de API worden herkend.
    Edities: [{ id: DEMO_EDITIE_ID, jaar: 2027, titel: 'Weekendje weg 2027', stap: 'invullen', versie: 1, bijgewerkt: fixture.groep.aangemaakt }],
    Deelnemers: deelnemers,
  };
  if (blokkades) seed.Pogingen = [{ sleutel: deelnemers[0].tokenHash, fout: 0, geblokkeerdTot: '', blokkades }];
  const fragment = (i) => `#b=${fixture.scriptId}&t=${fixture.deelnemers[i].token}`;
  return {
    seed,
    scriptId: fixture.scriptId,
    pin: fixture.deelnemers[0].pin,
    namen: fixture.leden.map((l) => l.voornaam),
    tokens: fixture.deelnemers.map((d) => d.token),
    tokenHash: deelnemers.map((d) => d.tokenHash),
    fragment,
  };
}
