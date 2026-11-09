import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';

const SCRIPT_ID = 'demo-weekendje-weg-0001';
const WACHTWOORD = 'duinpan-kraanvogel';

const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });

const menu = (page, naam) => page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: naam });

// De organisator logt in een tweede context in, zodat de deelnemerssessie van Anna blijft staan.
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
  return { page, context };
}

test('FRM-5 FRM-6 FRM-7 EDI-2 EDI-3: organisator voegt activiteit en keuzevraag toe en zet samenwerken aan, deelnemer ziet en beantwoordt ze', async ({ page, browser, nep }) => {
  const { page: beheer, context } = await organisatorPagina(browser, nep);

  // EDI-2 en AAN-21: een activiteit erbij en Samenwerken aan.
  await menu(beheer, 'Lijsten').click();
  await expect(beheer.getByRole('heading', { level: 1 })).toHaveText('Lijsten');
  await beheer.getByLabel('Nieuw onderdeel bij Activiteiten').fill('Boogschieten');
  await beheer.locator('[data-lijst="activiteiten"]').getByRole('button', { name: 'Toevoegen' }).click();
  await beheer.getByLabel('Samenwerken op vrijdag').check();
  await beheer.getByRole('button', { name: 'Opslaan' }).click();
  await expect(beheer.getByText('Opgeslagen', { exact: true })).toBeVisible();

  // EDI-3: een eigen meerkeuzevraag.
  await menu(beheer, 'Vragen').click();
  await expect(beheer.getByRole('heading', { level: 1 })).toHaveText('Eigen vragen');
  await beheer.getByLabel('Vraag', { exact: true }).fill('Welke spellen nemen we mee?');
  await beheer.getByLabel('Type').selectOption('meerkeuze');
  await beheer.getByLabel(/Antwoordopties/).fill('Catan\nUno\nPoker');
  await beheer.getByRole('button', { name: 'Toevoegen' }).click();
  await expect(beheer.getByText('Welke spellen nemen we mee?')).toBeVisible();
  await expect(beheer.getByText('Meerdere keuzes: Catan, Uno, Poker')).toBeVisible();

  // De deelnemer ziet de blokken en beantwoordt ze.
  await page.goto('/#/formulier');
  for (const blok of ['Activiteiten', 'Programma en sfeer', 'Eten en drinken', 'Samenwerken op vrijdag', 'Eigen vragen']) {
    await expect(page.getByRole('heading', { level: 2, name: blok, exact: true })).toBeVisible();
  }
  await page.getByRole('checkbox', { name: 'Boogschieten' }).check(); // FRM-5
  await page.getByRole('checkbox', { name: 'Wandelen' }).check();
  await page.getByLabel('Zelf iets bedacht?').fill('Zwemmen in het meer');
  await page.getByRole('checkbox', { name: 'Vegetarisch' }).check();
  await page.getByRole('group', { name: 'Samenwerken op vrijdag' }).getByRole('button', { name: /Misschien/ }).click(); // FRM-6
  await page.getByRole('checkbox', { name: 'Catan' }).check(); // FRM-7
  await page.getByRole('checkbox', { name: 'Poker' }).check();
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible();

  nep.store.nieuwVerzoek();
  const data = nep.store.lees('Antwoorden')[0].data;
  expect(data).toMatchObject({ activiteiten: ['wandelen', 'boogschieten'], activiteitenEigen: 'Zwemmen in het meer', etenDrinken: ['vegetarisch'], samenwerken: 'misschien' });
  expect(Object.values(data.eigenVragen)[0]).toBe('catan,poker');

  await page.reload(); // alles komt terug
  await expect(page.getByRole('checkbox', { name: 'Boogschieten' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Fietsen' })).not.toBeChecked();
  await expect(page.getByLabel('Zelf iets bedacht?')).toHaveValue('Zwemmen in het meer');
  await expect(page.getByRole('group', { name: 'Samenwerken op vrijdag' }).getByRole('button', { name: /Misschien/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('checkbox', { name: 'Catan' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Uno' })).not.toBeChecked();

  // AAN-21: Programma uitzetten haalt het blok uit het formulier.
  await beheer.getByRole('link', { name: 'Lijsten' }).click();
  await beheer.getByLabel('Programma en sfeer', { exact: true }).uncheck();
  await beheer.getByRole('button', { name: 'Opslaan' }).click();
  await expect(beheer.getByText('Opgeslagen', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Activiteiten', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Programma en sfeer', exact: true })).toHaveCount(0);
  await context.close();
});

test('FRM-7: een schaalvraag en een ja/nee-vraag hebben hun eigen invoer', async ({ page, nep }) => {
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Vragen', { editieId: 'demo-editie-2027', volgorde: 1, type: 'schaal', tekst: 'Zin in een wandeling?', opties: [] });
  nep.store.voegToe('Vragen', { editieId: 'demo-editie-2027', volgorde: 2, type: 'janee', tekst: 'Kom je met de auto?', opties: [] });
  nep.store.voegToe('Vragen', { editieId: 'demo-editie-2027', volgorde: 3, type: 'tekst', tekst: 'Nog een idee?', opties: [] });
  nep.store.flush();
  await page.goto('/#/formulier');
  await page.getByRole('group', { name: 'Zin in een wandeling?' }).getByRole('button', { name: '4' }).click();
  await page.getByRole('group', { name: 'Kom je met de auto?' }).getByRole('button', { name: /Nee/ }).click();
  await page.getByLabel('Nog een idee?').fill('Picknick');
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible();
  nep.store.nieuwVerzoek();
  expect(Object.values(nep.store.lees('Antwoorden')[0].data.eigenVragen)).toEqual(['4', 'nee', 'Picknick']);
});

test('NFR-9: het formulier met alle wensblokken past op 360 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/formulier');
  await expect(page.getByRole('heading', { level: 2, name: 'Eten en drinken', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
