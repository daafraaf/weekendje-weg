import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';

// Demo in de stap Voorbereiding met de startlijst als items; de deelnemerssessie is Anna.
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { antwoorden: true, stap: 'voorbereiding', items: true }); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });

const ANNA = 'dln0000000000002';
const sync = (page) => page.locator('.sync');
const keuken = (page) => page.getByRole('list', { name: 'Uit eigen keuken' }).locator('[data-item]');
const mijnClaims = (nep) => { nep.store.nieuwVerzoek(); return nep.store.lees('Claims').filter((c) => c.deelnemerId === ANNA); };

async function open(page) {
  await page.goto('/#/meenemen');
  await expect(keuken(page)).toHaveCount(9);
}

test('SYNC-1 SYNC-2 SYNC-4: claimen staat direct in beeld zonder lader, tien snelle klikken gaan in hooguit drie aanroepen en staan er na verversen', async ({ page, nep }) => {
  await open(page);
  const lezen = nep.aanroepen('scherm');
  const rijen = keuken(page);
  await rijen.nth(0).getByRole('button', { name: /^Ik neem .* mee$/ }).click();
  await expect(rijen.nth(0).locator('.chip')).toHaveText(['jij'], { timeout: 500 }); // SYNC-1: zonder te wachten op de Sheet
  await expect(page.locator('.lader')).toBeHidden();
  await expect(sync(page)).toHaveText('Opslaan…'); // SYNC-4
  for (let i = 1; i < 9; i += 1) await rijen.nth(i).getByRole('button', { name: /^Ik neem .* mee$/ }).click();
  await rijen.nth(0).getByRole('button', { name: /^Claim op .* intrekken$/ }).click(); // de tiende klik draait de eerste terug
  await expect(rijen.nth(0)).toContainText('nog niemand');
  await expect(sync(page)).toHaveText('Opgeslagen');

  expect(nep.aanroepen('bundel')).toBeGreaterThanOrEqual(1);
  expect(nep.aanroepen('bundel')).toBeLessThanOrEqual(3);
  expect(nep.aanroepen('scherm')).toBe(lezen); // geen herlaadronde per klik
  expect(mijnClaims(nep)).toHaveLength(8);

  await page.reload();
  await expect(keuken(page)).toHaveCount(9);
  await expect(rijen.nth(0)).toContainText('nog niemand');
  for (let i = 1; i < 9; i += 1) await expect(rijen.nth(i).locator('.chip')).toHaveText(['jij']);
});

test('SYNC-5: een netwerkfout toont Niet opgeslagen, wordt opnieuw geprobeerd en lukt na herstel', async ({ page, nep }) => {
  await open(page);
  nep.zetStoring(['bundel']);
  await keuken(page).nth(0).getByRole('button', { name: /^Ik neem .* mee$/ }).click();
  await expect(keuken(page).nth(0).locator('.chip')).toHaveText(['jij']);
  await expect(sync(page)).toHaveText('Niet opgeslagen, opnieuw proberen');
  const mislukt = nep.aanroepen('bundel');
  nep.zetStoring([]);
  await expect(sync(page)).toHaveText('Opgeslagen', { timeout: 10000 }); // de volgende poging komt na 2 seconden
  expect(nep.aanroepen('bundel')).toBeGreaterThan(mislukt);
  expect(mijnClaims(nep)).toHaveLength(1);
  await expect(keuken(page).nth(0).locator('.chip')).toHaveText(['jij']);
});

test('SYNC-5 AAN-82: lukt het na alle pogingen niet, dan gaat de wijziging terug met een melding en de knop Opnieuw', async ({ page, nep }) => {
  await page.clock.install();
  await open(page);
  nep.zetStoring(['bundel']);
  const rij = keuken(page).nth(0);
  await rij.getByRole('button', { name: /^Ik neem .* mee$/ }).click();
  await expect(rij.locator('.chip')).toHaveText(['jij']);
  const melding = page.locator('.sync-terug');
  // Debounce en de wachttijden 2, 4, 8, 16 en 30 seconden; de klok springt telkens vooruit.
  for (let i = 0; i < 12 && !(await melding.isVisible()); i += 1) {
    await page.clock.fastForward(31000);
    await page.waitForTimeout(300);
  }
  await expect(melding).toContainText('Niet opgeslagen. Je wijziging is teruggezet.');
  await expect(rij).toContainText('nog niemand'); // teruggedraaid in beeld
  expect(mijnClaims(nep)).toHaveLength(0);

  nep.zetStoring([]);
  await melding.getByRole('button', { name: 'Opnieuw' }).click();
  await expect(rij.locator('.chip')).toHaveText(['jij']);
  await expect(sync(page)).toHaveText('Opgeslagen');
  await expect(melding).toBeHidden();
  expect(mijnClaims(nep)).toHaveLength(1);
});

test('SYNC-3 SYNC-6: wat nog niet verstuurd is, staat in localStorage, waarschuwt bij verlaten en gaat na herladen alsnog', async ({ page, nep }) => {
  await open(page);
  nep.zetStoring(['bundel']);
  await keuken(page).nth(2).getByRole('button', { name: /^Ik neem .* mee$/ }).click();
  await expect(sync(page)).toHaveText('Niet opgeslagen, opnieuw proberen');
  const bewaard = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ww-wachtrij:')).map((k) => localStorage.getItem(k)));
  expect(bewaard).toHaveLength(1);
  expect(bewaard[0]).toContain('claimen');
  // SYNC-6: de pagina vraagt om bevestiging bij verlaten.
  const waarschuwt = () => page.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
  expect(await waarschuwt()).toBe(true);

  nep.zetStoring([]);
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.reload();
  await expect(sync(page)).toHaveText('Opgeslagen', { timeout: 10000 });
  expect(mijnClaims(nep)).toHaveLength(1);
  await expect(keuken(page).nth(2).locator('.chip')).toHaveText(['jij']);
  expect(await waarschuwt()).toBe(false);
});

test('SYNC-8: een grote actie wacht op de Sheet met de bezig-status op de knop', async ({ page }) => {
  await open(page);
  // Het script antwoordt traag op itemOpslaan; de rest gaat gewoon door naar de nepbackend.
  await page.route('https://script.google.com/**', async (route) => {
    if ((route.request().postData() || '').includes('"itemOpslaan"')) await new Promise((r) => setTimeout(r, 1500));
    await route.fallback();
  });
  await page.getByLabel('Nieuwe boodschap', { exact: true }).fill('Chips');
  const knop = page.getByRole('button', { name: 'Nieuwe boodschap toevoegen' });
  await knop.click();
  await expect(knop).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.lader')).toHaveText('Opslaan…');
  await expect(page.getByText('Chips staat op de lijst.')).toBeVisible();
  await expect(page.locator('.lader')).toBeHidden();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});

test('SYNC-1 AAN-83: afvinken op de boodschappenlijst staat direct in beeld en de laatste klik wint', async ({ page, nep }) => {
  await page.goto('/#/boodschappen');
  const vink = page.getByRole('checkbox').first();
  await vink.check();
  await expect(vink).toBeChecked();
  await vink.uncheck();
  await vink.check();
  await expect(sync(page)).toHaveText('Opgeslagen');
  nep.store.nieuwVerzoek();
  const naam = await vink.getAttribute('aria-label');
  expect(nep.store.lees('Items').find((i) => i.naam === naam).afgevinkt).toBe(true);
  expect(nep.aanroepen('bundel')).toBe(1);
});
