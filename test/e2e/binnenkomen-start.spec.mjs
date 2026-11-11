// Fase 30: binnenkomen en Start (TOE-13, STA-4, STA-9, NAV-2, NAV-4, NAV-15; BV-02, BV-06, BV-07, BV-08, BV-20,
// BV-21, BV-22, BV-23, BV-33, BV-36).
import { test, expect } from '@playwright/test';
import { startNep, startDemo, zetOnderdelen } from './hulp.mjs';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';

test.use({ serviceWorkers: 'block' });

const STAPPEN = ['invullen', 'overzicht', 'accommodatie', 'voorbereiding', 'weekend', 'afrekenen', 'afgerond'];
const WACHTWOORD = 'duinpan-kraanvogel';
const editie2027 = (seed) => seed.Edities.find((e) => e.jaar === 2027);
const profiel = (page) => page.getByRole('button', { name: 'Profiel en uitleg' });

test('TOE-13 BV-06: de demolink opent het pinscherm zonder plakveld en met tekstvakjes die een wachtwoordmanager negeert', async ({ page }) => {
  const demo = maakDemo();
  await page.goto(`/${demo.fragment(0)}`);
  await expect(page.getByText('Link herkend')).toBeVisible();
  await expect(page.getByLabel('Plak je persoonlijke link')).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  for (let i = 1; i <= 6; i += 1) {
    const vak = page.getByLabel(`Cijfer ${i}`);
    await expect(vak).toHaveAttribute('type', 'text');
    await expect(vak).toHaveAttribute('inputmode', 'numeric');
    await expect(vak).toHaveAttribute('data-1p-ignore', '');
    await expect(vak).toHaveAttribute('data-lpignore', 'true');
    await expect(vak).toHaveAttribute('data-bwignore', '');
  }
  await expect(page.getByLabel('Cijfer 1')).toHaveAttribute('autocomplete', 'one-time-code');
  // Zonder link in het fragment is het plakveld er wel, met dezelfde negeer-attributen.
  await page.goto('about:blank');
  await page.goto('/');
  const veld = page.getByLabel('Plak je persoonlijke link');
  await expect(veld).toBeVisible();
  await expect(veld).toHaveAttribute('data-1p-ignore', '');
  await expect(veld).toHaveAttribute('data-lpignore', 'true');
  await expect(veld).toHaveAttribute('data-bwignore', '');
});

test('STA-4 BV-07: een beheerlogin eindigt op #/start met de eerstvolgende actie', async ({ page, context }) => {
  const demo = maakDemo({ stap: 'overzicht', antwoorden: true });
  const nep = await startServer({ port: 0, seed: demo.seed });
  try {
    await zetOnderdelen(context);
    await context.route('https://script.google.com/**', async (route) => {
      const verzoek = { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' };
      const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, verzoek).catch(() => fetch(`${nep.url}/macros/s/x/exec`, verzoek)).catch(() => null);
      if (!antwoord) return route.abort().catch(() => {});
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
    });
    nep.store.nieuwVerzoek();
    const token = nep.beheerlink(nep.store.lees('Leden')[0].id, WACHTWOORD);
    await page.goto(`/#b=demo-weekendje-weg-0001&beheer=${token}`);
    await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD);
    await page.getByRole('button', { name: 'Inloggen' }).click();
    await expect(page).toHaveURL(/#\/start$/);
    await expect(page.getByRole('region', { name: 'Eerstvolgende actie' })).toBeVisible();
  } finally { nep.server.close(); }
});

test('STA-4 BV-08: een editie zonder links toont Iedereen uitnodigen als eerstvolgende actie', async ({ page, context }) => {
  const { nep } = await startDemo(context, {
    stap: 'invullen', als: 'Anne', beheer: true,
    aanpassen: (seed) => { const id = editie2027(seed).id; for (const d of seed.Deelnemers) if (d.editieId === id) d.tokenHash = ''; },
  });
  try {
    await page.goto('/#/start');
    const actie = page.getByRole('region', { name: 'Eerstvolgende actie' });
    await expect(actie.getByRole('link', { name: 'Iedereen uitnodigen' })).toHaveAttribute('href', '#/uitnodigen');
    await expect(actie.getByRole('link', { name: 'Herinnering sturen' })).toHaveCount(0);
  } finally { nep.server.close(); }
});

