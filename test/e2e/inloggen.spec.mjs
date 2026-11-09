import { test as basis, expect } from '@playwright/test';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';
import { OPSLAG_SLEUTEL } from '../../src/web/sessie.js';

// Elke test krijgt een eigen nepbackend. De app praat met https://script.google.com (CSP, NFR-4/NFR-2);
// de test stuurt die aanroepen door naar de nepbackend op localhost.
const test = basis.extend({
  nep: async ({ context }, use, testInfo) => {
    const blokkades = testInfo.title.includes('[drie blokkades]') ? 3 : 0;
    const demo = maakDemo({ blokkades });
    const nep = await startServer({ port: 0, seed: demo.seed });
    const urls = [];
    await context.addInitScript(() => localStorage.setItem('ww-rondleiding', '1')); // RON-1: deze tests gaan niet over de rondleiding
    await context.route('https://script.google.com/**', async (route) => {
      const verzoek = route.request();
      urls.push(verzoek.url());
      // Een gesloten verbinding (ECONNRESET) krijgt één nieuwe poging; is de nepserver al dicht, dan stopt het verzoek.
      const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: verzoek.postData() || '' }).catch(() => fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: verzoek.postData() || '' })).catch(() => null);
      if (!antwoord) return route.abort().catch(() => {});
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
    });
    await use({ ...nep, demo, urls });
    nep.server.close();
  },
});

// Playwright kan verkeer van pagina's onder een service worker in WebKit niet onderscheppen.
test.use({ serviceWorkers: 'block' });

const pinInvoer = async (page, pin) => {
  await page.getByLabel('Cijfer 1').click();
  await page.keyboard.type(pin);
};
const opslag = (page) => page.evaluate((k) => localStorage.getItem(k), OPSLAG_SLEUTEL);

