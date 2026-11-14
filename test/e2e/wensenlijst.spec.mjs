// Fase 35: boodschappen als wensenlijst onder Meenemen (OND-1, MEE-11, MEE-12, MEE-13, AAN-80, AAN-93), op 390 en 1280 pixels.
import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';

const EDITIE = 'demo-editie-2027';
const BRAM = 'dln0000000000003';
const WEEKEND = '2027-05-21';
const menu = (page) => page.getByRole('navigation', { name: 'Menu' });
const main = (page) => page.locator('main');

// Demo in de stap Meenemen met de startlijst; `weekend` legt een weekend vast (AAN-93). De sessie is Anna.
const test = basis.extend({
  weekend: [WEEKEND, { option: true }],
  nep: [async ({ context, weekend }, use) => {
    const nep = await startNep(context, { antwoorden: true, stap: 'voorbereiding', items: true, weekend });
    await use(nep);
    nep.server.close();
  }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });

const vraag = (nep, actie, data) => fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ apiVersie: 3, editieId: EDITIE, actie, sessie: 'lokaal', data }) }).then((r) => r.json());
function werkEditieBij(nep, velden) {
  nep.store.nieuwVerzoek();
  const e = nep.store.vind('Edities', EDITIE);
  nep.store.werkBij('Edities', EDITIE, velden, e.versie);
  nep.store.flush();
}
const rij = (page, naam) => main(page).locator('[data-item]', { hasText: naam });