test('STA-4 STA-9 BV-33: Afrekening op Start heeft één kop Openstaande betalingen', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'afrekenen', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/start');
    await expect(page.locator('[data-boven]')).toBeVisible();
    await expect(page.getByRole('main').getByText('Openstaande betalingen', { exact: true })).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Eerstvolgende actie' }).getByRole('link', { name: 'Betalingen afvinken' })).toBeVisible();
  } finally { nep.server.close(); }
});

test('STA-9 BV-33: Afgerond toont geen aftelteller, ook met een weekend in de toekomst', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'afgerond', als: 'Anne', beheer: true, aanpassen: (seed) => { editie2027(seed).vastgelegdWeekend = '2099-05-15'; } });
  try {
    await page.goto('/#/start');
    await expect(page.locator('[data-boven]')).toBeVisible();
    await expect(page.getByLabel('Aftellen')).toHaveCount(0);
    await expect(page.getByRole('main')).not.toContainText('tot het weekend');
  } finally { nep.server.close(); }
});

for (const [als, beheer, verwacht] of [['Anne', true, 'Anne · organisator'], ['Bas', false, 'Bas · deelnemer']]) {
  test(`NAV-2 BV-36: het profielmenu toont ${verwacht}`, async ({ page, context }) => {
    const { nep } = await startDemo(context, { stap: 'invullen', als, beheer });
    try {
      await page.goto('/#/start');
      await expect(page.locator('[data-boven]')).toBeVisible();
      await profiel(page).click();
      await expect(page.locator('#profielmenu .profiel-rol')).toHaveText(verwacht);
    } finally { nep.server.close(); }
  });
}

test('STA-9 BV-21 BV-22 BV-23: Start zonder Uitloggen, met Hoe werkt het? als tekstlink en Afgelopen weekenden met klapicoon', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'invullen' });
  try {
    await page.goto('/#/start');
    await expect(page.locator('[data-boven]')).toBeVisible();
    const main = page.getByRole('main');
    await expect(main).not.toContainText('Je bent ingelogd');
    await expect(main.getByRole('button', { name: 'Uitloggen' })).toHaveCount(0);
    const hoe = main.getByRole('button', { name: 'Hoe werkt het?' });
    await expect(hoe).toBeVisible();
    await expect(hoe).not.toHaveClass(/(^|\s)btn(\s|$)/); // geen volle knop
    const sectie = page.locator('details.afgelopen');
    await expect(sectie.locator('summary svg')).toHaveCount(1);
    await sectie.locator('summary').click();
    await expect(sectie).toContainText('Nog geen afgelopen weekenden.');
  } finally { nep.server.close(); }
});

test('NAV-15 BV-20: op mobiel staat de editietitel op Start één keer', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Bas' });
  try {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/#/start');
    const titel = await page.getByRole('heading', { level: 1 }).textContent();
    await page.getByRole('button', { name: 'Alle stappen tonen' }).click();
    await expect(page.getByText(titel, { exact: true }).filter({ visible: true })).toHaveCount(1);
    // Op een scherm zonder de titel als kop toont de balk hem wel.
    await page.goto('/#/voortgang');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wie heeft ingevuld');
    await expect(page.locator('.sb-titel')).toBeVisible();
  } finally { nep.server.close(); }
});

// STA-9, BV-02: in geen enkele stap staat "null" in main, voor organisator en deelnemer, op telefoon en laptop.
for (const stap of STAPPEN) {
  for (const beheer of [true, false]) {
    test(`STA-9 BV-02 NFR-9: Start in de stap ${stap} als ${beheer ? 'organisator' : 'deelnemer'} zonder null op 360, 390 en 1280 pixels`, async ({ page, context }) => {
      // De breedtes staan in de test zelf; de mobiele projecten voegen hier niets toe.
      test.skip(test.info().project.name.endsWith('mobiel'), 'breedtes staan in de test');
      const { nep } = await startDemo(context, { stap, als: beheer ? 'Anne' : 'Bas', beheer, routeGezien: stap !== 'invullen' });
      try {
        for (const breedte of [360, 390, 1280]) {
          await page.setViewportSize({ width: breedte, height: 800 });
          await page.goto('about:blank');
          await page.goto('/#/start');
          await expect(page.locator('[data-boven]')).toHaveAttribute('data-boven', stap);
          await expect(page.getByRole('main')).not.toContainText('null');
          await expect(page.getByRole('main')).not.toContainText('undefined');
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
      } finally { nep.server.close(); }
    });
  }
}
