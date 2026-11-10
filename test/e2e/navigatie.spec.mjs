import { test as basis, expect } from '@playwright/test';
import { startNep, startDemo } from './hulp.mjs';

const test = basis.extend({});
test.use({ serviceWorkers: 'block' });

const menu = (page) => page.getByRole('navigation', { name: 'Menu' });

test('NAV-1 NAV-2 NAV-3 NAV-6 NAV-8: Uitleg en uitloggen zitten in het profielmenu, niet in het hoofdmenu', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'accommodatie' });
  try {
    await page.goto('/#/start');
    await expect(menu(page).getByRole('link', { name: 'Invullen', exact: true })).toHaveCount(1);
    await expect(menu(page).getByRole('link', { name: 'Archief' })).toHaveCount(0);
    await expect(menu(page).getByRole('link', { name: 'Uitleg' })).toHaveCount(0);
    const knop = page.getByRole('button', { name: 'Profiel en uitleg' });
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    await knop.click();
    await expect(knop).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Uitleg' })).toBeFocused();
    await page.keyboard.press('Escape'); // NAV-3
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    await expect(knop).toBeFocused();
    await knop.click();
    await page.getByRole('heading', { level: 1 }).click(); // een tik buiten het menu sluit het
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    // NAV-8: ook op een ander scherm bereikbaar
    await page.goto('/#/voortgang');
    await page.getByRole('button', { name: 'Profiel en uitleg' }).click();
    await page.getByRole('link', { name: 'Uitleg' }).click();
    await expect(page.getByRole('heading', { name: 'Welkom bij Weekendje weg' })).toBeVisible();
    await page.getByRole('button', { name: 'Profiel en uitleg' }).click();
    await page.getByRole('button', { name: 'Uitloggen' }).last().click();
    await expect(page.getByRole('heading', { name: 'Welkom bij Weekendje weg' })).toHaveCount(0);
    await expect(menu(page)).toBeHidden();
  } finally { nep.server.close(); }
});

test('NAV-4 NAV-5: Afgelopen weekenden is dicht bij een lopende editie en toont alleen afgeronde edities', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'accommodatie', als: 'Bas' });
  try {
    await page.goto('/#/start');
    const sectie = page.locator('details.afgelopen');
    await expect(sectie).not.toHaveAttribute('open', '');
    await sectie.locator('summary').click();
    await expect(sectie.locator('[data-editie]')).toHaveCount(1); // alleen 2026; de lopende editie staat al bovenaan
    await expect(sectie.locator('[data-editie]')).toContainText('2026');
    await sectie.getByRole('link', { name: 'Bekijk' }).click();
    await expect(page).toHaveURL(/#\/start\?editie=/);
  } finally { nep.server.close(); }
});

test('NAV-4: bij een afgeronde editie staat Afgelopen weekenden open', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'afgerond' });
  try {
    await page.goto('/#/start');
    await expect(page.locator('details.afgelopen')).toHaveAttribute('open', '');
    await expect(page.locator('details.afgelopen [data-editie]').first()).toBeVisible();
  } finally { nep.server.close(); }
});

test('NAV-7: een vraagteken klapt een korte hint open en dicht', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'invullen' });
  try {
    await page.goto('/#/formulier');
    const knop = page.getByRole('button', { name: 'Uitleg bij Kalender' });
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    await knop.click();
    await expect(knop).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/Hele maand/).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
  } finally { nep.server.close(); }
});
