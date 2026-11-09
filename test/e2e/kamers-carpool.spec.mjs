import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';

// Demo in de stap Voorbereiding met de demoantwoorden; de sessie is Anna (Zwolle).
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { antwoorden: true, stap: 'voorbereiding' }); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });
const EDITIE = 'demo-editie-2027';

test('KMR-1: de indeling toont kamers, bewoners en de wens voor een eigen kamer; wie geen kamer heeft staat apart', async ({ page, nep }) => {
  nep.store.nieuwVerzoek();
  const zolder = nep.store.voegToe('Kamers', { editieId: EDITIE, naam: 'Zolder', slaapplaatsen: 2 });
  nep.store.voegToe('Kamerindeling', { kamerId: zolder.id, deelnemerId: 'dln0000000000003' });
  nep.store.flush();
  await page.goto('/#/kamers');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kamers');
  await expect(page.locator('[data-kamer="Zolder"]')).toContainText('Zolder · 1 van 2');
  await expect(page.locator('[data-kamer="Zolder"] [data-bewoner="Bram"]')).toBeVisible();
  // Eva heeft geen kamer en wil liever een eigen kamer.
  await expect(page.locator('[data-zonder="Eva"]')).toContainText('Eigen kamer: liever wel');
  // Een deelnemer deelt niet in.
  await expect(page.getByRole('button', { name: 'Kamer toevoegen' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /indelen$/ })).toHaveCount(0);
});

test('CAR-1: een rit aanbieden, een volle rit weigert meerijden en wie geen rit heeft staat in een aparte lijst', async ({ page, nep }) => {
  nep.store.nieuwVerzoek();
  const rit = nep.store.voegToe('Ritten', { editieId: EDITIE, bestuurderId: 'dln0000000000003', vertrekplaats: 'Arnhem', vrijePlaatsen: 1 });
  nep.store.voegToe('Meerijders', { ritId: rit.id, deelnemerId: 'dln0000000000004' });
  nep.store.flush();
  await page.goto('/#/carpool');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Carpool');
  // De rit van Bram is vol: Chris rijdt mee, meerijden kan niet meer.
  await expect(page.locator('[data-rit="Bram"]')).toContainText('vol');
  await expect(page.getByRole('button', { name: 'Rij mee met Bram' })).toBeDisabled();
  await expect(page.locator('[data-rit="Bram"] [data-meerijder="Chris"]')).toContainText('Breda');
  // Anna en Eva hebben nog geen rit, met hun woonplaats.
  await expect(page.locator('[data-zonder="Anna"]')).toContainText('Zwolle');
  await expect(page.locator('[data-zonder="Eva"]')).toContainText('Utrecht');
  // Een eigen rit aanbieden; de vertrekplaats staat voorgevuld met de woonplaats.
  await expect(page.getByLabel('Vertrekplaats')).toHaveValue('Zwolle');
  await page.getByLabel('Vrije plaatsen').fill('2');
  await page.getByRole('button', { name: 'Rit aanbieden', exact: true }).click();
  await expect(page.locator('[data-rit="Anna"]')).toContainText('Vertrekt uit Zwolle · 2 plekken vrij');
  await expect(page.locator('[data-zonder]')).toHaveCount(1); // Anna staat er niet meer tussen
  await expect(page.locator('[data-zonder="Eva"]')).toBeVisible();
  // Annuleren haalt de rit weg.
  await page.getByRole('button', { name: 'Mijn rit aanpassen' }).click();
  await page.getByRole('button', { name: 'Mijn rit annuleren' }).click();
  await expect(page.locator('[data-rit="Anna"]')).toHaveCount(0);
});
