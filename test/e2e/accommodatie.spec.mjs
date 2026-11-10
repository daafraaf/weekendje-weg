import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';

const SCRIPT_ID = 'demo-weekendje-weg-0001';
const WACHTWOORD = 'duinpan-kraanvogel';

// Demo met antwoorden in de stap Accommodatie; de deelnemerssessie is Anna, de organisator is Eva (vier deelnemers).
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { antwoorden: true, stap: 'accommodatie' }); await use(nep); nep.server.close(); }, { auto: true }],
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
  await page.goto('/#/accommodatie-beheer');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accommodaties');
  return { page, context };
}

async function voegToe(page, naam, plaats, prijs, link = '') {
  await page.getByRole('button', { name: 'Accommodatie toevoegen' }).click();
  await page.getByLabel('Naam', { exact: true }).fill(naam);
  await page.getByLabel('Plaats').fill(plaats);
  if (link) await page.getByLabel(/^Link/).fill(link);
  await page.getByLabel('Totaalprijs in euro').fill(prijs);
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByText('De accommodatie is toegevoegd.')).toBeVisible();
}

test('ACC-1 ACC-2 ACC-3 ACC-4 ACC-5: weekend vastleggen, drie accommodaties op stemmen, twee stemmen, één op geboekt', async ({ page, browser, nep }) => {
  const { page: beheer, context } = await organisatorPagina(browser, nep);

  // ACC-1: vanuit de top 5.
  await expect(beheer.getByRole('list', { name: 'Top weekenden' }).getByRole('listitem')).toHaveCount(5);
  await beheer.getByRole('list', { name: 'Top weekenden' }).getByRole('listitem').first().getByRole('button', { name: /^Leg .* vast$/ }).click();
  await expect(beheer.getByText(/^Het weekend is vastgelegd:/)).toBeVisible();
  nep.store.nieuwVerzoek();
  expect(nep.store.vind('Edities', 'demo-editie-2027').vastgelegdWeekend).toMatch(/^2027-\d{2}-\d{2}$/);

  // ACC-2: drie accommodaties, een onveilige link wordt geweigerd.
  await beheer.getByRole('button', { name: 'Accommodatie toevoegen' }).click();
  await beheer.getByLabel('Naam', { exact: true }).fill('Slechte link');
  await beheer.getByLabel(/^Link/).fill('http://onveilig.nl');
  await beheer.getByRole('button', { name: 'Opslaan' }).click();
  await expect(beheer.getByText('Een link begint met https://.')).toBeVisible();
  await beheer.getByRole('button', { name: 'Annuleren' }).click();
  await voegToe(beheer, 'Hoeve de Kraanvogel', 'Dwingeloo', '1380', 'https://voorbeeld.nl/kraanvogel');
  await voegToe(beheer, 'Boerderij ’t Hooiveld', 'Winterswijk', '1140');
  await voegToe(beheer, 'Strandhuis Duinzicht', 'Renesse', '960');

  // ACC-3: deelvorm stemmen.
  await beheer.getByRole('group', { name: 'Deelvorm' }).getByRole('button', { name: 'Stemmen' }).click();
  await expect(beheer.getByText('De deelvorm is stemmen.')).toBeVisible();

  // ACC-4: Anna en de organisator kiezen elk een favoriet; Anna wijzigt haar keuze.
  await page.goto('/#/accommodaties');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Waar gaan we heen?');
  const kraanvogel = page.locator('article', { hasText: 'Hoeve de Kraanvogel' });
  const hooiveld = page.locator('article', { hasText: 'Hooiveld' });
  await expect(page.getByText(/vastgelegd$/)).toBeVisible();
  await kraanvogel.getByRole('button', { name: 'Kies als favoriet' }).click();
  await expect(kraanvogel.getByRole('button', { name: 'Jouw favoriet' })).toBeVisible();
  await expect(kraanvogel).toContainText('1 stem');
  await hooiveld.getByRole('button', { name: 'Kies als favoriet' }).click();
  await expect(hooiveld.getByRole('button', { name: 'Jouw favoriet' })).toBeVisible();
  await expect(kraanvogel).toContainText('0 stemmen');
  await expect(kraanvogel.getByRole('link', { name: 'Website van Hoeve de Kraanvogel openen' })).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(hooiveld.getByRole('link')).toHaveCount(0); // geen link ingevuld

  await beheer.goto('/#/accommodaties');
  await beheer.locator('article', { hasText: 'Hooiveld' }).getByRole('button', { name: 'Kies als favoriet' }).click();
  await expect(beheer.locator('article', { hasText: 'Hooiveld' })).toContainText('2 stemmen');
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Stemmen')).toHaveLength(2);

  // ACC-5: de organisator zet de Kraanvogel op geboekt; de groep ziet alleen die, met prijs per persoon.
  await beheer.goto('/#/accommodatie-beheer');
  await beheer.getByRole('button', { name: 'Zet Hoeve de Kraanvogel op geboekt' }).click();
  await expect(beheer.getByText('Hoeve de Kraanvogel staat op geboekt.')).toBeVisible();
  await page.reload();
  await expect(page.locator('article')).toHaveCount(1);
  const geboekt = page.locator('article', { hasText: 'Hoeve de Kraanvogel' });
  await expect(geboekt).toContainText('Geboekt');
  await expect(geboekt).toContainText('€ 345 p.p.');
  await expect(geboekt).toContainText('€ 1.380 totaal');
  await expect(page.getByText('Prijs per persoon is het totaal gedeeld door 4.')).toBeVisible();
  await context.close();
});

