import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';
import { hashToken } from '../../src/server/crypto.js';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

// Demo in de stap Voorbereiding met de startlijst als items; de deelnemerssessie is Anna.
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { antwoorden: true, stap: 'voorbereiding', items: true }); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });

test('MEE-1 MEE-2 MEE-3 MEE-4: drie secties, claimen en intrekken, een tweede claim en een eigen item', async ({ page, nep }) => {
  // Bram claimt de pindakaas buiten de pagina om (een tweede persoon op hetzelfde item).
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'bram'), soort: 'deelnemer', subjectId: 'dln0000000000003', verloopt: '2099-01-01T00:00:00.000Z' });
  const pindakaasId = nep.store.lees('Items').find((i) => i.naam === 'Pindakaas').id;
  nep.store.flush();
  const bram = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ apiVersie: 2, editieId: 'demo-editie-2027', actie: 'claimen', sessie: 'bram', data: { itemId: pindakaasId } }) }).then((r) => r.json());
  expect(bram.ok).toBe(true);

  await page.goto('/#/meenemen');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wie neemt wat mee');
  // MEE-1: de drie secties.
  for (const kop of ['Spullen', 'Uit eigen keuken', 'Boodschappen die iemand meeneemt']) await expect(page.getByRole('heading', { level: 2, name: kop })).toBeVisible();
  const lijst = (naam) => page.getByRole('list', { name: naam });
  await expect(lijst('Spullen').getByRole('listitem')).toHaveCount(3);
  await expect(lijst('Uit eigen keuken').getByRole('listitem')).toHaveCount(9);

  // MEE-2 en MEE-3: Anna claimt na Bram; het item toont beide namen op volgorde van claim.
  const pinda = page.locator('[data-item]', { hasText: 'Pindakaas' });
  await expect(pinda).toContainText('Bram');
  await pinda.getByRole('button', { name: 'Ik neem Pindakaas mee' }).click();
  await expect(pinda.locator('.chip')).toHaveText(['Bram', 'jij']);
  await pinda.getByRole('button', { name: 'Claim op Pindakaas intrekken' }).click();
  await expect(pinda.locator('.chip')).toHaveText(['Bram']);
  await page.locator('[data-item]', { hasText: 'Speaker' }).getByRole('button', { name: 'Ik neem Speaker mee' }).click();
  await expect(page.locator('[data-item]', { hasText: 'Speaker' }).locator('.chip')).toHaveText(['jij']);
  await expect(page.locator('[data-item]', { hasText: 'Kaartspel' })).toContainText('nog niemand');

  // MEE-4: een boodschap met voorgestelde categorie, daarna weer verwijderen (eigen item).
  await page.getByLabel('Nieuwe boodschap', { exact: true }).fill('Rode wijn');
  await expect(page.getByLabel('Categorie van nieuwe boodschap')).toHaveValue('Frisdrank, bier en wijn');
  await page.getByRole('button', { name: 'Nieuwe boodschap toevoegen' }).click();
  await expect(page.getByText('Rode wijn staat op de lijst.')).toBeVisible();
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Items').find((i) => i.naam === 'Rode wijn').categorie).toBe('Frisdrank, bier en wijn');
  const wijn = page.locator('[data-item]', { hasText: 'Rode wijn' });
  await expect(wijn.getByRole('button', { name: 'Ik neem Rode wijn mee' })).toBeVisible();
  await wijn.getByRole('button', { name: 'Rode wijn verwijderen' }).click();
  await wijn.getByRole('button', { name: 'Rode wijn definitief verwijderen' }).click();
  await expect(page.getByText('Rode wijn is verwijderd.')).toBeVisible();
  // Een startitem is van niemand: Anna ziet er geen verwijderknop bij.
  await expect(page.getByRole('button', { name: 'Olijfolie verwijderen' })).toHaveCount(0);
});