test('TOE-1: een demolink zonder pincode toont alleen het pinscherm', async ({ page, nep }) => {
  await page.goto(`/${nep.demo.fragment(0)}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weekendje weg');
  await expect(page.getByLabel('Plak je persoonlijke link')).toBeVisible();
  await expect(page.getByText('Link herkend')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Je pincode, zes cijfers' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inloggen' })).toBeDisabled();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  const tekst = await page.locator('body').innerText();
  for (const naam of nep.demo.namen) expect(tekst).not.toContain(naam);
  expect(tekst).not.toContain('2027');
  expect(nep.urls).toEqual([]); // niets uit het script voordat de pincode klopt
});

test('TOE-2 TOE-9: met de pincode open je een lege startpagina, je blijft ingelogd en uitloggen wist de sessie', async ({ page, nep }) => {
  await page.goto(`/${nep.demo.fragment(0)}`);
  await pinInvoer(page, nep.demo.pin);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByText('Je bent ingelogd')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Stappen van de editie' })).toBeVisible();
  expect(page.url()).not.toContain('t=');
  const s = JSON.parse(await opslag(page));
  expect(Date.parse(s.verloopt) - Date.now()).toBeGreaterThan(59 * 24 * 3600 * 1000);
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Sessies')).toHaveLength(1);

  await page.reload();
  await expect(page.getByText('Je bent ingelogd')).toBeVisible();

  await page.getByRole('button', { name: 'Uitloggen' }).click();
  await expect(page.getByLabel('Plak je persoonlijke link')).toBeVisible();
  expect(await opslag(page)).toBeNull();
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Sessies')).toHaveLength(0);
});

test('TOE-3 AAN-01: vijf foute pogingen tonen de blokkadetijd', async ({ page, nep }) => {
  await page.goto(`/${nep.demo.fragment(0)}`);
  const alarm = page.getByRole('alert').filter({ hasText: 'pincode' });
  for (let i = 0; i < 5; i++) {
    await pinInvoer(page, '000000');
    await page.getByRole('button', { name: 'Inloggen' }).click();
    if (i < 4) await expect(alarm).toContainText('klopt niet');
  }
  await expect(alarm).toContainText(/Probeer het om \d{2}:\d{2} opnieuw, over 15 minuten/);
  await expect(page.getByLabel('Cijfer 1')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Inloggen' })).toBeDisabled();
  expect(await opslag(page)).toBeNull();
});

test('TOE-4 AAN-01 [drie blokkades]: de pincode werkt niet meer en de organisator moet een nieuwe maken', async ({ page, nep }) => {
  await page.goto(`/${nep.demo.fragment(0)}`);
  await pinInvoer(page, nep.demo.pin);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'nieuwe pincode' })).toBeVisible();
  expect(await opslag(page)).toBeNull();
});

test('TOE-11: in een nieuwe context zonder fragment accepteert de app de geplakte demolink', async ({ browser, nep, baseURL }) => {
  const context = await browser.newContext({ baseURL, serviceWorkers: 'block' });
  await context.addInitScript(() => localStorage.setItem('ww-rondleiding', '1'));
  await context.route('https://script.google.com/**', async (route) => {
    // Een gesloten verbinding (ECONNRESET) krijgt één nieuwe poging; is de nepserver al dicht, dan stopt het verzoek.
    const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' }).catch(() => fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' })).catch(() => null);
    if (!antwoord) return route.abort().catch(() => {});
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
  });
  const page = await context.newPage();
  await page.goto('/');
  const veld = page.getByLabel('Plak je persoonlijke link');
  await expect(veld).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inloggen' })).toBeDisabled();
  await veld.fill(`${baseURL}/${nep.demo.fragment(1)}`);
  await expect(page.getByText('Link herkend')).toBeVisible();
  await pinInvoer(page, nep.demo.pin);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByText('Je bent ingelogd')).toBeVisible();
  await context.close();
});

test('TOE-11 TOE-5: een geplakte beheerlink leidt naar de beheerlogin zonder pinvakjes', async ({ page, nep }) => {
  await page.goto('/');
  await page.getByLabel('Plak je persoonlijke link').fill(`#b=${nep.demo.scriptId}&beheer=${'B'.repeat(22)}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beheren');
  await expect(page.getByLabel('Cijfer 1')).toHaveCount(0);
});

test('TOE-10 NFR-2: een scriptId buiten het patroon wordt geweigerd en verkeer gaat alleen naar script.google.com', async ({ page, nep }) => {
  await page.goto('/');
  const veld = page.getByLabel('Plak je persoonlijke link');
  await veld.fill(`#b=evil.example%2Fx&t=${'T'.repeat(22)}`);
  await expect(page.getByText('Dit lijkt geen persoonlijke link')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inloggen' })).toBeDisabled();
  await veld.fill(`#b=${nep.demo.scriptId}&t=${nep.demo.tokens[0]}`);
  await pinInvoer(page, nep.demo.pin);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByText('Je bent ingelogd')).toBeVisible();
  expect(nep.urls.length).toBeGreaterThan(0);
  for (const u of nep.urls) expect(u).toBe(`https://script.google.com/macros/s/${nep.demo.scriptId}/exec`);
});

test('NFR-5: html in het linkveld wordt als tekst behandeld en voert niets uit', async ({ page }) => {
  const dialogen = [];
  page.on('dialog', (d) => { dialogen.push(d.message()); d.dismiss(); });
  await page.goto('/');
  const aanval = '<img src=x onerror=alert(1)>';
  await page.getByLabel('Plak je persoonlijke link').fill(aanval);
  await expect(page.getByText('Dit lijkt geen persoonlijke link')).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.locator('.binnen').innerHTML()).not.toContain(aanval);
  expect(await page.getByLabel('Plak je persoonlijke link').inputValue()).toBe(aanval);
  await page.waitForTimeout(200);
  expect(dialogen).toEqual([]);
});

// AAN-72 en AAN-73: na het inloggen met een link opent de rondleiding; "Kopieer mijn link" bestaat alleen zolang de app de link nog in het geheugen heeft.
test('RON-2 AAN-72 AAN-73: na inloggen volgt de rondleiding met Kopieer mijn link, later niet meer', async ({ browser, nep, baseURL }) => {
  const context = await browser.newContext({ baseURL, serviceWorkers: 'block' });
  await context.route('https://script.google.com/**', async (route) => {
    // Een gesloten verbinding (ECONNRESET) krijgt één nieuwe poging; is de nepserver al dicht, dan stopt het verzoek.
    const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' }).catch(() => fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' })).catch(() => null);
    if (!antwoord) return route.abort().catch(() => {});
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
  });
  const page = await context.newPage();
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' }));
  await page.goto(`/${nep.demo.fragment(1)}`);
  await pinInvoer(page, nep.demo.pin);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByRole('heading', { name: 'Welkom bij Weekendje weg' })).toBeVisible();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await expect(page.getByRole('button', { name: 'Kopieer mijn link' })).toBeVisible();
  await page.getByRole('button', { name: 'Overslaan' }).click();
  await page.reload();
  await page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Uitleg' }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await expect(page.getByRole('button', { name: 'Kopieer mijn link' })).toHaveCount(0);
  await expect(page.getByText('Je link staat in het bericht')).toBeVisible();
  await context.close();
});
