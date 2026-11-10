// Beveiligingsronde (fase 19, spec §6, §10): elke actie uit het contract zonder sessie en met de verkeerde rol,
// XSS in alle tekstvelden (NFR-5), de CSP (NFR-4) en uitloggen zonder script (AAN-42).
// De rechtentests praten over HTTP met de nepbackend; die is gelijk voor elke browser, dus één project draait ze.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { startServer } from '../mock-backend/server.mjs';
import { maakVolledigeDemo, DEMO_EDITIE_ID, DEMO_2026_ID } from '../mock-backend/demo.mjs';
import { ACTIES } from '../../src/server/api.js';
import { REGELS, ALLE_SCHERMEN } from '../../src/server/rechten.js';
import { startDemo, logIn } from './hulp.mjs';
import { OPSLAG_SLEUTEL } from '../../src/web/sessie.js';

test.use({ serviceWorkers: 'block' });

const alleenEenProject = () => test.skip(test.info().project.name !== 'chromium-desktop', 'API-tests: één project is genoeg');

// Acties die zonder sessie bestaan: ze controleren zelf link, pincode, wachtwoord of setupcode (§6, §7.1).
const OPEN = ['status', 'inloggenDeelnemer', 'inloggenBeheer', 'wachtwoordInstellen', 'groepOpzetten'];

