// TOE-7: elke rij uit de rechtentabel (spec §6) heeft een test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mag, reden, REGELS, ALLE_SCHERMEN } from '../../src/server/rechten.js';
import { ACTIES } from '../../src/server/api.js';

const ORG = { editieId: 'e1', organisatorVanEditie: true, stap: 'invullen' };
const DN = { editieId: 'e1', stap: 'invullen' };
const R = (rol, actie, c) => reden(rol, actie, c);

function alleenOrganisator(acties, c = {}) {
  for (const a of acties) {
    assert.equal(R('gast', a, {}), 'geen_toegang', `${a} gast`);
    assert.equal(R('deelnemer', a, { ...DN, ...c }), 'geen_toegang', `${a} deelnemer`);
    assert.equal(R('organisator', a, { ...ORG, ...c }), null, `${a} organisator`);
    assert.equal(R('organisator', a, { ...ORG, ...c, organisatorVanEditie: false }), 'geen_toegang', `${a} organisator van een andere editie`);
  }
}

test('TOE-7 §6 status: iedereen, ook zonder sessie', () => {
  for (const rol of ['gast', 'deelnemer', 'organisator']) assert.ok(mag(rol, 'status', {}));
});

test('TOE-7 §6 groep opzetten: alleen zonder sessie met geldige setupcode; eigenaar toont de setupcode', () => {
  assert.ok(mag('gast', 'groepOpzetten', { setupcodeGeldig: true }));
  assert.equal(R('gast', 'groepOpzetten', { setupcodeGeldig: false }), 'geen_toegang');
  assert.ok(!mag('deelnemer', 'groepOpzetten', { ...DN, setupcodeGeldig: true }));
  assert.ok(!mag('organisator', 'groepOpzetten', { setupcodeGeldig: true }));
  assert.ok(mag('eigenaar', 'setupcodeTonen'));
  assert.ok(!mag('organisator', 'setupcodeTonen'));
});

test('TOE-7 §6 eigen antwoorden lezen en wijzigen: tot de deadline en zolang de stap Invullen is', () => {
  for (const rol of ['deelnemer', 'organisator']) {
    const c = rol === 'deelnemer' ? DN : ORG;
    assert.ok(mag(rol, 'antwoordenOpslaan', c));
    assert.equal(R(rol, 'antwoordenOpslaan', { ...c, naDeadline: true }), 'gesloten');
    assert.equal(R(rol, 'antwoordenOpslaan', { ...c, stap: 'overzicht' }), 'gesloten');
    assert.ok(mag(rol, 'scherm', { ...c, scherm: 'formulier' }));
  }
  assert.ok(!mag('gast', 'antwoordenOpslaan', {}));
});

test('TOE-7 §6 voortgang: deelnemer en organisator', () => {
  assert.ok(mag('deelnemer', 'scherm', { ...DN, scherm: 'voortgang' }));
  assert.ok(mag('organisator', 'scherm', { ...ORG, scherm: 'voortgang' }));
  assert.ok(!mag('gast', 'scherm', { scherm: 'voortgang' }));
});

test('TOE-7 §6 overlapoverzicht: deelnemer vanaf stap Overzicht, organisator altijd', () => {
  assert.equal(R('deelnemer', 'scherm', { ...DN, scherm: 'overzicht' }), 'gesloten');
  assert.ok(mag('deelnemer', 'scherm', { ...DN, stap: 'overzicht', scherm: 'overzicht' }));
  assert.ok(mag('deelnemer', 'scherm', { ...DN, stap: 'weekend', scherm: 'overzicht' }));
  assert.ok(mag('organisator', 'scherm', { ...ORG, scherm: 'overzicht' }));
});

test('TOE-7 §6 detailoverzicht per persoon: alleen organisator', () => {
  alleenOrganisator(['overzichtDetail'], { stap: 'overzicht' });
});

