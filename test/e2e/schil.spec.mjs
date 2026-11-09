import { test as basis, expect } from '@playwright/test';
import { logIn } from './hulp.mjs';

// De schil staat achter het pinscherm; deze tests starten met een bestaande sessie (fase 3).
const test = basis.extend({
  context: async ({ context }, use) => { await logIn(context); await use(context); },
});

const breedtes = [360, 1440];

for (const breedte of breedtes) {
  test(`STA-1 NFR-9: stappenbalk zichtbaar op ${breedte} pixels`, async ({ page }) => {
    await page.setViewportSize({ width: breedte, height: 800 });
    await page.goto('/#/start?stap=voorbereiding');
    const balk = page.getByRole('navigation', { name: 'Stappen van de editie' });
    await expect(balk).toBeVisible();
    if (breedte >= 768) {
      const stappen = balk.locator('.sb-stap');
      await expect(stappen).toHaveCount(7);
      await expect(stappen.nth(3)).toHaveAttribute('aria-current', 'step');
      await expect(stappen.nth(0)).toContainText('tot 1 dec');
      await expect(stappen.nth(4)).toContainText('volgt');
      await expect(stappen.nth(0).locator('svg')).toBeVisible();
    } else {
      await expect(balk.locator('.seg')).toHaveCount(7);
      await expect(balk.locator('.sb-nu')).toHaveText('4 · Voorbereiding');
    }
    // NFR-9: geen horizontaal scrollen
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('STA-2: op mobiel klapt tikken alle stappen uit', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/start?stap=accommodatie');
  const balk = page.getByRole('navigation', { name: 'Stappen van de editie' });
  const knop = balk.getByRole('button', { name: 'Alle stappen tonen' });
  await expect(balk.locator('.sb-buur').first()).toHaveText('Overzicht');
  await expect(balk.locator('.sb-lijst')).toBeHidden();
  const doos = await knop.boundingBox();
  expect(doos.width).toBeGreaterThanOrEqual(44);
  expect(doos.height).toBeGreaterThanOrEqual(44);
  await knop.click();
  await expect(balk.locator('.sb-lijst')).toBeVisible();
  await expect(balk.locator('.sb-stap')).toHaveCount(7);
  await expect(balk.getByRole('button', { name: 'Stappen inklappen' })).toHaveAttribute('aria-expanded', 'true');
});

for (const schema of ['light', 'dark']) {
  test(`NFR-10: thema volgt ${schema} en wisselt live`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: schema === 'light' ? 'dark' : 'light' });
    await page.goto('/');
    const kleur = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg-top').trim().toUpperCase());
    expect(await kleur()).toBe(schema === 'light' ? '#0F1620' : '#EAF2FA');
    await page.emulateMedia({ colorScheme: schema });
    expect(await kleur()).toBe(schema === 'light' ? '#EAF2FA' : '#0F1620');
  });
}

test('NFR-12: offline-melding verschijnt en verdwijnt', async ({ page, context }) => {
  await page.goto('/');
  const melding = page.getByRole('alert');
  await expect(melding).toBeHidden();
  await context.setOffline(true);
  await expect(melding).toContainText('Geen verbinding, je gegevens zijn veilig opgeslagen in de Sheet');
  await expect(page.locator('html')).toHaveClass(/is-offline/);
  await expect(page.getByRole('navigation', { name: 'Stappen van de editie' })).toBeVisible();
  await context.setOffline(false);
  await expect(melding).toBeHidden();
});

test('NFR-8 RON-6: schil laadt uit de cache van de service worker', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload(); // de worker beheert de pagina pas na de eerste herlaadbeurt
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Stappen van de editie' })).toBeVisible({ timeout: 1000 });
  await expect(page.getByRole('alert')).toContainText('Geen verbinding');
});

test('RON-6: manifest heeft naam, iconen en standalone', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await request.get(new URL(href, page.url()).href);
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe('Weekendje weg');
  expect(m.display).toBe('standalone');
  const maat = (s) => m.icons.find((i) => i.sizes === s && i.purpose === 'any');
  expect(maat('192x192')).toBeTruthy();
  expect(maat('512x512')).toBeTruthy();
  expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const i of m.icons) expect((await request.get(new URL(i.src, page.url()).href)).ok()).toBe(true);
});

test('AAN-40: onbekende stap in de link valt terug op Invullen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/#/start?stap=bestaatniet');
  await expect(page.locator('.sb-stap.now .sb-naam')).toHaveText('Invullen');
});
