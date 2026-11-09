import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';

const SCRIPT_ID = 'demo-weekendje-weg-0001';
const WACHTWOORD = 'duinpan-kraanvogel';

// Demoantwoorden van Eva, Bram en Chris; Anna (de deelnemerssessie) heeft nog niets ingevuld.
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { antwoorden: true }); await use(nep); nep.server.close(); }, { auto: true }],
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

test('OVZ-1 OVZ-2: iedereen ziet wie heeft ingevuld, de organisator maakt de herinnering', async ({ page, browser, nep }) => {
  await page.goto('/#/voortgang');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wie heeft ingevuld');
  await expect(page.getByText(/^3 van 4, deadline /)).toBeVisible();
  await expect(page.getByRole('img', { name: 'niet ingevuld' })).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'ingevuld', exact: true })).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Herinnering' })).toHaveCount(0);

  const { page: beheer, context } = await organisatorPagina(browser, nep);
  await menu(beheer, 'Voortgang').click();
  await expect(beheer.getByRole('heading', { name: 'Herinnering' })).toBeVisible();
  await expect(beheer.getByText(/^Hoi allemaal! Anna, jouw wensen voor Weekendje weg 2027 staan nog open\. Invullen kan tot /)).toBeVisible();
  await expect(beheer.getByRole('button', { name: 'Herinnering voor de groep kopiëren' })).toBeVisible();
  await context.close();
});

test('OVZ-3 OVZ-4 OVZ-5 EDI-7: de organisator zet de stap naar Overzicht, daarna ziet de deelnemer de heatmap met de voorkeursdatum', async ({ page, browser, nep }) => {
  await page.goto('/#/overzicht');
  await expect(page.getByText('Het overzicht verschijnt als de organisator het vrijgeeft')).toBeVisible();

  const { page: beheer, context } = await organisatorPagina(browser, nep);
  await menu(beheer, 'Stappen').click();
  await expect(beheer.getByRole('heading', { level: 1 })).toHaveText('Stappen');
  const balk = beheer.getByRole('navigation', { name: 'Stappen van de editie' });
  await expect(balk.locator('[aria-current="step"]')).toContainText('Invullen');
  await beheer.getByRole('button', { name: 'Naar Overzicht' }).click();
  await expect(balk.locator('[aria-current="step"]')).toContainText('Overzicht');
  await expect(beheer.getByText(/^Hoi allemaal! Het invullen voor Weekendje weg 2027 is gesloten\./)).toBeVisible();
  await expect(beheer.getByRole('button', { name: 'Stapbericht voor de groep delen' })).toBeVisible();
  nep.store.nieuwVerzoek();
  expect(nep.store.vind('Edities', 'demo-editie-2027').stap).toBe('overzicht');
  await expect(beheer.getByRole('button', { name: 'Terug naar Invullen' })).toBeVisible();
  await context.close();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wanneer kan iedereen?');
  await expect(page.getByText('3 van 4 hebben ingevuld.')).toBeVisible();
  const voorkeur = page.locator('.ovz-voorkeur');
  await expect(voorkeur).toContainText('11 tot 13 juni 2027');
  const top = page.getByRole('listitem').filter({ hasText: '–' });
  await expect(top).toHaveCount(5);
  await expect(top.first()).toContainText('11 – 13 juni');
  await expect(top.nth(1)).toContainText('gelijke stand');
  await expect(page.getByRole('img', { name: /^11 – 13 juni: 3 ja, 0 misschien, 0 nee, 1 niet ingevuld/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /^14 – 16 mei: 2 ja, 1 misschien, 0 nee/ })).toBeVisible();
  await expect(page.locator('.heat')).toHaveCount(53);
  await expect(page.getByRole('img', { name: 'Verblijf p.p.: € 50 tot € 200' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Reistijd: 2 tot 4 uur' })).toBeVisible();
  await expect(page.getByText('Je ziet aantallen, geen namen.')).toBeVisible();
  await expect(page.getByText('Notenallergie')).toHaveCount(0);
  await expect(page.getByText('Bram')).toHaveCount(0);
});

test('OVZ-6: de organisator ziet per persoon en per blok de vrije tekst en de woonplaats', async ({ browser, nep }) => {
  const { page: beheer, context } = await organisatorPagina(browser, nep);
  await menu(beheer, 'Per persoon').click();
  await expect(beheer.getByRole('heading', { level: 1 })).toHaveText('Per persoon');
  const bram = beheer.getByRole('button', { name: /^Bram/ });
  await expect(bram).toHaveAttribute('aria-expanded', 'false');
  await bram.click();
  await expect(bram).toHaveAttribute('aria-expanded', 'true');
  const kaart = beheer.locator('.detail-persoon').filter({ has: bram });
  await expect(kaart.locator('dl')).toContainText('Notenallergie');
  await expect(kaart.locator('dl')).toContainText('max 2 uur vanuit Arnhem');
  await expect(beheer.getByRole('region', { name: 'Eten en drinken, vrije tekst' })).toContainText('Notenallergie');
  await expect(beheer.getByRole('region', { name: 'Programma en sfeer, vrije tekst' })).toContainText('Graag ergens met een haard');
  await context.close();
});

test('EDI-8 EDI-10: verwachte datum aanpassen en de deadline verlengen', async ({ browser, nep }) => {
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', 'demo-editie-2027', { deadline: '2027-03-01T23:59:00+01:00' }, 1);
  nep.store.flush();
  const { page: beheer, context } = await organisatorPagina(browser, nep);
  await menu(beheer, 'Stappen').click();
  await beheer.getByLabel('Voorbereiding').fill('2027-05-28');
  await beheer.getByRole('button', { name: 'Data opslaan' }).click();
  await expect(beheer.getByText('De verwachte data zijn opgeslagen.')).toBeVisible();
  await expect(beheer.getByRole('navigation', { name: 'Stappen van de editie' })).toContainText('28 mei');
  await beheer.getByLabel('Nieuwe deadline').fill('2027-03-08');
  await beheer.getByRole('button', { name: 'Deadline verlengen' }).click();
  await expect(beheer.getByText('De deadline is verlengd.')).toBeVisible();
  nep.store.nieuwVerzoek();
  const e = nep.store.vind('Edities', 'demo-editie-2027');
  expect(e.deadline).toBe('2027-03-08T23:59:00+01:00');
  expect(e.stapData.voorbereiding).toBe('2027-05-28');
  expect(e.stapData.invullen).toBe('2027-03-08');
  await context.close();
});