test('TOE-7 §6 editie, blokken, vragen, deadline, stappen: alleen organisator', () => {
  alleenOrganisator(['editieBijwerken', 'deelnemersBeheren', 'vragenBeheren', 'stapZetten']);
  assert.ok(mag('organisator', 'editieAanmaken', {}));
  assert.ok(!mag('deelnemer', 'editieAanmaken', DN));
  assert.ok(mag('organisator', 'scherm', { ...ORG, scherm: 'beheer' }));
  assert.ok(!mag('deelnemer', 'scherm', { ...DN, scherm: 'beheer' }));
});

test('TOE-7 §6 leden beheren: alleen organisator', () => {
  assert.ok(mag('organisator', 'ledenBeheren', {}));
  assert.ok(!mag('deelnemer', 'ledenBeheren', DN));
  assert.ok(!mag('gast', 'ledenBeheren', {}));
});

test('TOE-7 §6 links en pincodes maken of vernieuwen: alleen organisator', () => {
  alleenOrganisator(['linksMaken', 'linkVernieuwen', 'pincodeVernieuwen']);
});

test('TOE-7 §6 beheerlink maken voor een lid: organisator en eigenaar (AAN-03)', () => {
  assert.ok(mag('organisator', 'beheerlinkMaken', {}));
  assert.ok(mag('eigenaar', 'beheerlinkMaken', {}));
  assert.ok(!mag('deelnemer', 'beheerlinkMaken', DN));
});

test('TOE-7 §6 wachtwoord van een beheerlink resetten: alleen eigenaar', () => {
  assert.ok(mag('eigenaar', 'wachtwoordResetten'));
  assert.ok(!mag('organisator', 'wachtwoordResetten', ORG));
  assert.ok(!mag('deelnemer', 'wachtwoordResetten', DN));
});

test('TOE-7 §6 accommodaties beheren, datum vastleggen: alleen organisator', () => {
  alleenOrganisator(['weekendVastleggen', 'accommodatieOpslaan', 'accommodatieVerwijderen', 'deelvormZetten'], { stap: 'accommodatie' });
});

test('TOE-7 §6 stemmen: deelnemer als deelvorm stemmen, organisator ja', () => {
  const c = { ...DN, stap: 'accommodatie' };
  assert.ok(mag('deelnemer', 'stemmen', { ...c, deelvorm: 'stemmen' }));
  assert.equal(R('deelnemer', 'stemmen', { ...c, deelvorm: 'info' }), 'gesloten');
  assert.ok(mag('organisator', 'stemmen', { ...ORG, stap: 'accommodatie', deelvorm: 'info' }));
});

test('TOE-7 §6 item toevoegen: deelnemer tot definitief, organisator ja', () => {
  const c = { ...DN, stap: 'voorbereiding', nieuw: true };
  assert.ok(mag('deelnemer', 'itemOpslaan', c));
  assert.equal(R('deelnemer', 'itemOpslaan', { ...c, definitief: true }), 'gesloten');
  assert.ok(mag('organisator', 'itemOpslaan', { ...ORG, stap: 'voorbereiding', nieuw: true, definitief: true }));
});

test('TOE-7 §6 item verwijderen: deelnemer eigen item tot definitief, organisator elk item', () => {
  const c = { ...DN, stap: 'voorbereiding' };
  assert.ok(mag('deelnemer', 'itemVerwijderen', { ...c, eigen: true }));
  assert.equal(R('deelnemer', 'itemVerwijderen', { ...c, eigen: false }), 'geen_toegang');
  assert.equal(R('deelnemer', 'itemVerwijderen', { ...c, eigen: true, definitief: true }), 'gesloten');
  assert.ok(mag('organisator', 'itemVerwijderen', { ...ORG, stap: 'voorbereiding', eigen: false, definitief: true }));
});

