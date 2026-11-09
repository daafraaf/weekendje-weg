import { test, expect } from '@playwright/test';

test('rooktest: lege app opent zonder fouten', async ({ page }) => {
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle('Weekendje weg');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weekendje weg');
  expect(fouten).toEqual([]);
});