test('ACC-6 ACC-7 AAN-81: na vastleggen zijn de andere knoppen uit; Ander weekend kiezen vraagt bevestiging en maakt los, de boeking blijft', async ({ browser, nep }) => {
  const { page } = await organisatorPagina(browser, nep);
  const lijst = page.getByRole('list', { name: 'Top weekenden' });
  await lijst.getByRole('listitem').first().getByRole('button', { name: /^Leg .* vast$/ }).click();
  await expect(page.getByText(/^Het weekend is vastgelegd:/)).toBeVisible();
  // Alle vastlegknoppen uit, de keuzelijst ook.
  for (const k of await lijst.getByRole('button').all()) await expect(k).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Leg dit weekend vast' })).toBeDisabled();
  await expect(page.locator('#acc-weekend')).toBeDisabled();
  await expect(lijst.getByRole('button', { name: / is vastgelegd$/ })).toHaveCount(1);

  // Een boeking, dan losmaken met bevestiging (K3).
  await voegToe(page, 'Hoeve de Kraanvogel', 'Dwingeloo', '1380');
  await page.getByRole('button', { name: /^Zet Hoeve de Kraanvogel op geboekt$/ }).click();
  await expect(page.getByText('Hoeve de Kraanvogel staat op geboekt.')).toBeVisible();
  await page.getByRole('button', { name: 'Ander weekend kiezen' }).click();
  const dialoog = page.getByRole('group', { name: 'Ander weekend kiezen' });
  await expect(dialoog).toContainText('hoort bij');
  await dialoog.getByRole('button', { name: 'Annuleren' }).click();
  expect(nep.store.vind('Edities', 'demo-editie-2027').vastgelegdWeekend).not.toBe('');
  await page.getByRole('button', { name: 'Ander weekend kiezen' }).click();
  await page.getByRole('button', { name: 'Ja, maak los' }).click();
  await expect(page.getByText(/^Het weekend is losgemaakt/)).toBeVisible();
  nep.store.nieuwVerzoek();
  const e = nep.store.vind('Edities', 'demo-editie-2027');
  expect(e.vastgelegdWeekend).toBe('');
  expect(e.deelvorm).toBe('geboekt');
  await expect(lijst.getByRole('listitem').first().getByRole('button', { name: /^Leg .* vast$/ })).toBeEnabled();
});
