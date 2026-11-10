import { test as basis, expect } from '@playwright/test';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';
import { hashToken } from '../../src/server/crypto.js';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';
import { koppelNep } from './hulp.mjs';

// Hier juist zonder gezien-vlag: de rondleiding moet vanzelf verschijnen (RON-1).
const test = basis.extend({
  nep: async ({ context }, use) => {
    const demo = maakDemo();
    const nep = await startServer({ port: 0, seed: demo.seed });
    nep.store.nieuwVerzoek();
    nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'lokaal'), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2099-01-01T00:00:00.000Z' });
    nep.store.flush();
    await koppelNep(context, nep, { rondleidingGezien: false });
    await use(nep);
    nep.server.close();
  },
});
test.use({ serviceWorkers: 'block' });

const volgende = (page) => page.getByRole('button', { name: 'Volgende' }).click();

test('RON-1 de rondleiding verschijnt één keer en telt vijf schermen', async ({ page, nep }) => {
  void nep;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welkom bij Weekendje weg' })).toBeVisible();
  await volgende(page);
  await expect(page.getByRole('heading', { name: 'Bewaar je pincode' })).toBeVisible();
  await volgende(page);
  await expect(page.getByRole('heading', { name: 'Zet de app op je beginscherm' })).toBeVisible();
  await volgende(page);
  await volgende(page);
  await expect(page.getByText('Rondleiding · 5 van 5')).toBeVisible();
  await page.getByRole('button', { name: 'Klaar' }).click();
  await expect(page).toHaveURL(/#\/start/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welkom bij Weekendje weg' })).toHaveCount(0);
});

test('RON-4 Overslaan telt als gezien en de rondleiding staat onder Uitleg', async ({ page, nep }) => {
  void nep;
  await page.goto('/');
  await page.getByRole('button', { name: 'Overslaan' }).click();
  await expect(page).toHaveURL(/#\/start/);
  await page.getByRole('button', { name: 'Profiel en uitleg' }).click();
  await page.getByRole('link', { name: 'Uitleg' }).click(); // NAV-2, NAV-6
  await expect(page.getByRole('heading', { name: 'Welkom bij Weekendje weg' })).toBeVisible();
});

test('RON-2 de uitleg volgt het gekozen apparaat', async ({ page, nep }) => {
  void nep;
  await page.goto('/');
  await volgende(page);
  await volgende(page);
  await page.getByRole('button', { name: 'iPhone' }).click();
  await expect(page.getByText('Zet op beginscherm').first()).toBeVisible();
  await page.getByRole('button', { name: 'Android' }).click();
  await expect(page.getByText('App installeren')).toBeVisible();
  await page.getByRole('button', { name: 'Laptop' }).click();
  await expect(page.getByText(/Weekendje weg installeren|Zet een bladwijzer/)).toBeVisible();
});

test('RON-3 de knop Installeren verschijnt na beforeinstallprompt', async ({ page, nep }) => {
  void nep;
  await page.goto('/');
  await volgende(page);
  await volgende(page);
  await page.getByRole('button', { name: 'Android' }).click();
  await expect(page.getByRole('button', { name: 'Installeren', exact: true })).toBeHidden();
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    e.prompt = () => { window.__prompt = true; return Promise.resolve(); };
    window.dispatchEvent(e);
  });
  await page.getByRole('button', { name: 'Installeren', exact: true }).click();
  expect(await page.evaluate(() => window.__prompt)).toBe(true);
});