async function api(stap = 'weekend') {
  const demo = maakVolledigeDemo({ stap });
  const nep = await startServer({ port: 0, seed: demo.seed });
  const vraag = async (verzoek) => {
    const r = await fetch(`${nep.url}/macros/s/${demo.scriptId}/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ apiVersie: 1, ...verzoek }) });
    return r.json();
  };
  const deelnemer = async (naam, jaar = 2027) => (await vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[jaar][naam], pin: demo.pin } })).data.sessie;
  const beheer = async (naam) => {
    const token = nep.beheerlink(demo.ledenIds[naam], 'een-lang-wachtwoord');
    return (await vraag({ actie: 'inloggenBeheer', data: { token, wachtwoord: 'een-lang-wachtwoord' } })).data.sessie;
  };
  // Alle tabs behalve Sessies, Pogingen en Log: een geweigerde actie mag hier niets aan veranderen.
  const foto = () => JSON.stringify(['Groep', 'Leden', 'Edities', 'Deelnemers', 'Antwoorden', 'Accommodaties', 'Stemmen', 'Items', 'Claims', 'Maaltijden', 'Koks', 'Programma', 'Kamers', 'Kamerindeling', 'Ritten', 'Meerijders', 'Posten', 'Betalingen', 'Beheerlinks', 'Vragen'].map((t) => nep.adapter.ruw(t)));
  const logRegels = () => nep.adapter.ruw('Log').length;
  return { demo, nep, vraag, deelnemer, beheer, foto, logRegels, ids: demo.deelnemerIds[2027] };
}

test('§6 TOE-6: zonder sessie weigert de API elke actie en elk scherm, behalve status en de inlogacties', async () => {
  alleenEenProject();
  const { demo, nep, vraag, foto, logRegels } = await api();
  const voor = foto();
  const log = logRegels();
  const gesloten = Object.keys(ACTIES).filter((a) => !OPEN.includes(a));
  expect(gesloten.length).toBeGreaterThan(35);
  for (const actie of gesloten) {
    for (const sessie of [undefined, 'niet-bestaande-sessie-0000000000']) {
      const r = await vraag({ actie, sessie, editieId: DEMO_EDITIE_ID, data: {} });
      expect(r.fout, `${actie} zonder geldige sessie`).toBe('geen_toegang');
    }
  }
  for (const naam of ALLE_SCHERMEN) {
    expect((await vraag({ actie: 'scherm', data: { naam } })).fout, `scherm ${naam}`).toBe('geen_toegang');
  }
  // status zegt alleen versie en opgezet ja/nee.
  const status = await vraag({ actie: 'status' });
  expect(Object.keys(status.data).sort()).toEqual(['apiVersie', 'opgezet']);
  // Opzetten van een opgezette groep en inloggen met een foute pincode geven niets prijs.
  expect((await vraag({ actie: 'groepOpzetten', data: { setupcode: 'ABCD2345', groepsnaam: 'X', leden: [{ voornaam: 'A', woonplaats: '' }, { voornaam: 'B', woonplaats: '' }], eigenaar: 0, wachtwoord: 'lang-genoeg-wachtwoord' } })).ok).toBe(false);
  const fout = await vraag({ actie: 'inloggenDeelnemer', data: { token: demo.tokens[2027].Bas, pin: '000000' } });
  expect(fout.fout).toBe('geen_toegang');
  expect(JSON.stringify(fout)).not.toMatch(/Bas|demo-editie/);
  // Acties van de eigenaar (Sheet-menu) bestaan niet in het HTTP-contract.
  for (const actie of ['setupcodeTonen', 'wachtwoordResetten', 'logLegen']) expect((await vraag({ actie, data: {} })).fout).toBe('ongeldig');
  expect(foto()).toBe(voor);
  expect(logRegels()).toBe(log);
  nep.server.close();
});

test('§6 TOE-7: een deelnemerssessie krijgt geen_toegang op elke actie en elk scherm van de organisator', async () => {
  alleenEenProject();
  const { nep, vraag, deelnemer, foto } = await api();
  const bas = await deelnemer('Bas');
  const voor = foto();
  const alleenBeheer = Object.keys(ACTIES).filter((a) => REGELS[a] && !REGELS[a].deelnemer && !OPEN.includes(a));
  expect(alleenBeheer).toEqual(expect.arrayContaining(['editieAanmaken', 'stapZetten', 'linksMaken', 'afhakenMarkeren', 'boodschappenDefinitief', 'kamerIndelen', 'weekendVastleggen']));
  for (const actie of alleenBeheer) {
    expect((await vraag({ actie, sessie: bas, data: {} })).fout, actie).toBe('geen_toegang');
  }
  expect((await vraag({ actie: 'scherm', sessie: bas, data: { naam: 'beheer' } })).fout).toBe('geen_toegang');
  // Een andere editie dan die van de link.
  expect((await vraag({ actie: 'scherm', sessie: bas, editieId: DEMO_2026_ID, data: { naam: 'posten' } })).fout).toBe('geen_toegang');
  expect(foto()).toBe(voor);
  nep.server.close();
});

test('§6 TOE-7: een deelnemer wijzigt niets van een ander (post, item, claim, rit, betaling)', async () => {
  alleenEenProject();
  const { demo, nep, vraag, deelnemer, foto, ids } = await api('weekend');
  const sanne = await deelnemer('Sanne');
  const voor = foto();
  const s = demo.seed;
  const postBas = s.Posten.find((p) => p.editieId === DEMO_EDITIE_ID && p.betalerId === ids.Bas);
  const itemAnne = s.Items.find((i) => i.toegevoegdDoor === ids.Anne);
  const claimBas = s.Claims.find((c) => c.deelnemerId === ids.Bas);
  const ritBas = s.Ritten.find((r) => r.bestuurderId === ids.Bas);
  const nee = async (actie, data) => expect((await vraag({ actie, sessie: sanne, data })).fout, actie).toBe('geen_toegang');
  await nee('postOpslaan', { id: postBas.id, versie: 1, soort: 'uitgave', omschrijving: 'Gewijzigd', bedrag: 100, betalerId: ids.Sanne, datum: '2027-05-21', categorie: 'overig', verdeling: { wijze: 'gelijk', deelnemers: [ids.Sanne] } });
  await nee('postVerwijderen', { id: postBas.id, versie: 1 });
  await nee('itemVerwijderen', { id: itemAnne.id, versie: 1 });
  await nee('itemOpslaan', { id: itemAnne.id, versie: 1, soort: 'boodschap', naam: 'Anders' });
  await nee('claimIntrekken', { itemId: claimBas.itemId, deelnemerId: ids.Bas });
  await nee('ritOpslaan', { id: ritBas.id, vrijePlaatsen: 1 });
  await nee('meerijden', { ritId: ritBas.id, deelnemerId: ids.Daan });
  await nee('meerijdenStoppen', { deelnemerId: ids.Eva });
  expect(foto()).toBe(voor);
  nep.server.close();
});

test('§6 TOE-7: stap en status sluiten acties (stemmen, invullen, definitieve boodschappen, betaling van een ander)', async () => {
  alleenEenProject();
  // Invullen: het overzicht is nog dicht, stemmen kan niet bij deelvorm info.
  const a = await api('invullen');
  const bas = await a.deelnemer('Bas');
  expect((await a.vraag({ actie: 'scherm', sessie: bas, data: { naam: 'overzicht' } })).fout).toBe('gesloten');
  expect((await a.vraag({ actie: 'scherm', sessie: bas, data: { naam: 'accommodaties' } })).fout).toBe('gesloten');
  a.nep.server.close();
  // Voorbereiding: invullen is voorbij en de boodschappen zijn definitief.
  const b = await api('voorbereiding');
  const daan = await b.deelnemer('Daan');
  const voor = b.foto();
  expect((await b.vraag({ actie: 'antwoordenOpslaan', sessie: daan, data: { versie: 1, data: {} } })).fout).toBe('gesloten');
  expect((await b.vraag({ actie: 'itemOpslaan', sessie: daan, data: { soort: 'boodschap', naam: 'Chips' } })).fout).toBe('gesloten');
  expect(b.foto()).toBe(voor);
  b.nep.server.close();
  // Afrekenen: een betaling waar Bas niet bij betrokken is.
  const c = await api('afrekenen');
  const basAf = await c.deelnemer('Bas');
  const anne = await c.beheer('Anne');
  const open = (await c.vraag({ actie: 'scherm', sessie: anne, data: { naam: 'afrekening' } })).data.open;
  const vreemd = open.find((x) => x.vanId !== c.ids.Bas && x.naarId !== c.ids.Bas);
  expect(vreemd).toBeTruthy();
  const { vanId, naarId, bedrag } = vreemd;
  expect((await c.vraag({ actie: 'betalingMarkeren', sessie: basAf, data: { vanId, naarId, bedrag } })).fout).toBe('geen_toegang');
  c.nep.server.close();
});

test('§6 AAN-29: een organisator van een andere editie mag niets, en na Afgerond is alles alleen-lezen', async () => {
  alleenEenProject();
  const { nep, vraag, beheer, foto } = await api('weekend');
  const eva = await beheer('Eva'); // organisator van 2026, deelnemer in 2027
  const voor = foto();
  for (const actie of ['stapZetten', 'linksMaken', 'boodschappenDefinitief', 'programmaOpslaan', 'afhakenMarkeren', 'editieBijwerken']) {
    expect((await vraag({ actie, sessie: eva, editieId: DEMO_EDITIE_ID, data: {} })).fout, actie).toBe('geen_toegang');
  }
  expect((await vraag({ actie: 'scherm', sessie: eva, editieId: DEMO_EDITIE_ID, data: { naam: 'posten' } })).fout).toBe('geen_toegang');
  // In haar eigen, afgeronde editie leest ze wel, maar schrijft ze niets.
  expect((await vraag({ actie: 'scherm', sessie: eva, editieId: DEMO_2026_ID, data: { naam: 'afrekening' } })).ok).toBe(true);
  expect((await vraag({ actie: 'stapZetten', sessie: eva, editieId: DEMO_2026_ID, data: { stap: 'afrekenen' } })).fout).toBe('gesloten');
  expect((await vraag({ actie: 'programmaVerwijderen', sessie: eva, editieId: DEMO_2026_ID, data: { id: 'prg0000000000001' } })).fout).toBe('gesloten');
  expect(foto()).toBe(voor);
  nep.server.close();
});

test('NFR-1 NFR-16: het Log bevat geen pincodes, tokens of sessies en geen vrije tekst', async () => {
  alleenEenProject();
  const { nep, vraag, deelnemer, demo, ids } = await api('weekend');
  const bas = await deelnemer('Bas');
  await vraag({ actie: 'postOpslaan', sessie: bas, data: { soort: 'uitgave', omschrijving: 'Geheime omschrijving', bedrag: 1234, betalerId: ids.Bas, datum: '2027-05-22', categorie: 'overig', verdeling: { wijze: 'gelijk', deelnemers: [ids.Bas, ids.Eva] } } });
  const log = JSON.stringify(nep.adapter.ruw('Log'));
  expect(log).toContain('postOpslaan');
  for (const geheim of [demo.pin, demo.tokens[2027].Bas, bas, 'Geheime omschrijving']) expect(log).not.toContain(geheim);
  const sessies = JSON.stringify(nep.adapter.ruw('Sessies'));
  expect(sessies).not.toContain(bas);
  nep.server.close();
});

test('NFR-4: de gebouwde index.html heeft de CSP uit de spec', async () => {
  alleenEenProject();
  const html = readFileSync(new URL('../../dist/web/index.html', import.meta.url), 'utf8');
  expect(html).toContain("default-src 'self'; connect-src https://script.google.com https://script.googleusercontent.com; img-src 'self' data:; style-src 'self'; script-src 'self'; manifest-src 'self'; worker-src 'self'");
  expect(html).not.toMatch(/<script[^>]+src=["']https?:/);
});

// NFR-5: de aanval uit de spec staat in elk tekstveld van de demo; geen scherm voert hem uit.
const AANVAL = '<img src=x onerror=alert(1)>';
function besmet(seed) {
  const velden = {
    Groep: ['naam'], Leden: ['voornaam', 'woonplaats'], Edities: ['titel'], Accommodaties: ['naam', 'plaats', 'notitie'],
    Items: ['naam'], Maaltijden: ['omschrijving'], Programma: ['titel', 'adres', 'notitie'], Kamers: ['naam'],
    Ritten: ['vertrekplaats'], Posten: ['omschrijving'],
  };
  for (const [tab, kolommen] of Object.entries(velden)) for (const rij of seed[tab] || []) for (const k of kolommen) rij[k] = `${rij[k] || ''}${AANVAL}`;
  for (const a of seed.Antwoorden || []) {
    for (const k of ['activiteitenEigen', 'programmaEigen', 'etenDrinkenEigen', 'woonplaats']) a.data[k] = AANVAL;
  }
  seed.Vragen = [{ id: 'vrgDemo000000001', editieId: DEMO_EDITIE_ID, volgorde: 1, type: 'keuze', tekst: AANVAL, opties: [{ sleutel: 'a', label: AANVAL }] }];
}

const ROUTES = ['start', 'archief', 'formulier', 'voortgang', 'overzicht', 'detail', 'posten', 'afrekening', 'accommodaties', 'meenemen', 'boodschappen', 'kookbeurten', 'programma', 'kamers', 'carpool', 'uitleg',
  'leden', 'editie-nieuw', 'uitnodigen', 'lijsten-beheer', 'vragen-beheer', 'stappen', 'accommodatie-beheer'];

for (const beheer of [false, true]) {
  test(`NFR-5: XSS in alle tekstvelden voert op geen enkel scherm iets uit (${beheer ? 'organisator' : 'deelnemer'})`, async ({ page, context }) => {
    test.skip(!['chromium-desktop', 'webkit-mobiel'].includes(test.info().project.name), 'twee browsers volstaan');
    test.setTimeout(120000);
    const { nep } = await startDemo(context, { stap: 'weekend', als: beheer ? 'Anne' : 'Bas', beheer, aanpassen: besmet });
    const dialogen = [];
    page.on('dialog', (d) => { dialogen.push(d.message()); d.dismiss(); });
    for (const route of ROUTES) {
      await page.goto('about:blank');
      await page.goto(`/#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText('Laden…')).toHaveCount(0);
      await expect(page.locator('img[src="x"]'), route).toHaveCount(0);
      expect(await page.evaluate(() => document.body.innerHTML.includes('<img src="x"') || document.body.innerHTML.includes('<img src=x')), route).toBe(false);
    }
    // De tekst staat er wel, als tekst.
    await page.goto('/#/programma');
    await expect(page.getByRole('main').getByText(AANVAL, { exact: false }).first()).toBeVisible();
    // Invoeren via een formulier werkt net zo: de boodschap komt als tekst op de lijst.
    if (!beheer) {
      await page.goto('/#/posten');
      await page.getByRole('button', { name: 'Uitgave toevoegen' }).click();
      await page.getByLabel('Omschrijving').fill(`Taxi ${AANVAL}`);
      await page.getByLabel('Bedrag', { exact: true }).fill('12,00');
      await page.getByRole('button', { name: 'Opslaan' }).click();
      await expect(page.getByText('De post is toegevoegd.')).toBeVisible();
      await expect(page.getByRole('button', { name: /Taxi/ })).toContainText(AANVAL);
      await expect(page.locator('img[src="x"]')).toHaveCount(0);
    }
    await page.waitForTimeout(200);
    expect(dialogen).toEqual([]);
    nep.server.close();
  });
}

test('AAN-42 TOE-9: uitloggen wist de sessie op het apparaat, ook als het script niet antwoordt', async ({ page, context }) => {
  alleenEenProject();
  await logIn(context);
  await context.route('https://script.google.com/**', (route) => route.abort());
  await page.goto('/#/start');
  await page.getByRole('button', { name: 'Uitloggen' }).click();
  await expect(page.getByLabel('Plak je persoonlijke link')).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), OPSLAG_SLEUTEL)).toBeNull();
});
