// Demodata voor de nepbackend en de tests: groep, leden en deelnemers uit test/fixtures/demo.json.
// De fixture bewaart de klare tokens en pincodes; hier worden ze gehasht zoals het script dat doet.
import { readFileSync } from 'node:fs';
import { hashToken, hashGeheim, maakSalt } from '../../src/server/crypto.js';
import { nodeSha256, nodeRandom } from './memorystore.mjs';
import { startItems } from '../../src/server/acties/items.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url), 'utf8'));
export const DEMO_EDITIE_ID = 'demo-editie-2027';

// opties.blokkades: aantal blokkades dat de organisator (eerste deelnemer) al heeft gehad.
// opties.antwoorden: de demoantwoorden uit de fixture (Anna vult niets in); `npm run mock` zet ze aan.
// opties.stap: de stap van de demo-editie.
// opties.posten: twee demoposten uit de fixture (Eva boodschappen, Bram kanoverhuur).
// opties.afrekening: daarbovenop het huisje (Eva, gelijk over vier), één betaalde betaling (Bram aan Eva)
// en Chris afgehaakt met zijn aandeel in het huisje (spec §11, stap afrekenen).
export function maakDemo({ blokkades = 0, antwoorden = false, stap = 'invullen', posten = false, afrekening = false, items = false } = {}) {
  const ingevuld = new Map(antwoorden ? fixture.antwoorden.map((a) => [a.deelnemerId, a.ingevuldOp]) : []);
  const deelnemers = fixture.deelnemers.map((d) => {
    const pinSalt = maakSalt(nodeRandom);
    return {
      id: d.id, editieId: DEMO_EDITIE_ID, lidId: d.lidId, rol: d.rol,
      tokenHash: hashToken(nodeSha256, d.token), pinSalt, pinHash: hashGeheim(nodeSha256, d.pin, pinSalt),
      afgehaakt: false, ingevuld: ingevuld.has(d.id), ingevuldOp: ingevuld.get(d.id) || '',
    };
  });
  const seed = {
    Groep: [fixture.groep],
    Leden: fixture.leden,
    // Een minimale editie, zodat sessies van deze deelnemers door de API worden herkend.
    Edities: [{
      id: DEMO_EDITIE_ID, jaar: 2027, titel: 'Weekendje weg 2027', stap, stapData: fixture.stapData, versie: 1, bijgewerkt: fixture.groep.aangemaakt,
      periodeVan: '2027-01-01', periodeTot: '2027-12-31', voorkeursmaanden: [4, 5, 9, 10], deadline: '2099-01-01T23:59:00+01:00',
      blokken: { etenDrinken: true, activiteiten: true, programma: true, samenwerken: false }, lijsten: {},
      vastgelegdWeekend: '', deelvorm: 'info', geboektAccommodatieId: '',
    }],
    Deelnemers: deelnemers,
  };
  if (antwoorden) {
    seed.Antwoorden = fixture.antwoorden.map((a) => ({ id: a.id, editieId: DEMO_EDITIE_ID, deelnemerId: a.deelnemerId, data: a.data, versie: 1, bijgewerkt: a.ingevuldOp }));
  }
  const alsPost = (p) => ({ ...p, editieId: DEMO_EDITIE_ID, aangepastDoorOrganisator: false, versie: 1, bijgewerkt: fixture.groep.aangemaakt });
  if (posten || afrekening) seed.Posten = fixture.posten.map(alsPost);
  if (afrekening) {
    seed.Posten.push(...fixture.afrekening.posten.map(alsPost));
    seed.Betalingen = fixture.afrekening.betalingen.map((b) => ({ ...b, editieId: DEMO_EDITIE_ID }));
    for (const d of deelnemers) if (d.id === fixture.afrekening.afgehaakt) d.afgehaakt = true;
  }
  // opties.items: de startlijst keuken en spullen als items (§7.7.2), zoals een nieuwe editie ze krijgt.
  if (items) seed.Items = startItems({}).map((i, n) => ({ id: `itm${String(n).padStart(13, '0')}`, editieId: DEMO_EDITIE_ID, ...i, maaltijdId: '', toegevoegdDoor: '', afgevinkt: false, versie: 1 }));
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
