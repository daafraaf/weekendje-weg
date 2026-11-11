// Fase 32: weekend en stappen (ACC-1, ACC-7, EDI-7, GELD-9, AAN-05, AAN-29, AAN-81, AAN-88; BV-01, BV-25, BV-26).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_VERSIE } from '../../src/server/api.js';
import { stapMogelijk, vorigeStap, stapWaarschuwingen, stapVraag } from '../../src/shared/stappen.js';
import { stapTekst } from '../../src/shared/whatsapp.js';
import { maakNepApi } from '../mock-backend/server.mjs';
import { maakDemo, DEMO_EDITIE_ID } from '../mock-backend/demo.mjs';

const WACHTWOORD = 'duinpan-kraanvogel';

function opzet(opties) {
  const demo = maakDemo({ antwoorden: true, ...opties });
  const nep = maakNepApi({ seed: demo.seed });
  const vraag = (verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: API_VERSIE, editieId: DEMO_EDITIE_ID, ...verzoek }));
  const beheer = vraag({ actie: 'inloggenBeheer', data: { token: nep.beheerlink(demo.seed.Leden[0].id, WACHTWOORD), wachtwoord: WACHTWOORD } }).data.sessie;
  const org = (actie, data) => vraag({ actie, sessie: beheer, data });
  const editie = () => { nep.store.nieuwVerzoek(); return nep.store.vind('Edities', DEMO_EDITIE_ID); };
  const zetStap = (stap) => { const e = editie(); nep.store.werkBij('Edities', e.id, { stap }, e.versie); nep.store.flush(); };
  return { nep, org, editie, zetStap };
}

test('ACC-7 AAN-81 BV-01: losmaken lukt in Meenemen, vanaf Weekend geeft het gesloten', () => {
  const { org, editie, zetStap } = opzet({ stap: 'overzicht' });
  const scherm = () => org('scherm', { naam: 'accommodaties' }).data;
  assert.equal(org('weekendVastleggen', { vrijdag: scherm().top[0].vrijdag }).ok, true);
  zetStap('voorbereiding');
  assert.equal(scherm().losmakenMogelijk, true);
  assert.equal(org('weekendLosmaken', {}).ok, true);
  assert.equal(editie().vastgelegdWeekend, '');
  assert.equal(org('weekendVastleggen', { vrijdag: scherm().top[1].vrijdag }).ok, true);
  zetStap('weekend');
  assert.equal(scherm().losmakenMogelijk, false);
  assert.equal(org('weekendLosmaken', {}).fout, 'gesloten');
  assert.notEqual(editie().vastgelegdWeekend, '');
});

test('EDI-7 AAN-05 BV-25: van Afgerond kan de organisator één stap terug naar Afrekening', () => {
  assert.ok(stapMogelijk('afgerond', 'afrekenen'));
  assert.equal(vorigeStap('afgerond'), 'afrekenen');
  const { org, editie } = opzet({ stap: 'afgerond', afrekening: true });
  assert.equal(org('stapZetten', { stap: 'afrekenen' }).ok, true);
  assert.equal(editie().stap, 'afrekenen');
});

test('GELD-9 AAN-29 BV-25: na Afgerond kan een open betaling nog worden afgevinkt en teruggedraaid, de rest blijft dicht', () => {
  const { org } = opzet({ stap: 'afgerond', afrekening: true });
  const scherm = () => org('scherm', { naam: 'afrekening' }).data;
  const voor = scherm();
  assert.ok(voor.open.length > 0);
  assert.ok(voor.open.every((b) => b.magMarkeren));
  const b = voor.open[0];
  assert.equal(org('betalingMarkeren', { vanId: b.vanId, naarId: b.naarId, bedrag: b.bedrag }).ok, true);
  const na = scherm();
  assert.equal(na.open.length, voor.open.length - 1);
  const gedaan = na.betaald.find((x) => x.vanId === b.vanId && x.naarId === b.naarId);
  assert.ok(gedaan.magTerugdraaien);
  assert.equal(org('betalingTerugdraaien', { id: gedaan.id }).ok, true);
  // Een post toevoegen na Afgerond kan niet.
  assert.equal(org('postOpslaan', { soort: 'uitgave', omschrijving: 'Te laat', bedrag: 100, betalerId: b.vanId, datum: '2027-06-13', categorie: 'overig', verdeling: { wijze: 'gelijk', deelnemers: [b.vanId] } }).fout, 'gesloten');
});