test('TOE-7 §6 claimen, eigen claim intrekken: deelnemer en organisator', () => {
  const c = { ...DN, stap: 'voorbereiding' };
  assert.ok(mag('deelnemer', 'claimen', c));
  assert.ok(mag('deelnemer', 'claimIntrekken', { ...c, eigen: true }));
  assert.ok(!mag('deelnemer', 'claimIntrekken', { ...c, eigen: false }));
  assert.ok(mag('organisator', 'claimIntrekken', { ...ORG, stap: 'voorbereiding', eigen: false }));
});

test('TOE-7 §6 afvinken: deelnemer en organisator', () => {
  assert.ok(mag('deelnemer', 'afvinken', DN));
  assert.ok(mag('organisator', 'afvinken', ORG));
  assert.ok(!mag('gast', 'afvinken', {}));
});

test('TOE-7 §6 boodschappen definitief zetten of terugzetten: alleen organisator', () => {
  alleenOrganisator(['boodschappenDefinitief'], { stap: 'voorbereiding' });
});

test('TOE-7 §6 kok worden of stoppen: deelnemer en organisator', () => {
  for (const a of ['kokWorden', 'kokStoppen']) {
    assert.ok(mag('deelnemer', a, DN));
    assert.ok(mag('organisator', a, ORG));
  }
});

test('TOE-7 §6 maaltijden, programma, kamers beheren: alleen organisator', () => {
  alleenOrganisator(['maaltijdOpslaan', 'programmaOpslaan', 'programmaVerwijderen', 'kamersOpslaan', 'kamerIndelen'], { stap: 'voorbereiding' });
});

test('TOE-7 §6 rit aanbieden, meerijden: deelnemer eigen, organisator iedereen', () => {
  for (const a of ['ritOpslaan', 'meerijden', 'meerijdenStoppen']) {
    assert.ok(mag('deelnemer', a, { ...DN, eigen: true }));
    assert.ok(!mag('deelnemer', a, { ...DN, eigen: false }));
    assert.ok(mag('organisator', a, { ...ORG, eigen: false }));
  }
});

test('TOE-7 §6 post toevoegen: deelnemer met kiesbare betaler, organisator ja', () => {
  assert.ok(mag('deelnemer', 'postOpslaan', { ...DN, stap: 'afrekenen', nieuw: true }));
  assert.ok(mag('organisator', 'postOpslaan', { ...ORG, stap: 'afrekenen', nieuw: true }));
});

test('TOE-7 §6 post wijzigen of verwijderen: deelnemer eigen post, organisator elke post', () => {
  const c = { ...DN, stap: 'afrekenen' };
  assert.ok(mag('deelnemer', 'postOpslaan', { ...c, eigen: true }));
  assert.ok(!mag('deelnemer', 'postOpslaan', { ...c, eigen: false }));
  assert.ok(mag('deelnemer', 'postVerwijderen', { ...c, eigen: true }));
  assert.ok(!mag('deelnemer', 'postVerwijderen', { ...c, eigen: false }));
  assert.ok(mag('organisator', 'postOpslaan', { ...ORG, stap: 'afrekenen', eigen: false }));
  assert.ok(mag('organisator', 'postVerwijderen', { ...ORG, stap: 'afrekenen', eigen: false }));
});

test('TOE-7 §6 betaling markeren: deelnemer als van of naar, organisator ja', () => {
  const c = { ...DN, stap: 'afrekenen' };
  assert.ok(mag('deelnemer', 'betalingMarkeren', { ...c, betrokken: true }));
  assert.ok(!mag('deelnemer', 'betalingMarkeren', { ...c, betrokken: false }));
  assert.ok(mag('organisator', 'betalingMarkeren', { ...ORG, stap: 'afrekenen' }));
});

test('TOE-7 §6 afhaken markeren: alleen organisator', () => {
  alleenOrganisator(['afhakenMarkeren']);
});

test('TOE-7 §6 archief lezen: deelnemer en organisator', () => {
  assert.ok(mag('deelnemer', 'scherm', { ...DN, stap: 'afgerond', scherm: 'archief' }));
  assert.ok(mag('organisator', 'scherm', { scherm: 'archief' }));
  assert.ok(!mag('gast', 'scherm', { scherm: 'archief' }));
});

