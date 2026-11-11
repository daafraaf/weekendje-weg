import { test as basis, expect } from '@playwright/test';
import { startNep, koppelNep } from './hulp.mjs';

// Demo in de stap Voorbereiding met de startlijst als items en de demoantwoorden; de deelnemerssessie is Anna.
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { antwoorden: true, stap: 'voorbereiding', items: true }); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });

const VERWACHT = [
  'Groente en fruit', '- Bananen', '', 'Ontbijt en beleg', '- Koffie', '- Pindakaas', '- Suiker', '- Thee', '',
  'Conserven en sauzen', '- Ketchup', '- Kruiden', '- Mayonaise', '- Olijfolie', '- Zout en peper', '',
  'Frisdrank, bier en wijn', '- 0,0 bier',
].join('\n');

async function zaai(nep) {
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Items', { editieId: 'demo-editie-2027', soort: 'boodschap', naam: 'Bananen', categorie: 'Groente en fruit', maaltijdId: '', toegevoegdDoor: '', afgevinkt: false });
  nep.store.voegToe('Items', { editieId: 'demo-editie-2027', soort: 'boodschap', naam: '0,0 bier', categorie: 'Frisdrank, bier en wijn', maaltijdId: '', toegevoegdDoor: '', afgevinkt: false });
  nep.store.flush();
}

test('MEE-5 MEE-7 MEE-8 MEE-9: lijst op supermarktvolgorde, tellingen, afvinken in een tweede context en kopiëren', async ({ page, nep, context, browser }) => {
  // Het klembord verschilt per browser en platform; de test vangt de tekst op die de app naar writeText stuurt.
  await context.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__kopie = t; } } }); });
  await zaai(nep);
  await page.goto('/#/boodschappen');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Boodschappen');
  // MEE-5: categorievolgorde van §7.8.2; Spullen staan er niet op.
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Groente en fruit', 'Ontbijt en beleg', 'Conserven en sauzen', 'Frisdrank, bier en wijn']);
  await expect(page.getByText('Speaker')).toHaveCount(0);
  // MEE-9: de telling uit eten en drinken staat bij het item.
  await expect(page.locator('[data-item]', { hasText: '0,0 bier' })).toContainText('0,0 bier: 1 persoon');
  await expect(page.getByText('0 van 11 afgevinkt')).toBeVisible();

  // MEE-8: de gekopieerde tekst is gelijk aan de vaste verwachte tekst.
  await page.getByRole('button', { name: 'Kopieer als tekst' }).click();
  await expect(page.getByText('Gekopieerd.')).toBeVisible();
  expect(await page.evaluate(() => window.__kopie)).toBe(VERWACHT);

  // MEE-7: afvinken is gedeeld; het item staat doorgestreept onderaan zijn categorie en valt weg uit de kopie.
  await page.getByRole('checkbox', { name: 'Koffie' }).check();
  await expect(page.getByText('1 van 11 afgevinkt')).toBeVisible();
  await expect(page.locator('[data-item]', { hasText: 'Koffie' }).locator('.klaar')).toHaveCount(1);
  await expect(page.getByRole('list', { name: 'Ontbijt en beleg' }).locator('[data-item]').last()).toContainText('Koffie');
  await expect(page.locator('.sync')).toHaveText('Opgeslagen'); // SYNC-2: het vinkje gaat na de debounce naar de Sheet
  const tweede = await browser.newContext({ baseURL: new URL(page.url()).origin, serviceWorkers: 'block' });
  await koppelNep(tweede, nep);
  const pagina2 = await tweede.newPage();
  await pagina2.goto('/#/boodschappen');
  await expect(pagina2.getByRole('checkbox', { name: 'Koffie' })).toBeChecked();
  await pagina2.getByRole('checkbox', { name: 'Koffie' }).uncheck();
  await expect(pagina2.getByText('0 van 11 afgevinkt')).toBeVisible();
  await expect(pagina2.locator('.sync')).toHaveText('Opgeslagen');
  await tweede.close();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Koffie' })).not.toBeChecked();
});

test('MEE-6: na definitief toont de lijst Definitief, toevoegen geeft gesloten en afvinken werkt nog', async ({ page, nep }) => {
  await zaai(nep);
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', 'demo-editie-2027', { boodschappenDefinitief: true }, 1);
  nep.store.flush();
  await page.goto('/#/boodschappen');
  await expect(page.getByText('Definitief', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /definitief/i })).toHaveCount(0); // Anna is geen organisator
  const toevoegen = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ apiVersie: 2, editieId: 'demo-editie-2027', actie: 'itemOpslaan', sessie: 'lokaal', data: { soort: 'boodschap', naam: 'Chips' } }) }).then((r) => r.json());
  expect(toevoegen.ok).toBe(false);
  expect(toevoegen.fout).toBe('gesloten');
  await page.getByRole('checkbox', { name: 'Bananen' }).check();
  await expect(page.getByText('1 van 11 afgevinkt')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Bananen' })).toBeChecked();
});
