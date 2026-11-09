import { test as basis, expect } from '@playwright/test';
import { logIn } from './hulp.mjs';

const test = basis.extend({
  context: async ({ context }, use) => { await logIn(context); await use(context); },
});

const april = (page) => page.getByRole('region', { name: 'April 2027' });
const weekend = (page, naam) => april(page).getByRole('button', { name: new RegExp(`^${naam}`) });

test('KAL-1 KAL-3 AAN-50: april 2027 met voorkeursmarkering en blanco weekenden', async ({ page }) => {
  await page.goto('/#/kalender');
  await expect(april(page)).toBeVisible();
  await expect(april(page).locator('.prefmerk')).toHaveText('voorkeursmaand');
  await expect(page.getByRole('region', { name: 'Maart 2027' }).locator('.prefmerk')).toHaveCount(0);
  await expect(april(page).locator('.band')).toHaveCount(5); // 2, 9, 16, 23 en 30 april
  await expect(page.getByText('0 van 53 weekenden ingevuld')).toBeVisible();
  await expect(page.getByText('voorkeursmaand').first()).toBeVisible(); // legenda
});

test('KAL-4: meivakantie per regio en Koningsdag onder april', async ({ page }) => {
  await page.goto('/#/kalender');
  await expect(april(page).getByText('Meivakantie, regio noord, midden, zuid: 24 apr tot en met 2 mei')).toBeVisible();
  await expect(april(page).getByText('Koningsdag: 27 apr')).toBeVisible();
  await expect(weekend(page, '23 apr')).toHaveAttribute('aria-label', /schoolvakantie regio noord, midden, zuid/);
  await expect(weekend(page, '23 apr').locator('.br')).toHaveText('N M Z');
});

test('KAL-2 AAN-17: tikken doorloopt de vier waarden met kleur en symbool', async ({ page }) => {
  await page.goto('/#/kalender');
  const knop = weekend(page, '9 apr');
  const verwacht = [['ja', '✓'], ['misschien', '~'], ['nee', '✕'], ['niet ingevuld', '']];
  for (const [label, symbool] of verwacht) {
    await knop.click();
    await expect(knop).toHaveAttribute('aria-label', new RegExp(`: ${label}`));
    await expect(knop.locator('.bs')).toHaveText(symbool);
  }
  await expect(page.getByText('0 van 53 weekenden ingevuld')).toBeVisible();
});

test('KAL-2: het toetsenbord wisselt met spatie en enter', async ({ page }) => {
  await page.goto('/#/kalender');
  const knop = weekend(page, '16 apr');
  await knop.focus();
  await page.keyboard.press('Space');
  await expect(knop).toHaveAttribute('aria-label', /: ja/);
  await page.keyboard.press('Enter');
  await expect(knop).toHaveAttribute('aria-label', /: misschien/);
  await expect(page.getByText('1 van 53 weekenden ingevuld')).toBeVisible();
});

test('KAL-7: Hele maand vult alleen de lege weekenden', async ({ page }) => {
  await page.goto('/#/kalender');
  const weekenden = april(page).locator('.band');
  await weekend(page, '9 apr').click(); // ja
  await weekend(page, '9 apr').click(); // misschien
  await april(page).getByRole('button', { name: 'Hele maand' }).click();
  await april(page).getByRole('button', { name: 'Lege weekenden van april op nee' }).click();
  await expect(weekenden.nth(1)).toHaveAttribute('aria-label', /: misschien/);
  for (const i of [0, 2, 3, 4]) await expect(weekenden.nth(i)).toHaveAttribute('aria-label', /: nee/);
  await expect(page.getByText('5 van 53 weekenden ingevuld')).toBeVisible();
});

test('KAL-6: een maand buiten de bekende schooljaren meldt dat vakanties nog niet bekend zijn', async ({ page }) => {
  await page.goto('/#/kalender');
  await expect(page.getByRole('region', { name: 'September 2027' }).getByText('Schoolvakanties nog niet bekend.')).toBeVisible();
});

test('NFR-9: de kalender past op 360 pixels zonder horizontaal scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/kalender');
  await expect(april(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