for (const breedte of [390, 1280]) {
  test.describe(`${breedte} pixels`, () => {
    test.use({ viewport: { width: breedte, height: 900 } });

    test.describe('zonder vastgelegd weekend', () => {
      test.use({ weekend: '' });
      test('MEE-13 AAN-93: de tab toont de wachttekst en het script weigert toevoegen met gesloten', async ({ page, nep }) => {
        await page.goto('/#/boodschappen');
        await expect(main(page).getByText('Komt zodra het weekend vastligt')).toBeVisible();
        await expect(main(page).getByLabel('Boodschap', { exact: true })).toHaveCount(0);
        await expect(main(page).locator('.mee-sectie')).toHaveCount(0); // de lijst is niet zichtbaar
        const r = await vraag(nep, 'boodschapToevoegen', { naam: 'Chips' });
        expect(r.fout).toBe('gesloten');
        // Ook via Wie neemt wat mee geen veld voor een nieuwe boodschap; spullen kan wel.
        await main(page).getByRole('navigation', { name: 'Meenemen' }).getByRole('link', { name: 'Wie neemt wat mee' }).click();
        await expect(main(page).getByLabel('Nieuwe boodschap', { exact: true })).toHaveCount(0);
        await expect(main(page).getByLabel('Nieuw item', { exact: true })).toBeVisible();
        await expect(main(page).getByText('Boodschappen toevoegen kan zodra het weekend vastligt.')).toBeVisible();
      });
    });

    test('MEE-11 MEE-12: een deelnemer zet een boodschap op de lijst, ziet wie wat toevoegde en haalt de zijne weer weg', async ({ page, nep }) => {
      nep.store.nieuwVerzoek();
      nep.store.voegToe('Items', { editieId: EDITIE, soort: 'boodschap', naam: 'La Chouffe, 6 flesjes', categorie: 'Frisdrank, bier en wijn', maaltijdId: '', toegevoegdDoor: BRAM, afgevinkt: false });
      nep.store.flush();
      await page.goto('/#/meenemen');
      // MEE-11: twee tabs onder Meenemen; het menu houdt zeven items en Meenemen is actief op beide.
      const tabs = main(page).getByRole('navigation', { name: 'Meenemen' });
      await expect(tabs.getByRole('link')).toHaveText(['Wie neemt wat mee', 'Boodschappen']);
      await expect(menu(page).getByRole('link')).toHaveCount(7);
      await expect(menu(page).getByRole('link', { name: 'Meenemen' })).toHaveAttribute('aria-current', 'page');
      await tabs.getByRole('link', { name: 'Boodschappen' }).click();
      await expect(page).toHaveURL(/#\/boodschappen/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Boodschappen');
      await expect(menu(page).getByRole('link')).toHaveCount(7);
      await expect(menu(page).getByRole('link', { name: 'Meenemen' })).toHaveAttribute('aria-current', 'page');
      await expect(tabs.getByRole('link', { name: 'Boodschappen' })).toHaveAttribute('aria-current', 'page');

      // MEE-12: naam en voorgestelde categorie.
      await main(page).getByLabel('Boodschap', { exact: true }).fill('Tripel Karmeliet, 4 flesjes');
      await expect(main(page).getByLabel('Categorie')).toHaveValue('Frisdrank, bier en wijn');
      await main(page).getByRole('button', { name: 'Op de lijst' }).click();
      await expect(main(page).getByLabel('Boodschap', { exact: true })).toHaveValue('');
      const lijst = main(page).getByRole('list', { name: 'Frisdrank, bier en wijn' });
      await expect(lijst.locator('[data-item]', { hasText: 'Tripel Karmeliet, 4 flesjes' })).toContainText('jij');
      await expect(lijst.locator('[data-item]', { hasText: 'La Chouffe' })).toContainText('Bram');
      await expect(rij(page, 'Koffie')).toContainText('uit eigen keuken');
      await expect(page.locator('.sync')).toHaveText('Opgeslagen');
      nep.store.nieuwVerzoek();
      expect(nep.store.lees('Items').filter((i) => i.naam === 'Tripel Karmeliet, 4 flesjes')).toHaveLength(1);

      // Alleen je eigen item heeft een knop om weg te halen.
      await expect(main(page).getByRole('button', { name: 'La Chouffe, 6 flesjes weghalen' })).toHaveCount(0);
      await main(page).getByRole('button', { name: 'Tripel Karmeliet, 4 flesjes weghalen' }).click();
      await expect(rij(page, 'Tripel Karmeliet')).toHaveCount(0);
      nep.store.nieuwVerzoek();
      expect(nep.store.lees('Items').some((i) => i.naam === 'Tripel Karmeliet, 4 flesjes')).toBe(false);
    });

    test('MEE-6 AAN-93: na Lijst definitief maken kan niemand meer toevoegen en afvinken werkt nog', async ({ page, nep }) => {
      await page.goto('/#/boodschappen');
      await main(page).getByLabel('Boodschap', { exact: true }).fill('Spa rood');
      await main(page).getByRole('button', { name: 'Op de lijst' }).click();
      await expect(page.locator('.sync')).toHaveText('Opgeslagen');
      werkEditieBij(nep, { boodschappenDefinitief: true });
      await page.reload();
      await expect(main(page).getByText('Definitief', { exact: true })).toBeVisible();
      await expect(main(page).getByText('De lijst is definitief. Toevoegen en claimen kan niet meer, afvinken kan nog.')).toBeVisible();
      await expect(main(page).getByLabel('Boodschap', { exact: true })).toHaveCount(0);
      await expect(main(page).getByRole('button', { name: 'Spa rood weghalen' })).toHaveCount(0);
      expect((await vraag(nep, 'boodschapToevoegen', { naam: 'Cola' })).fout).toBe('gesloten');
      await main(page).getByRole('checkbox', { name: 'Spa rood' }).check();
      await expect(page.locator('.sync')).toHaveText('Opgeslagen');
      await page.reload();
      await expect(main(page).getByRole('checkbox', { name: 'Spa rood' })).toBeChecked();
    });

    test('AAN-93 §7.8.11: na Ander weekend kiezen blijven de items staan en is toevoegen dicht', async ({ page, nep }) => {
      await page.goto('/#/boodschappen');
      await main(page).getByLabel('Boodschap', { exact: true }).fill('Bitterballen');
      await main(page).getByRole('button', { name: 'Op de lijst' }).click();
      await expect(page.locator('.sync')).toHaveText('Opgeslagen');
      werkEditieBij(nep, { vastgelegdWeekend: '' });
      await page.reload();
      await expect(rij(page, 'Bitterballen')).toBeVisible();
      await expect(main(page).getByText('Komt zodra het weekend vastligt')).toBeVisible();
      await expect(main(page).getByLabel('Boodschap', { exact: true })).toHaveCount(0);
      expect((await vraag(nep, 'boodschapToevoegen', { naam: 'Kaas' })).fout).toBe('gesloten');
    });

    test('AAN-83 AAN-93: een weigering met gesloten draait het nieuwe item terug en meldt dat rustig', async ({ page, nep }) => {
      await page.goto('/#/boodschappen');
      await expect(main(page).getByLabel('Boodschap', { exact: true })).toBeVisible();
      werkEditieBij(nep, { boodschappenDefinitief: true }); // de organisator sluit de lijst terwijl Anna nog kijkt
      await main(page).getByLabel('Boodschap', { exact: true }).fill('Nootjes');
      await main(page).getByRole('button', { name: 'Op de lijst' }).click();
      await expect(rij(page, 'Nootjes')).toBeVisible(); // direct in beeld
      await expect(rij(page, 'Nootjes')).toHaveCount(0);
      await expect(main(page).locator('.bd-invoer [role="status"]')).toContainText('definitief');
    });
  });
}

test('NFR-9 MEE-11: op 360 pixels scrolt de tab Boodschappen niet horizontaal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/boodschappen');
  await expect(main(page).getByRole('button', { name: 'Op de lijst' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(menu(page).getByRole('link')).toHaveCount(7);
});
