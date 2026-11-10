import { test as basis, expect } from '@playwright/test';
import { startNep, koppelNep } from './hulp.mjs';

const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });

const april = (page) => page.getByRole('region', { name: 'April 2027' });
const weekend = (page, naam) => april(page).getByRole('button', { name: new RegExp(`^${naam}`) });
const status = (page) => page.locator('.form-status');
const antwoorden = (nep) => { nep.store.nieuwVerzoek(); return nep.store.lees('Antwoorden'); };
const opgeslagen = (page) => expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible();
// De tekst boven een schuif: de gekozen schijf of "Nog kiezen".
const waardeTekst = (page, id) => page.locator(`#${id}`).locator('xpath=preceding-sibling::div[1]');

async function kies(page, id, index) {
  await page.locator(`#${id}`).fill(String(index));
}

test('FRM-1 FRM-2 FRM-3 FRM-4 FRM-8 KAL-1: de vier vaste blokken invullen, opslaan en ingevuld zien', async ({ page, nep }) => {
  await page.goto('/#/formulier');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wanneer kun je?');
  for (const blok of ['Kalender', 'Budget (optioneel)', 'Reistijd (optioneel)', 'Verblijf (optioneel)']) await expect(page.getByRole('heading', { level: 2, name: blok, exact: true })).toBeVisible();
  await expect(page.getByText('Je geeft hier je voorkeuren op. Dat is geen garantie: de organisator zoekt wat het best past bij de hele groep.')).toBeVisible();
  await expect(page.getByLabel('Vertrek vanuit')).toHaveValue('Zwolle'); // FRM-3: standaard de woonplaats van het lid
  await expect(status(page)).toHaveText('Nog nodig: een weekend.'); // FRM-11
  await expect(waardeTekst(page, 'bv')).toContainText('Nog kiezen');

  await weekend(page, '9 apr').click(); // ja
  await expect(status(page)).toContainText('genoeg om als ingevuld te tellen'); // FRM-11: alleen de kalender is verplicht
  await kies(page, 'bv', 2); // FRM-2
  await expect(waardeTekst(page, 'bv')).toContainText('€100 tot €150');
  await kies(page, 'bw', 3);
  await expect(waardeTekst(page, 'bw')).toContainText('€300 tot €400');
  await kies(page, 'rt', 1); // 2 uur
  await expect(waardeTekst(page, 'rt')).toContainText('2 uur');
  await page.getByLabel('Vertrek vanuit').fill('Utrecht');
  const sauna = page.getByRole('group', { name: 'Sauna' });
  await sauna.getByRole('button', { name: /Ja/ }).click(); // FRM-4
  await expect(sauna.getByRole('button', { name: /Ja/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('group', { name: 'Eigen kamer' }).getByRole('button', { name: /Liever wel/ }).click();
  await expect(page.getByRole('group', { name: 'Sauna' }).getByRole('button')).toHaveCount(3);
  await expect(page.getByRole('group', { name: 'Bubbelbad' }).getByRole('button', { name: /Liever wel/ })).toHaveCount(0);
  await expect(status(page)).toContainText('genoeg om als ingevuld te tellen');

  await page.getByRole('button', { name: 'Opslaan' }).click(); // FRM-8
  await opgeslagen(page);
  await expect(status(page)).toHaveText('Ingevuld');
  const rij = antwoorden(nep);
  expect(rij).toHaveLength(1);
  expect(rij[0].data).toMatchObject({ beschikbaarheid: { '2027-04-09': 'ja' }, budgetVerblijf: 15000, budgetWeekend: 40000, maxReistijdUur: 2, woonplaats: 'Utrecht', verblijf: { sauna: 'ja', eigenKamer: 'lieverWel' } });
  nep.store.nieuwVerzoek();
  expect(nep.store.vind('Deelnemers', 'dln0000000000002').ingevuld).toBe(true);

  await page.reload(); // de antwoorden komen terug
  await expect(weekend(page, '9 apr')).toHaveAttribute('aria-label', /: ja/);
  await expect(page.getByLabel('Vertrek vanuit')).toHaveValue('Utrecht');
  await expect(page.locator('#bv')).toHaveValue('2');
  await expect(status(page)).toHaveText('Dit is genoeg om als ingevuld te tellen. Vergeet niet op te slaan.');
});

test('FRM-10: een oude versie geeft de conflictmelding en de nieuwste antwoorden', async ({ page, nep, browser }) => {
  await page.goto('/#/formulier');
  await expect(weekend(page, '9 apr')).toBeVisible();

  // Een tweede context (ander apparaat) slaat eerst op.
  const context2 = await browser.newContext({ serviceWorkers: 'block' });
  await koppelNep(context2, nep);
  const page2 = await context2.newPage();
  await page2.goto('/#/formulier');
  await weekend(page2, '16 apr').click();
  await kies(page2, 'bv', 4);
  await kies(page2, 'bw', 1);
  await kies(page2, 'rt', 5);
  await page2.getByRole('button', { name: 'Opslaan' }).click();
  await opgeslagen(page2);

  // De eerste pagina kent nog versie 0.
  await weekend(page, '9 apr').click();
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByRole('alert')).toContainText('Je antwoorden zijn ergens anders gewijzigd');
  await expect(weekend(page, '16 apr')).toHaveAttribute('aria-label', /: ja/); // de nieuwste versie is geladen
  await expect(weekend(page, '9 apr')).toHaveAttribute('aria-label', /: niet ingevuld/);
  await page.getByRole('button', { name: 'Opslaan' }).click(); // nu met de juiste versie
  await opgeslagen(page);
  expect(antwoorden(nep)[0].versie).toBe(2);
  await context2.close();
});

test('FRM-11 DDL-1: alleen beschikbaarheid opslaan lukt, ook na de deadline, en de deadline staat als informatie bij het formulier', async ({ page, nep }) => {
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', 'demo-editie-2027', { deadline: '2020-01-01T23:59:00+01:00' }, 1);
  nep.store.flush();
  await page.goto('/#/formulier');
  await expect(page.getByText('Graag ingevuld vóór woensdag 1 januari')).toBeVisible();
  await expect(weekend(page, '9 apr')).toBeEnabled();
  await weekend(page, '9 apr').click();
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await opgeslagen(page);
  const rij = antwoorden(nep);
  expect(rij[0].data.budgetVerblijf).toBeUndefined();
  nep.store.nieuwVerzoek();
  expect(nep.store.vind('Deelnemers', 'dln0000000000002').ingevuld).toBe(true);
});

test('FRM-9: vanaf de stap Overzicht is het formulier alleen-lezen', async ({ page, nep }) => {
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', 'demo-editie-2027', { stap: 'overzicht' }, 1);
  nep.store.flush();
  await page.goto('/#/formulier');
  await expect(page.getByText('De stap Invullen is voorbij.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Opslaan' })).toHaveCount(0);
});

test('NFR-9: het formulier past op 360 pixels zonder horizontaal scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/formulier');
  await expect(page.getByRole('heading', { level: 2, name: 'Verblijf (optioneel)', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('AAN-51: nogmaals tikken op een verblijfswens haalt de keuze weg', async ({ page }) => {
  await page.goto('/#/formulier');
  const ja = page.getByRole('group', { name: 'Barbecue' }).getByRole('button', { name: /Ja/ });
  await ja.click();
  await expect(ja).toHaveAttribute('aria-pressed', 'true');
  await ja.click();
  await expect(ja).toHaveAttribute('aria-pressed', 'false');
});
