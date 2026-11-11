import { test as basis, expect } from '@playwright/test';
import { startDemo } from './hulp.mjs';

const test = basis.extend({});
test.use({ serviceWorkers: 'block' });

const route = (page) => page.getByRole('region', { name: 'Zo gaat het weekend' });

test('UIT-1 UIT-2 UIT-3 AAN-85: nieuwe gebruiker ziet de route, sluit hem, ziet hem niet meer en haalt hem terug', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Bas', routeGezien: false });
  try {
    await page.goto('/');
    await expect(route(page)).toBeVisible();
    await expect(route(page).getByRole('heading', { level: 3 })).toHaveText(['Invullen', 'Weekendje prikker', 'Accommodatie', 'Meenemen', 'Weekend', 'Afrekening']);
    await expect(route(page)).toContainText('Jij: Vul het formulier in');
    await route(page).getByRole('button', { name: 'Sluiten' }).click();
    await expect(route(page)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('ww-route-gezien'))).toBe('1');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(route(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Hoe werkt het?' }).click();
    await expect(route(page)).toBeVisible();
  } finally { nep.server.close(); }
});

test('UIT-1 UIT-2: de organisator krijgt zijn eigen tekst in de route', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Anne', beheer: true, routeGezien: false });
  try {
    await page.goto('/');
    await expect(route(page)).toContainText('Jij: Nodig iedereen uit');
    await expect(route(page)).not.toContainText('Jij: Vul het formulier in');
  } finally { nep.server.close(); }
});

test('UIT-4 UIT-2: het info-icoon bij de stappenbalk toont de uitleg van de huidige stap', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'accommodatie', als: 'Bas' });
  try {
    await page.goto('/');
    await expect(route(page)).toHaveCount(0);
    const balk = page.getByRole('navigation', { name: 'Stappen van de editie' });
    const knop = balk.getByRole('button', { name: 'Uitleg bij de huidige stap' });
    await expect(knop).toHaveCount(1); // de andere variant is verborgen
    await knop.click();
    await expect(balk.getByText('Stap 3: Accommodatie')).toBeVisible();
    await expect(balk).toContainText('Jij: Bij Samen kiezen zet je je top 3 neer');
    await knop.click();
    await expect(balk.getByText('Stap 3: Accommodatie')).toBeHidden();
  } finally { nep.server.close(); }
});

test('UIT-4: de balk van de organisator toont de tekst voor de organisator', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'overzicht', als: 'Anne', beheer: true });
  try {
    await page.goto('/');
    const balk = page.getByRole('navigation', { name: 'Stappen van de editie' });
    await balk.getByRole('button', { name: 'Uitleg bij de huidige stap' }).click();
    await expect(balk).toContainText('Jij: Kies het beste weekend');
  } finally { nep.server.close(); }
});
