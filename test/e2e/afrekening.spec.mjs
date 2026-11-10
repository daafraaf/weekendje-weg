import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';

const SCRIPT_ID = 'demo-weekendje-weg-0001';
const WACHTWOORD = 'duinpan-kraanvogel';

// Demo voor afrekenen: boodschappen (Eva), kano (Bram), huisje (Eva, gelijk over vier), Bram betaalde Eva al
// € 106,60 en Chris is afgehaakt. Open: Chris → Eva € 226,60 en Anna → Eva € 166,60. De deelnemerssessie is Anna.
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { posten: true, afrekening: true, stap: 'afrekenen' }); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });

async function organisatorPagina(browser, nep) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('https://script.google.com/**', async (route) => {
    // Een gesloten verbinding (ECONNRESET) krijgt één nieuwe poging; is de nepserver al dicht, dan stopt het verzoek.
    const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' }).catch(() => fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' })).catch(() => null);
    if (!antwoord) return route.abort().catch(() => {});
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
  });
  nep.store.nieuwVerzoek();
  const token = nep.beheerlink(nep.store.lees('Leden')[0].id, WACHTWOORD);
  const page = await context.newPage();
  await page.goto(`/#b=${SCRIPT_ID}&beheer=${token}`);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leden');
  await page.goto('/#/afrekening');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eindafrekening');
  return { page, context };
}

const betalingen = (page) => page.getByRole('list', { name: 'Betalingen' });

test('GELD-8 GELD-9: de demo markeert één betaling, de afrekening herberekent en terugdraaien zet hem weer open', async ({ page, nep }) => {
  await page.goto('/#/afrekening');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eindafrekening');
  const kaart = page.getByRole('region', { name: 'Jij betaalt Eva' });
  await expect(kaart).toContainText('€ 166,60');
  await expect(page.getByText('Alle betalingen · 1 van 3 betaald')).toBeVisible();
  await expect(betalingen(page).getByRole('listitem')).toHaveCount(3);

  await kaart.getByRole('button', { name: 'Markeer als betaald' }).click();
  await expect(page.getByText('De betaling staat op betaald.')).toBeVisible();
  await expect(page.getByText('Alle betalingen · 2 van 3 betaald')).toBeVisible();
  await expect(page.getByText('Je hoeft niets meer te betalen.')).toBeVisible();
  await expect(page.locator('[data-saldo="dln0000000000002"]')).toContainText('Anna (jij)€ 0,00');
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Betalingen').map((b) => [b.vanId, b.naarId, b.bedrag])).toContainEqual(['dln0000000000002', 'dln0000000000001', 16660]);

  // Een betaling van een ander kan Anna niet afvinken.
  await expect(page.getByRole('button', { name: 'Betaling van Chris aan Eva betaald' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Betaling van Anna aan Eva terugdraaien' }).click();
  await expect(page.getByText('Alle betalingen · 1 van 3 betaald')).toBeVisible();
  await expect(page.locator('[data-saldo="dln0000000000002"]')).toContainText('-€ 166,60');
});

test('GELD-10: de ontvanger maakt met één knop een betaalverzoek zonder rekeningnummer', async ({ page, browser, nep }) => {
  await page.goto('/#/afrekening');
  await expect(page.getByText('Alle betalingen · 1 van 3 betaald')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Betaalverzoek/ })).toHaveCount(0); // Anna is geen ontvanger

  const { page: beheer, context } = await organisatorPagina(browser, nep);
  await expect(beheer.getByText('Jij krijgt nog')).toBeVisible();
  await beheer.getByRole('button', { name: 'Betaalverzoek aan Anna' }).click();
  const verzoek = beheer.getByRole('region', { name: 'Betaalverzoek aan Anna' });
  await expect(verzoek).toContainText('Wil je € 166,60 overmaken voor Weekendje weg 2027?');
  await expect(verzoek.getByRole('button', { name: 'Betaalverzoek voor Anna kopiëren' })).toBeVisible();
  await expect(verzoek.getByRole('button', { name: 'Betaalverzoek voor Anna delen' })).toBeVisible();
  await context.close();
});

test('GELD-11 EDI-9: de afgehaakte houdt zijn aandeel in het huisje en zit niet in een nieuwe post', async ({ browser, nep }) => {
  const { page, context } = await organisatorPagina(browser, nep);
  const chris = betalingen(page).locator('[data-betaling="dln0000000000004>dln0000000000001"]');
  await expect(chris).toContainText('afgehaakt, deelt in eerdere posten');
  await expect(chris).toContainText('€ 226,60');

  // Afhaken markeren en terugdraaien verandert de saldi niet.
  const wie = page.getByRole('region', { name: 'Wie doet mee' });
  await wie.getByRole('button', { name: 'Anna afhaken' }).click();
  await expect(page.getByText('Anna is afgehaakt.')).toBeVisible();
  await expect(page.locator('[data-saldo="dln0000000000002"]')).toContainText('-€ 166,60');
  await page.getByRole('region', { name: 'Wie doet mee' }).getByRole('button', { name: 'Anna doet weer mee' }).click();
  await expect(page.getByText('Anna doet weer mee.')).toBeVisible();
  nep.store.nieuwVerzoek();
  expect(nep.store.vind('Deelnemers', 'dln0000000000002').afgehaakt).toBe(false);
  expect(nep.store.vind('Deelnemers', 'dln0000000000004').afgehaakt).toBe(true);

  // Een nieuwe post verdeelt standaard zonder Chris (§7.13.9).
  await page.goto('/#/posten');
  await page.getByRole('button', { name: 'Uitgave toevoegen' }).click();
  await expect(page.getByRole('checkbox', { name: /^Chris/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^Anna/ })).toBeChecked();
  await context.close();
});
