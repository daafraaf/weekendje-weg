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
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
  await page.goto('/#/accommodatie-beheer');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accommodaties');
  return { page, context };
}

async function voegToe(page, naam, plaats, prijs, { link = '', bedden = '', kamers = '' } = {}) {
  await page.getByRole('button', { name: 'Optie toevoegen' }).click();
  await page.getByLabel('Naam', { exact: true }).fill(naam);
  await page.getByLabel('Plaats').fill(plaats);
  if (link) await page.getByLabel(/^Link/).fill(link);
  await page.getByLabel('Totaalprijs in euro').fill(prijs);
  if (bedden) await page.getByLabel('Aantal bedden').fill(bedden);
  if (kamers) await page.getByLabel(/^Eigen kamers/).fill(kamers);
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByText('De accommodatie is toegevoegd.')).toBeVisible();
}

const sync = (page) => page.locator('.sync');
const kaartVan = (page, naam) => page.locator('article', { hasText: naam });

test('ACC-1 ACC-2 ACC-11 ACC-12 ACC-13 ACC-14: samen kiezen met een top 3 via de wachtrij, ranglijst voor de organisator, boeken', async ({ page, browser, nep }) => {
  const { page: beheer, context } = await organisatorPagina(browser, nep);

  // ACC-1: vanuit de top 5.
  await expect(beheer.getByRole('list', { name: 'Top weekenden' }).getByRole('listitem')).toHaveCount(5);
  await beheer.getByRole('list', { name: 'Top weekenden' }).getByRole('listitem').first().getByRole('button', { name: /^Leg .* vast$/ }).click();
  await expect(beheer.getByText(/^Het weekend is vastgelegd:/)).toBeVisible();

  // ACC-8: een nieuwe editie kiest samen.
  await expect(beheer.getByRole('group', { name: 'Hoe kiezen we?' }).getByRole('button', { name: 'Samen kiezen' })).toHaveAttribute('aria-pressed', 'true');

  // ACC-2, ACC-14: opties met bedden en eigen kamers; een onveilige link en te veel kamers worden geweigerd.
  await beheer.getByRole('button', { name: 'Optie toevoegen' }).click();
  await beheer.getByLabel('Naam', { exact: true }).fill('Slechte link');
  await beheer.getByLabel(/^Link/).fill('http://onveilig.nl');
  await beheer.getByRole('button', { name: 'Opslaan' }).click();
  await expect(beheer.getByText('Een link begint met https://.')).toBeVisible();
  await beheer.getByLabel(/^Link/).fill('');
  await beheer.getByLabel('Aantal bedden').fill('2');
  await beheer.getByLabel(/^Eigen kamers/).fill('3');
  await beheer.getByRole('button', { name: 'Opslaan' }).click();
  await expect(beheer.getByText('Er kunnen niet meer eigen kamers dan bedden zijn.')).toBeVisible();
  await beheer.getByRole('button', { name: 'Annuleren' }).click();
  await voegToe(beheer, 'Hoeve de Kraanvogel', 'Dwingeloo', '1380', { link: 'https://voorbeeld.nl/kraanvogel', bedden: '8', kamers: '3' });
  await voegToe(beheer, 'Boerderij ’t Hooiveld', 'Winterswijk', '1140', { bedden: '10' });
  await voegToe(beheer, 'Strandhuis Duinzicht', 'Renesse', '960');
  await expect(kaartVan(beheer, 'Kraanvogel')).toContainText('8 bedden · 3 eigen kamers');

  // ACC-11: Anna tikt haar top 3; het staat direct in beeld en gaat via de wachtrij.
  await page.goto('/#/accommodaties');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Waar gaan we heen?');
  await expect(page.getByText(/vastgelegd$/)).toBeVisible();
  await expect(kaartVan(page, 'Kraanvogel')).toContainText('8 bedden · 3 eigen kamers');
  await expect(kaartVan(page, 'Duinzicht')).not.toContainText('bedden');
  await page.getByRole('button', { name: 'Hoeve de Kraanvogel op plek 1' }).click();
  await expect(page.getByRole('button', { name: 'Hoeve de Kraanvogel op plek 1' })).toHaveAttribute('aria-pressed', 'true', { timeout: 500 });
  await page.getByRole('button', { name: 'Boerderij ’t Hooiveld op plek 2' }).click();
  const stand = page.getByRole('list', { name: 'Stand' });
  await expect(stand.locator('[data-stand]').first()).toContainText('3 pt');
  await expect(sync(page)).toHaveText('Opgeslagen');
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Stemmen').map((s) => s.rang).sort()).toEqual([1, 2]);
  await expect(kaartVan(page, 'Kraanvogel').getByRole('link', { name: 'Website van Hoeve de Kraanvogel openen' })).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(kaartVan(page, 'Hooiveld').getByRole('link')).toHaveCount(0); // geen link ingevuld

  // Opnieuw tikken vervangt: het Hooiveld op 1 haalt de Kraanvogel van plek 1.
  await page.getByRole('button', { name: 'Boerderij ’t Hooiveld op plek 1' }).click();
  await expect(page.getByRole('button', { name: 'Hoeve de Kraanvogel op plek 1' })).toHaveAttribute('aria-pressed', 'false');
  await expect(sync(page)).toHaveText('Opgeslagen');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Boerderij ’t Hooiveld op plek 1' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('1 van 4 gaven een top 3')).toBeVisible();
  await expect(stand).not.toContainText('Anna');

  // ACC-12: de organisator ziet de ranglijst met punten en het aantal mensen.
  await beheer.reload();
  const eerste = beheer.locator('article').first();
  await expect(eerste).toContainText('1. Boerderij ’t Hooiveld');
  await expect(eerste).toContainText('3 pt');
  await expect(eerste).toContainText('1 persoon');
  await expect(beheer.getByText('~ 1 van 4 gaven een top 3')).toBeVisible();

  // ACC-13: boeken; daarna is wisselen dicht en ziet de groep de geboekte met prijs per persoon.
  await beheer.getByRole('button', { name: 'Boek Hoeve de Kraanvogel' }).click();
  await expect(beheer.getByText('✓ Hoeve de Kraanvogel is geboekt.')).toBeVisible();
  await expect(beheer.getByRole('group', { name: 'Hoe kiezen we?' }).getByRole('button', { name: 'Verrassing' })).toBeDisabled();
  await page.reload();
  await expect(page.locator('article')).toHaveCount(1);
  const geboekt = kaartVan(page, 'Hoeve de Kraanvogel');
  await expect(geboekt).toContainText('✓ Geboekt');
  await expect(geboekt).toContainText('€ 345 p.p.');
  await expect(geboekt).toContainText('€ 1.380 totaal');
  await expect(geboekt).toContainText('8 bedden · 3 eigen kamers');
  await expect(page.getByRole('button', { name: /op plek/ })).toHaveCount(0);

  // ACC-13: de geboekte verwijderen geeft weer "nog geen accommodatie gekozen".
  await beheer.getByRole('button', { name: 'Hoeve de Kraanvogel verwijderen', exact: true }).click();
  await expect(kaartVan(beheer, 'Kraanvogel')).toContainText('weer geen accommodatie gekozen');
  await beheer.getByRole('button', { name: 'Hoeve de Kraanvogel definitief verwijderen' }).click();
  await expect(beheer.getByText('Hoeve de Kraanvogel is verwijderd. Er is nog geen accommodatie gekozen.')).toBeVisible();
  await expect(beheer.getByRole('group', { name: 'Hoe kiezen we?' }).getByRole('button', { name: 'Verrassing' })).toBeEnabled();
  await context.close();
});

