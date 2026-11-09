import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';

const SCRIPT_ID = 'demo-weekendje-weg-0001';
const WACHTWOORD = 'duinpan-kraanvogel';

// Demoposten: Eva betaalde boodschappen (gelijk over vier), Bram de kanoverhuur (aandeel Bram 1, Chris 2).
// De deelnemerssessie is Anna.
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { posten: true, stap: 'weekend' }); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });

const menu = (page, naam) => page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: naam, exact: true });

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

test('GELD-1 GELD-2 GELD-3 GELD-4: een deelnemer voert een uitgave met aandelen in', async ({ page, nep }) => {
  await page.goto('/#/start');
  await menu(page, 'Geld').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitgaven');
  await page.getByRole('button', { name: 'Uitgave toevoegen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitgave toevoegen');
  await page.getByLabel('Omschrijving').fill('Kanoverhuur zondag');
  await page.getByLabel('Bedrag', { exact: true }).fill('90,00');
  await page.getByLabel('Categorie').selectOption({ label: 'Activiteit' });
  await expect(page.getByLabel('Betaald door')).toHaveValue('dln0000000000002');
  await expect(page.getByText('Verdeeld: € 90,00')).toBeVisible();

  // GELD-3: bij bedrag per persoon het verschil, opslaan kan pas bij nul
  const verdeelwijze = page.getByRole('group', { name: 'Verdeelwijze' });
  await verdeelwijze.getByRole('button', { name: 'Bedrag' }).click();
  await page.getByLabel('Anna', { exact: true }).fill('12,00');
  await expect(page.getByText('Nog € 78,00 te verdelen')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Opslaan' })).toBeDisabled();
  await page.getByLabel('Bram', { exact: true }).fill('80,00');
  await expect(page.getByText('€ 2,00 te veel')).toBeVisible();

  await verdeelwijze.getByRole('button', { name: 'Aandeel' }).click();
  await page.getByRole('button', { name: 'Aandeel Bram hoger' }).click();
  await page.getByRole('button', { name: 'Aandeel Chris lager' }).click();
  await page.getByRole('button', { name: 'Aandeel Eva lager' }).click();
  await expect(page.getByLabel('aandeel Bram', { exact: true })).toHaveText('2');
  await expect(page.getByText('Verdeeld: € 90,00')).toBeVisible();
  await page.getByRole('button', { name: 'Opslaan' }).click();

  await expect(page.getByText('De post is toegevoegd.')).toBeVisible();
  const rij = page.getByRole('button', { name: /Kanoverhuur zondag/ });
  await expect(rij).toContainText('Jij betaalde · Activiteit · aandeel');
  await expect(rij).toContainText('jouw deel € 30,00');
  await expect(rij).toContainText('€ 90,00');
  nep.store.nieuwVerzoek();
  const post = nep.store.lees('Posten').find((p) => p.omschrijving === 'Kanoverhuur zondag');
  expect(post.verdeling).toEqual({ wijze: 'aandeel', aandelen: { dln0000000000002: 1, dln0000000000003: 2 } });
  expect(post.bedrag).toBe(9000);
  expect(post.aangemaaktDoor).toBe('dln0000000000002');
});

test('GELD-5: een deelnemer kan een post van een ander niet wijzigen; de organisator wel, met aantekening', async ({ page, browser, nep }) => {
  await page.goto('/#/posten');
  await page.getByRole('button', { name: /Boodschappen vrijdag/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Post bekijken');
  await expect(page.getByText('Je kunt alleen je eigen posten wijzigen.')).toBeVisible();
  await expect(page.getByLabel('Omschrijving')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Opslaan' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Verwijderen' })).toHaveCount(0);

  const { page: beheer, context } = await organisatorPagina(browser, nep);
  await menu(beheer, 'Geld').click();
  await beheer.getByRole('button', { name: /Kanoverhuur/ }).click();
  await expect(beheer.getByRole('heading', { level: 1 })).toHaveText('Post wijzigen');
  await beheer.getByLabel('Omschrijving').fill('Kanoverhuur en peddels');
  await beheer.getByRole('button', { name: 'Opslaan' }).click();
  await expect(beheer.getByText('De post is gewijzigd.')).toBeVisible();
  await context.close();

  await page.reload();
  await expect(page.getByRole('button', { name: /Kanoverhuur en peddels/ })).toContainText('aangepast door de organisator');
  nep.store.nieuwVerzoek();
  expect(nep.store.vind('Posten', 'pst0000000000002').aangepastDoorOrganisator).toBe(true);
});

test('GELD-6 GELD-7: totalen per categorie en saldi die samen nul zijn', async ({ page }) => {
  await page.goto('/#/posten');
  await expect(page.locator('.post-totaal')).toContainText('€ 276,40');
  await expect(page.locator('.post-totaal')).toContainText('€ 46,60');
  const cat = page.getByRole('region', { name: 'Per categorie' });
  await expect(cat).toContainText('Boodschappen€ 186,40');
  await expect(cat).toContainText('Activiteit€ 90,00');
  const saldo = page.getByRole('region', { name: 'Saldo' });
  await expect(saldo.locator('[data-saldo="dln0000000000001"]')).toContainText('€ 139,80');
  await expect(saldo.locator('[data-saldo="dln0000000000002"]')).toContainText('Anna (jij)-€ 46,60');
  await expect(saldo.locator('[data-saldo="dln0000000000003"]')).toContainText('€ 13,40');
  await expect(saldo.locator('[data-saldo="dln0000000000004"]')).toContainText('-€ 106,60');
});