test('TOE-7: elke actie uit het contract heeft een regel en een gast mag alleen status en opzet', () => {
  const toegang = ['inloggenDeelnemer', 'inloggenBeheer', 'wachtwoordInstellen', 'uitloggen'];
  for (const a of Object.keys(ACTIES)) {
    if (a === 'scherm' || toegang.includes(a)) continue;
    assert.ok(REGELS[a], `regel voor ${a}`);
    if (a !== 'status' && a !== 'groepOpzetten') assert.ok(!mag('gast', a, { setupcodeGeldig: true }), `gast ${a}`);
  }
  for (const s of ALLE_SCHERMEN) assert.ok(!mag('gast', 'scherm', { scherm: s }), `gast scherm ${s}`);
  assert.ok(!mag('deelnemer', 'scherm', { ...DN, scherm: 'bestaat-niet' }));
});

test('TOE-7: een deelnemerssessie kan geen enkele beheeractie uitvoeren', () => {
  const ruim = { ...DN, stap: 'voorbereiding', eigen: true, nieuw: true, betrokken: true, deelvorm: 'stemmen', setupcodeGeldig: true };
  for (const [a, regel] of Object.entries(REGELS)) {
    if (!regel.deelnemer) assert.ok(!mag('deelnemer', a, ruim), a);
  }
});

test('AAN-03: een beheersessie zonder editie mag een editie aanmaken en een beheerlink maken', () => {
  assert.ok(mag('organisator', 'editieAanmaken', {}));
  assert.ok(mag('organisator', 'beheerlinkMaken', { editieId: 'e2', organisatorVanEditie: false }));
  assert.ok(!mag('organisator', 'editieBijwerken', { editieId: 'e2', organisatorVanEditie: false, stap: 'invullen' }));
});

test('AAN-29: na de stap Afgerond is alles alleen-lezen behalve lezen', () => {
  const c = { ...ORG, stap: 'afgerond' };
  for (const a of ['editieBijwerken', 'stapZetten', 'postOpslaan', 'afvinken', 'claimen', 'betalingMarkeren']) {
    assert.equal(R('organisator', a, c), 'gesloten', a);
  }
  assert.equal(R('deelnemer', 'afvinken', { ...DN, stap: 'afgerond' }), 'gesloten');
  assert.ok(mag('deelnemer', 'scherm', { ...DN, stap: 'afgerond', scherm: 'posten' }));
  assert.ok(mag('organisator', 'overzichtDetail', c));
});

test('AAN-38: bestaand item wijzigen volgt verwijderen, formulier lezen mag na de deadline', () => {
  const c = { ...DN, stap: 'voorbereiding', nieuw: false };
  assert.ok(mag('deelnemer', 'itemOpslaan', { ...c, eigen: true }));
  assert.equal(R('deelnemer', 'itemOpslaan', { ...c, eigen: false }), 'geen_toegang');
  assert.equal(R('deelnemer', 'itemOpslaan', { ...c, eigen: true, definitief: true }), 'gesloten');
  assert.ok(mag('deelnemer', 'scherm', { ...DN, stap: 'overzicht', naDeadline: true, scherm: 'formulier' }));
  assert.ok(mag('deelnemer', 'betalingTerugdraaien', { ...DN, stap: 'afrekenen', betrokken: true }));
  assert.ok(!mag('deelnemer', 'betalingTerugdraaien', { ...DN, stap: 'afrekenen', betrokken: false }));
});

test('AAN-39: ook de organisator kan na de deadline zijn antwoorden niet meer opslaan', () => {
  assert.ok(mag('organisator', 'antwoordenOpslaan', ORG));
  assert.equal(R('organisator', 'antwoordenOpslaan', { ...ORG, naDeadline: true }), 'gesloten');
});
