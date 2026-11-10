import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { hashToken } from '../../src/server/crypto.js';
import { ONDERDELEN, onderdeelAan } from '../../src/shared/onderdelen.js';
import { eersteActie } from '../../src/shared/start.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const NAMEN = ['boodschappen', 'kookbeurten', 'programma', 'kamers', 'carpool'];
const g = (stap) => ({ editie: { id: 'e1', stap, vastgelegdWeekend: '', deelvorm: 'info', boodschappenDefinitief: false }, voortgang: { aantal: 4, ingevuld: 2 }, programma: { punten: 0 }, afrekening: { open: [] } });

test('OND-1 AAN-80: de vijf onderdelen staan op één plek en standaard uit', () => {
  assert.deepEqual(Object.keys(ONDERDELEN), NAMEN);
  for (const n of NAMEN) assert.equal(onderdeelAan(n), false, n);
  assert.equal(onderdeelAan('onbekend'), false);
});

test('OND-1 OND-2: een vlag aanzetten brengt het onderdeel terug in eersteActie', () => {
  assert.equal(eersteActie(g('voorbereiding')).route, '#/stappen');
  assert.equal(eersteActie(g('voorbereiding'), { ...ONDERDELEN, boodschappen: true }).route, '#/boodschappen');
  assert.equal(eersteActie(g('weekend')).route, '#/stappen');
  assert.equal(eersteActie(g('weekend'), { ...ONDERDELEN, programma: true }).route, '#/programma');
});

test('OND-3 FRM-11: voorkeuren eten en doen zonder beschikbaarheid blijven bewaard en staan bij de organisator', () => {
  const demo = maakDemo({ antwoorden: true, stap: 'invullen' });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  const r = vraag({ actie: 'antwoordenOpslaan', sessie: 'anna', data: { versie: 0, data: { activiteiten: ['wandelen'], etenDrinken: ['vegetarisch'], etenDrinkenEigen: ['notenallergie'] } } });
  assert.equal(r.ok, true);
  assert.equal(r.data.ingevuld, false); // geen weekend, dus nog niet ingevuld
  const mijn = vraag({ actie: 'scherm', sessie: 'anna', data: { naam: 'formulier' } }).data.antwoorden.data;
  assert.deepEqual(mijn.activiteiten, ['wandelen']);
  assert.deepEqual(mijn.etenDrinken, ['vegetarisch']);
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, 'duinpan-kraanvogel'), wachtwoord: 'duinpan-kraanvogel' } }).data.sessie;
  const detail = vraag({ actie: 'scherm', sessie: beheer, data: { naam: 'overzicht' } }).data.detail;
  const anna = detail.personen.find((p) => p.voornaam === 'Anna');
  assert.deepEqual(anna.data.etenDrinken, ['vegetarisch']);
});

test('FRM-11 DDL-1: een deelnemer met alleen beschikbaarheid slaat op, ook na de deadline, en telt als ingevuld', () => {
  const demo = maakDemo({ stap: 'invullen' });
  const nep = maakNepApi({ seed: demo.seed, nu: () => new Date('2099-01-01T10:00:00Z') });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'anna'), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2100-01-01T00:00:00.000Z' });
  nep.store.flush();
  const r = vraag({ actie: 'antwoordenOpslaan', sessie: 'anna', data: { versie: 0, data: { beschikbaarheid: { '2027-04-09': 'ja' } } } });
  assert.equal(r.ok, true);
  assert.equal(r.data.ingevuld, true);
  assert.deepEqual(r.data.ontbreekt, []);
});