test('EDI-7 AAN-88 BV-26: stapWaarschuwingen geeft de drie redenen en één bevestiging', () => {
  assert.deepEqual(stapWaarschuwingen({ van: 'invullen', naar: 'overzicht', nogNiet: ['Robin'] }), ['Robin heeft nog niet ingevuld.']);
  assert.deepEqual(stapWaarschuwingen({ van: 'invullen', naar: 'overzicht', nogNiet: ['Robin', 'Sam'] }), ['Robin en Sam hebben nog niet ingevuld.']);
  assert.deepEqual(stapWaarschuwingen({ van: 'invullen', naar: 'overzicht', nogNiet: ['Robin', 'Sam', 'Tess'] }), ['3 mensen hebben nog niet ingevuld.']);
  assert.deepEqual(stapWaarschuwingen({ van: 'invullen', naar: 'overzicht', nogNiet: [] }), []);
  const ver = { vastgelegdWeekend: '2028-06-09', vandaag: '2026-11-11' };
  for (const [van, naar] of [['voorbereiding', 'weekend'], ['weekend', 'afrekenen']]) {
    assert.deepEqual(stapWaarschuwingen({ van, naar, ...ver }), ['Het weekend is pas over 576 dagen.'], naar);
  }
  assert.deepEqual(stapWaarschuwingen({ van: 'voorbereiding', naar: 'weekend', vastgelegdWeekend: '2026-11-18', vandaag: '2026-11-11' }), []); // 7 dagen
  assert.deepEqual(stapWaarschuwingen({ van: 'voorbereiding', naar: 'weekend', vastgelegdWeekend: '', vandaag: '2026-11-11' }), []); // niets vastgelegd
  // Naar Afgerond: beide redenen in één bevestiging.
  assert.deepEqual(stapWaarschuwingen({ van: 'afrekenen', naar: 'afgerond', ...ver, aantalOpen: 3 }),
    ['Het weekend is pas over 576 dagen.', 'Er staan nog 3 betalingen open. Die kun je na Afgerond nog afvinken.']);
  assert.deepEqual(stapWaarschuwingen({ van: 'afrekenen', naar: 'afgerond', aantalOpen: 1 }), ['Er staat nog 1 betaling open. Die kun je na Afgerond nog afvinken.']);
  // Een stap terug vraagt niets extra.
  assert.deepEqual(stapWaarschuwingen({ van: 'afgerond', naar: 'afrekenen', ...ver, aantalOpen: 3 }), []);
  assert.deepEqual(stapWaarschuwingen({ van: 'overzicht', naar: 'invullen', nogNiet: ['Robin'] }), []);
  assert.equal(stapVraag('afgerond'), 'Toch afronden?');
  assert.equal(stapVraag('overzicht'), 'Toch door?');
});

test('EDI-7 §7.12.4 BV-25: het bericht bij Afgerond zegt alleen afgerekend als er niets meer open staat', () => {
  const open = stapTekst({ editieTitel: 'Weekendje weg 2027', stap: 'afgerond', aantalOpen: 2 });
  assert.doesNotMatch(open, /afgerekend/);
  assert.match(open, /betaling/);
  assert.match(stapTekst({ editieTitel: 'Weekendje weg 2027', stap: 'afgerond', aantalOpen: 0 }), /afgerond en afgerekend/);
});
