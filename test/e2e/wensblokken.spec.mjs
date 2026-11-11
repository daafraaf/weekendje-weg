import { test as basis, expect } from '@playwright/test';
import { startNep, beheerNaar } from './hulp.mjs';

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
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
  return { page, context };
}

test('FRM-5 FRM-6 FRM-7 EDI-2 EDI-3 AAN-75: organisator voegt activiteit en keuzevraag toe en zet samenwerken aan, deelnemer ziet en beantwoordt ze', async ({ page, browser, nep }) => {
  const { page: beheer, context } = await organisatorPagina(browser, nep);

  // EDI-2 en AAN-21: een activiteit erbij en Samenwerken aan.
  await beheerNaar(beheer, 'Lijsten');
  await expect(beheer.getByRole('heading', { level: 1 })).toHaveText('Lijsten');
  await beheer.getByLabel('Nieuw onderdeel bij Activiteiten').fill('Boogschieten');
  await beheer.locator('[data-lijst="activiteiten"]').getByRole('button', { name: 'Toevoegen' }).click();
  await beheer.getByLabel('Samenwerken op vrijdag').check();
  await beheer.getByRole('button', { name: 'Opslaan' }).click();
  await expect(beheer.getByText('Opgeslagen', { exact: true })).toBeVisible();

  // EDI-3: een eigen meerkeuzevraag.
  await beheerNaar(beheer, 'Vragen');
  await expect(beheer.getByRole('heading', { level: 1 })).toHaveText('Eigen vragen');
  await beheer.getByLabel('Vraag', { exact: true }).fill('Welke spellen nemen we mee?');
  await beheer.getByLabel('Type').selectOption('meerkeuze');
  const opties = beheer.getByRole('combobox', { name: /Antwoordopties/ }); // TAG-10
  for (const o of ['Catan', 'Uno', 'Poker']) { await opties.fill(o); await opties.press('Enter'); }
  await beheer.getByRole('button', { name: 'Vraag toevoegen' }).click();
  await expect(beheer.getByText('Welke spellen nemen we mee?')).toBeVisible();
  await expect(beheer.getByText('Meerdere keuzes: Catan, Uno, Poker')).toBeVisible();

  // De deelnemer ziet de blokken en beantwoordt ze.
  await page.goto('/#/formulier');
  for (const blok of ['Activiteiten', 'Programma en sfeer', 'Eten en drinken', 'Samenwerken op vrijdag', 'Eigen vragen']) {
    await expect(page.getByRole('heading', { level: 2, name: blok, exact: true })).toBeVisible();
  }
  await page.getByRole('checkbox', { name: 'Boogschieten' }).check(); // FRM-5
  await page.getByRole('checkbox', { name: 'Wandelen' }).check();
  const zelf = page.getByRole('combobox', { name: 'Zelf iets bedacht?' });
  await zelf.fill('Zwemmen in het meer'); // TAG-1, TAG-2
  // Tijdens het typen verschijnt de knop Toevoegen naast het veld; het veld blijft breed genoeg om te lezen wat je typt.
  await expect(page.getByRole('button', { name: 'Toevoegen' })).toBeVisible();
  expect((await zelf.boundingBox()).width).toBeGreaterThan(150);
  await zelf.press('Enter');
  // Een tag is een ronde pil in de accentkleur, niet het kleine grijze label van andere schermen.
  expect(await page.getByRole('list', { name: /ingevoerde onderdelen/ }).getByRole('listitem').first().evaluate((el) => getComputedStyle(el).borderRadius)).toBe('999px');
  await zelf.fill('zwemmen in het MEER'); // AAN-74: dubbel
  await zelf.press('Enter');
  await zelf.fill('Wandelen'); // AAN-75: gelijk aan een vinkje, geen tag
  await zelf.press('Enter');
  await expect(page.getByRole('list', { name: /ingevoerde onderdelen/ }).getByRole('listitem')).toHaveCount(1);
  await page.getByRole('checkbox', { name: 'Vegetarisch' }).check();
  await page.getByRole('group', { name: 'Samenwerken op vrijdag' }).getByRole('button', { name: /Misschien/ }).click(); // FRM-6
  await page.getByRole('checkbox', { name: 'Catan' }).check(); // FRM-7
  await page.getByRole('checkbox', { name: 'Poker' }).check();
  await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible(); // K4: elk veld slaat zichzelf op

  nep.store.nieuwVerzoek();
  const data = nep.store.lees('Antwoorden')[0].data;
  expect(data).toMatchObject({ activiteiten: ['wandelen', 'boogschieten'], activiteitenEigen: ['Zwemmen in het meer'], etenDrinken: ['vegetarisch'], samenwerken: 'misschien' });
  expect(Object.values(data.eigenVragen)[0]).toBe('catan,poker');

  await page.reload(); // alles komt terug
  await expect(page.getByRole('checkbox', { name: 'Boogschieten' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Fietsen' })).not.toBeChecked();
  await expect(page.getByRole('list', { name: /Zelf iets bedacht/ }).getByRole('listitem')).toHaveText(['Zwemmen in het meer×']); // TAG-7
  await expect(page.getByRole('group', { name: 'Samenwerken op vrijdag' }).getByRole('button', { name: /Misschien/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('checkbox', { name: 'Catan' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Uno' })).not.toBeChecked();

  // AAN-21: Programma uitzetten haalt het blok uit het formulier.
  await beheerNaar(beheer, 'Lijsten');
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
  await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible(); // K4: elk veld slaat zichzelf op
  nep.store.nieuwVerzoek();
  expect(Object.values(nep.store.lees('Antwoorden')[0].data.eigenVragen)).toEqual(['4', 'nee', 'Picknick']);
});

test('NFR-9: het formulier met alle wensblokken past op 360 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/formulier');
  await expect(page.getByRole('heading', { level: 2, name: 'Eten en drinken', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
