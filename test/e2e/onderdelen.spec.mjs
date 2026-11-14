import { test as basis, expect } from '@playwright/test';
import { startDemo } from './hulp.mjs';

// OND-1, OND-2, AAN-80: de standaard van de bundel (boodschappen aan, de andere vier uit) en elk onderdeel afzonderlijk aan.
// De tests herschrijven de vlaggen in de bundel (zie zetOnderdelen); de app zelf heeft geen haak.
const test = basis.extend({});
test.use({ serviceWorkers: 'block' });

const ONDERDELEN = [
  { naam: 'boodschappen', kop: 'Boodschappen', rij: 'Boodschappenlijst' },
  { naam: 'kookbeurten', kop: 'Kookbeurten', rij: 'Kookbeurten' },
  { naam: 'programma', kop: 'Programma', rij: null },
  { naam: 'kamers', kop: 'Kamers', rij: 'Kamer' },
  { naam: 'carpool', kop: 'Carpool', rij: 'Carpool' },
];
const menu = (page) => page.getByRole('navigation', { name: 'Menu' });

test('OND-1 OND-2 AAN-80: standaard staat Boodschappen aan en staan de andere vier uit, zonder route, menu-item, startregel of sectie', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'voorbereiding', onderdelen: 'standaard' });
  try {
    await page.goto('/#/start');
    await expect(page.locator('[data-boven]')).toContainText('Wie neemt wat mee');
    // AAN-80: Boodschappen staat aan, als regel op Start; geen eigen menu-item (een tab onder Meenemen, MEE-11).
    await expect(page.locator('[data-boven]').getByRole('link', { name: /^Boodschappenlijst/ })).toBeVisible();
    await expect(menu(page).getByRole('link', { name: 'Boodschappen', exact: true })).toHaveCount(0);
    for (const o of ONDERDELEN.filter((x) => x.naam !== 'boodschappen')) {
      if (o.rij) await expect(page.locator('[data-boven]').getByRole('link', { name: new RegExp(`^${o.rij}`) })).toHaveCount(0);
      await expect(menu(page).getByRole('link', { name: o.kop, exact: true })).toHaveCount(0);
      await page.goto(`/#/${o.naam}`);
      await expect(page.getByRole('heading', { level: 1, name: o.kop, exact: true })).toHaveCount(0); // onbekende route valt terug op start
    }
    await page.goto('/#/meenemen');
    await expect(page.getByRole('heading', { level: 2, name: 'Spullen' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Boodschappen die iemand meeneemt' })).toBeVisible();
    await page.goto('/#/boodschappen');
    await expect(page.getByRole('heading', { level: 1, name: 'Boodschappen', exact: true })).toBeVisible();
  } finally { nep.server.close(); }
});

for (const o of ONDERDELEN) {
  test(`OND-1 OND-2: het onderdeel ${o.naam} aanzetten brengt zijn scherm terug`, async ({ page, context }) => {
    const { nep } = await startDemo(context, { stap: 'voorbereiding', onderdelen: [o.naam] });
    try {
      await page.goto(`/#/${o.naam}`);
      await expect(page.getByRole('heading', { level: 1, name: o.kop, exact: true })).toBeVisible();
      if (o.rij) {
        await page.goto('/#/start');
        await expect(page.locator('[data-boven]').getByRole('link', { name: new RegExp(`^${o.rij}`) })).toBeVisible();
      }
    } finally { nep.server.close(); }
  });
}
