// Hulp voor de e2e-tests: een ingelogde context en een nepbackend per test.
import { OPSLAG_SLEUTEL } from '../../src/web/sessie.js';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo, maakVolledigeDemo } from '../mock-backend/demo.mjs';
import { hashToken } from '../../src/server/crypto.js';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';
import { expect } from '@playwright/test';

// EDI-7 AAN-88: op Stappen een stap vooruit; vraagt het scherm een bevestiging, dan bevestigt deze hulp die.
export async function stapVooruit(page, naam) {
  const main = page.getByRole('main');
  await main.getByRole('button', { name: `Naar ${naam}`, exact: true }).click();
  const ja = main.getByRole('group', { name: `Naar ${naam} bevestigen` }).getByRole('button', { name: /^Ja, / });
  const klaar = main.getByRole('heading', { name: `Bericht voor de groep: ${naam}`, exact: true });
  await expect(ja.or(klaar)).toBeVisible();
  if (await ja.isVisible()) await ja.click();
  await expect(klaar).toBeVisible();
}

// Zet een geldige sessie in de opslag voordat de pagina laadt (de schil leest de sessie lokaal).
export async function logIn(context, { rondleidingGezien = true, routeGezien = true, soort = 'deelnemer', token = 'lokaal', editieId = 'demo-editie-2027' } = {}) {
  const sessie = { scriptId: 'demo-weekendje-weg-0001', sessie: token, soort, verloopt: '2099-01-01T00:00:00.000Z', editieId };
  await context.addInitScript(([sleutel, waarde]) => { if (!localStorage.getItem(sleutel)) localStorage.setItem(sleutel, waarde); }, [OPSLAG_SLEUTEL, JSON.stringify(sessie)]);
  // De rondleiding (RON-1) verschijnt bij eerste gebruik; de meeste tests slaan hem over.
  if (rondleidingGezien) await context.addInitScript(() => localStorage.setItem('ww-rondleiding', '1'));
  // UIT-1: de route op Start (AAN-85) is ook alleen voor nieuwe gebruikers; de meeste tests slaan hem over.
  if (routeGezien) await context.addInitScript(() => localStorage.setItem('ww-route-gezien', '1'));
}

// OND-1: de vlaggen staan in de bundel (src/shared/onderdelen.js). De tests herschrijven die ene letterlijke in app.js:
// 'alle' (standaard voor de bestaande tests) zet de vijf onderdelen aan, 'standaard' laat de bundel zoals hij is,
// een lijst namen zet alleen die aan. Er is geen haak in de app zelf.
export async function zetOnderdelen(context, welke = 'alle') {
  if (welke === 'standaard') return;
  const namen = welke === 'alle' ? ['boodschappen', 'kookbeurten', 'programma', 'kamers', 'carpool'] : welke;
  await context.route('**/app.js', async (route) => {
    const antwoord = await route.fetch();
    let body = await antwoord.text();
    body = body.replace(/var ONDERDELEN = {[^}]*};/, `var ONDERDELEN = { ${['boodschappen', 'kookbeurten', 'programma', 'kamers', 'carpool'].map((n) => `${n}: ${namen.includes(n)}`).join(', ')} };`);
    await route.fulfill({ response: antwoord, body });
  });
}

// Stuurt de aanroepen van een context naar script.google.com door naar de nepbackend en logt in als Anna.
// opties.onderdelen: zie zetOnderdelen; standaard 'alle'.
export async function koppelNep(context, nep, opties) {
  await zetOnderdelen(context, (opties && opties.onderdelen) || 'alle');
  await context.route('https://script.google.com/**', async (route) => {
    const verzoek = { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' };
    // Een hergebruikte verbinding kan door de nepserver gesloten zijn (ECONNRESET); één nieuwe poging volstaat.
    const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, verzoek).catch(() => fetch(`${nep.url}/macros/s/x/exec`, verzoek)).catch(() => null);
    if (!antwoord) { await route.abort().catch(() => {}); return; } // de nepserver is al gesloten aan het eind van de test
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
  });
  await logIn(context, opties);
}

// De volledige demo uit spec §11 (editie 2027 in `stap`) met een sessie voor `als`: een deelnemer van 2027,
// of met `beheer: true` een beheersessie van dat lid. `aanpassen(seed)` kan de demo vooraf wijzigen.
// NAV-9: naar een beheerscherm via het menu-item Beheren en het overzicht.
export async function beheerNaar(page, naam) {
  await page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Beheren', exact: true }).click();
  await page.getByRole('main').getByRole('link', { name: new RegExp(`^${naam}`) }).click();
}

// STA-9, BV-22: Uitloggen staat niet meer op Start, alleen in het profielmenu (en op Leden).
export async function uitloggen(page) {
  await page.getByRole('button', { name: 'Profiel en uitleg' }).click();
  await page.locator('#profielmenu').getByRole('button', { name: 'Uitloggen' }).click();
}

// STA-4, BV-07: na een beheerlogin staat de organisator op Start; dit gaat door naar Leden.
export async function naarLeden(page) {
  await page.goto('/#/leden');
  await page.waitForFunction(() => document.querySelector('main h1')?.textContent === 'Leden');
}

export async function startDemo(context, { stap = 'weekend', als = 'Bas', beheer = false, aanpassen, onderdelen, routeGezien = true } = {}) {
  const demo = maakVolledigeDemo({ stap });
  if (aanpassen) aanpassen(demo.seed, demo);
  const nep = await startServer({ port: 0, seed: demo.seed });
  const token = beheer ? 'beheer-lokaal' : 'lokaal';
  let subjectId = demo.deelnemerIds[2027][als];
  if (beheer) {
    const beheerToken = nep.beheerlink(demo.ledenIds[als], 'demo-wachtwoord-lang');
    nep.store.nieuwVerzoek();
    subjectId = nep.store.lees('Beheerlinks').find((b) => b.tokenHash === hashToken(nodeSha256, beheerToken)).id;
  }
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, token), soort: beheer ? 'beheer' : 'deelnemer', subjectId, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  await koppelNep(context, nep, beheer ? { soort: 'beheer', token, editieId: '', onderdelen, routeGezien } : { token, onderdelen, routeGezien });
  return { nep, demo };
}

// Start een nepbackend met de demodata en een geldige deelnemerssessie voor Anna (token 'lokaal').
// opties gaan naar maakDemo, bijvoorbeeld { antwoorden: true } voor de demoantwoorden; apiVersie bootst een oud script na.
export async function startNep(context, opties = {}) {
  const demo = maakDemo(opties);
  const nep = await startServer({ port: 0, seed: demo.seed, apiVersie: opties.apiVersie });
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'lokaal'), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  await koppelNep(context, nep);
  return nep;
}