test('ACC-8 ACC-9 ACC-10: verrassing; de deelnemer ziet alleen dat het geregeld is tot de organisator onthult na een bevestiging', async ({ page, browser, nep }) => {
  const { page: beheer, context } = await organisatorPagina(browser, nep);
  await beheer.getByRole('group', { name: 'Hoe kiezen we?' }).getByRole('button', { name: 'Verrassing' }).click();
  await expect(beheer.getByText('We kiezen nu: verrassing.')).toBeVisible();
  await voegToe(beheer, 'Boshuis De Zandkuil', 'Otterlo', '1240', { link: 'https://voorbeeld.nl/zandkuil', bedden: '8' });
  await expect(beheer.getByRole('heading', { name: 'Jouw opties' })).toBeVisible();

  await page.goto('/#/accommodaties');
  await expect(page.getByRole('heading', { name: 'Het wordt een verrassing' })).toBeVisible();
  await expect(page.getByText('~ Nog niet geregeld')).toBeVisible();

  await beheer.getByRole('button', { name: 'Boek Boshuis De Zandkuil' }).click();
  await expect(beheer.getByText('✓ Boshuis De Zandkuil is geboekt.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('✓ Geregeld')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Zandkuil');
  await expect(page.locator('main')).not.toContainText('Otterlo');
  await expect(page.locator('a[href*="zandkuil"]')).toHaveCount(0);

  // ACC-9: in Wie betaalt wat krijgt de organisator een waarschuwing.
  await beheer.goto('/#/posten');
  await expect(beheer.getByText(/kan haar verraden/)).toBeVisible();
  await page.goto('/#/posten');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitgaven');
  await expect(page.getByText(/kan haar verraden/)).toHaveCount(0);

  // ACC-10: onthullen vraagt een bevestiging; Annuleren laat het geheim.
  await beheer.goto('/#/accommodatie-beheer');
  await beheer.getByRole('button', { name: 'Verrassing onthullen' }).click();
  await beheer.getByRole('group', { name: 'Verrassing onthullen' }).getByRole('button', { name: 'Annuleren' }).click();
  nep.store.nieuwVerzoek();
  expect(nep.store.vind('Edities', 'demo-editie-2027').onthuld).toBe(false);
  await beheer.getByRole('button', { name: 'Verrassing onthullen' }).click();
  await beheer.getByRole('button', { name: 'Ja, onthul' }).click();
  await expect(beheer.getByText('De verrassing is onthuld.')).toBeVisible();
  await expect(beheer.getByText('✓ Onthuld.', { exact: false })).toBeVisible();

  await page.goto('/#/accommodaties');
  const kaart = kaartVan(page, 'Boshuis De Zandkuil');
  await expect(kaart).toContainText('✓ Geboekt');
  await expect(kaart).toContainText('Otterlo');
  await expect(kaart).toContainText('8 bedden');
  await expect(kaart.getByRole('link', { name: 'Website van Boshuis De Zandkuil openen' })).toHaveAttribute('href', 'https://voorbeeld.nl/zandkuil');
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
  await page.getByRole('button', { name: 'Boek Hoeve de Kraanvogel' }).click();
  await expect(page.getByText('✓ Hoeve de Kraanvogel is geboekt.')).toBeVisible();
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
  expect(e.geboektAccommodatieId).not.toBe('');
  await expect(lijst.getByRole('listitem').first().getByRole('button', { name: /^Leg .* vast$/ })).toBeEnabled();
});
