import { test as basis, expect } from '@playwright/test';
import { beheerNaar } from './hulp.mjs';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';
import { heeftLinkEnPincode } from '../../src/shared/whatsapp.js';

const SCRIPT_ID = 'demo-weekendje-weg-0001';
const WACHTWOORD = 'duinpan-kraanvogel';

// Elke test krijgt een eigen nepbackend met zes leden (de vier uit de demo plus Sanne en Joris).
const test = basis.extend({
  nep: async ({ context }, use) => {
    const demo = maakDemo();
    const nep = await startServer({ port: 0, seed: demo.seed });
    nep.store.nieuwVerzoek();
    for (const [voornaam, woonplaats] of [['Sanne', 'Delft'], ['Joris', 'Leiden']]) nep.store.voegToe('Leden', { voornaam, woonplaats, actief: true });
    nep.store.flush();
    await context.addInitScript(() => localStorage.setItem('ww-rondleiding', '1')); // RON-1: deze tests gaan niet over de rondleiding
    await context.route('https://script.google.com/**', async (route) => {
      // Een gesloten verbinding (ECONNRESET) krijgt één nieuwe poging; is de nepserver al dicht, dan stopt het verzoek.
      const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' }).catch(() => fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' })).catch(() => null);
      if (!antwoord) return route.abort().catch(() => {});
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
    });
    await use({ ...nep, demo });
    nep.server.close();
  },
});

// Playwright kan verkeer van pagina's onder een service worker in WebKit niet onderscheppen.
test.use({ serviceWorkers: 'block' });

const vraag = (nep, verzoek) => nep.api.verwerk(JSON.stringify({ apiVersie: 2, ...verzoek }));

async function logInAlsOrganisator(page, nep) {
  nep.store.nieuwVerzoek();
  const token = nep.beheerlink(nep.store.lees('Leden')[0].id, WACHTWOORD);
  await page.goto('about:blank');
  await page.goto(`/#b=${SCRIPT_ID}&beheer=${token}`);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leden');
}

const menu = (page, naam) => page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: naam });
const waarden = async (page, label) => (await page.getByLabel(label).evaluateAll((els) => els.map((e) => e.value)));

async function pinIn(page, pin) {
  await page.getByLabel('Cijfer 1').click();
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Inloggen' }).click();
}

test('EDI-1 EDI-4 EDI-5 TOE-8 TOE-12: editie met zes deelnemers, links en pincodes, inloggen en vernieuwen', async ({ page, nep }) => {
  // Het deelmenu is vervangen door een opvanger, zodat de teksten te lezen zijn zonder WhatsApp te openen.
  await page.addInitScript(() => { window.gedeeld = []; Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.gedeeld.push(d.text); } }); });
  await logInAlsOrganisator(page, nep);

  // EDI-1: een editie maken met zes deelnemers, de standaard voorkeursmaanden en een deadline.
  await beheerNaar(page, 'Nieuwe editie');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nieuwe editie');
  for (const m of [4, 5, 9, 10]) await expect(page.locator(`#ed-maand-${m}`)).toBeChecked();
  await expect(page.locator('#ed-maand-6')).not.toBeChecked();
  await expect(page.getByLabel('Eva is organisator')).toBeChecked();
  // Het jaar is een keuzelijst met alleen jaartallen, en elk veld heeft een regel uitleg.
  await expect(page.locator('select#ed-jaar option')).toHaveCount(5);
  await expect(page.getByLabel('Jaar')).toHaveAccessibleDescription('Het jaar waarin het weekend valt.');
  await expect(page.getByLabel('Deadline invullen')).toHaveAccessibleDescription(/Tot en met deze dag \(23:59\) vult iedereen/);
  await expect(page.getByLabel('Periode van')).toHaveAccessibleDescription(/eerste dag/);
  await page.getByLabel('Titel').fill('Studievrienden · Weekendje weg 2028');
  await page.getByLabel('Deadline invullen').fill('2027-12-01');
  await page.getByLabel('Anna is organisator').check();
  await page.getByLabel('Samenwerken op vrijdag').check();
  await page.getByRole('button', { name: 'Editie maken' }).click();

  // EDI-4: Links maken toont per deelnemer link en pincode met twee teksten en kopieerknoppen.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitnodigen');
  await expect(page.getByText('Nog geen link')).toHaveCount(6);
  await page.getByRole('button', { name: 'Links maken' }).click();
  await expect(page.getByLabel(/^Link van /)).toHaveCount(6);
  await expect(page.getByLabel(/^Pincode van /)).toHaveCount(6);
  await expect(page.getByRole('button', { name: /^Uitnodiging voor .* kopiëren$/ })).toHaveCount(6);
  await expect(page.getByRole('button', { name: /^Pincode voor .* kopiëren$/ })).toHaveCount(6);
  await expect(page.getByRole('button', { name: /^Uitnodiging voor .* delen$/ })).toHaveCount(6);
  await expect(page.getByRole('button', { name: /^Pincode voor .* delen$/ })).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Links maken' })).toHaveCount(0);
  const links = await waarden(page, /^Link van /);
  const pins = await waarden(page, /^Pincode van /);
  expect(new Set(links).size).toBe(6);
  for (const l of links) expect(l).toMatch(new RegExp(`/#b=${SCRIPT_ID}&t=[A-Za-z0-9_-]{22}$`));
  for (const p of pins) expect(p).toMatch(/^[0-9]{6}$/);
  nep.store.nieuwVerzoek();
  const editie = nep.store.lees('Edities').find((e) => e.titel.endsWith('2028'));
  expect(editie.blokken.samenwerken).toBe(true);
  expect(editie.deadline).toBe('2027-12-01T23:59:00+01:00');
  expect(nep.store.lees('Deelnemers').filter((d) => d.editieId === editie.id)).toHaveLength(6);

  // §7.12.3: delen geeft twee losse teksten; geen enkele bevat link en pincode samen.
  const namen = ['Eva', 'Anna', 'Bram', 'Chris', 'Sanne', 'Joris'];
  for (const naam of namen) {
    await page.getByRole('button', { name: `Uitnodiging voor ${naam} delen` }).click();
    await page.getByRole('button', { name: `Pincode voor ${naam} delen` }).click();
  }
  const gedeeld = await page.evaluate(() => window.gedeeld);
  expect(gedeeld).toHaveLength(12);
  for (const t of gedeeld) expect(heeftLinkEnPincode(t)).toBe(false);
  expect(gedeeld.filter((t) => t.includes('/#b=')).length).toBe(6);
  await expect(page.getByText('Link gedeeld')).toHaveCount(6);
  await expect(page.getByText('Pin gedeeld')).toHaveCount(6);

  // Inloggen met één van de links (Anna).
  const anna = namen.indexOf('Anna');
  const bas = namen.indexOf('Bram');
  const sessieBram = vraag(nep, { actie: 'inloggenDeelnemer', data: { token: links[bas].slice(-22), pin: pins[bas] } }).data.sessie;
  await beheerNaar(page, 'Leden');
  await page.getByRole('button', { name: 'Uitloggen' }).click();
  await page.goto('about:blank');
  await page.goto(`/${links[anna].slice(links[anna].indexOf('#'))}`);
  await pinIn(page, pins[anna]);
  await expect(page.getByText('Je bent ingelogd')).toBeVisible();
  await page.getByRole('button', { name: 'Uitloggen' }).click();

  // TOE-8: wie terugkomt, ziet geen links of pincodes meer, alleen de knoppen om nieuwe te maken.
  await logInAlsOrganisator(page, nep);
  await beheerNaar(page, 'Uitnodigen');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitnodigen');
  await expect(page.getByText('Nog geen link')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nieuwe pincode voor Anna' })).toBeVisible();
  await expect(page.getByLabel(/^Link van /)).toHaveCount(0);
  await expect(page.getByLabel(/^Pincode van /)).toHaveCount(0);

  // EDI-5: een nieuwe pincode voor Anna; de link blijft gelijk, de oude pincode faalt.
  await page.getByRole('button', { name: 'Nieuwe pincode voor Anna' }).click();
  await expect(page.getByLabel('Pincode van Anna')).toBeVisible();
  const nieuwePin = await page.getByLabel('Pincode van Anna').inputValue();
  expect(nieuwePin).toMatch(/^[0-9]{6}$/);
  expect(nieuwePin).not.toBe(pins[anna]);
  await expect(page.getByLabel('Link van Anna')).toHaveCount(0); // de link is niet meer op te vragen
  await expect(page.getByLabel('Link van Bram')).toHaveCount(0);

  // TOE-12: een nieuwe link voor Bram; de oude link en zijn sessie werken niet meer.
  await page.getByRole('button', { name: 'Nieuwe link voor Bram' }).click();
  await expect(page.getByLabel('Link van Bram')).toBeVisible();
  const nieuweLink = await page.getByLabel('Link van Bram').inputValue();
  expect(nieuweLink).not.toBe(links[bas]);
  const nieuwePinBram = await page.getByLabel('Pincode van Bram').inputValue();
  expect(vraag(nep, { actie: 'inloggenDeelnemer', data: { token: links[bas].slice(-22), pin: pins[bas] } }).fout).toBe('geen_toegang');
  expect(vraag(nep, { actie: 'inloggenDeelnemer', data: { token: links[bas].slice(-22), pin: nieuwePinBram } }).fout).toBe('geen_toegang');
  expect(vraag(nep, { actie: 'uitloggen', sessie: sessieBram }).fout).toBe('geen_toegang');

  // Anna: oude pincode faalt in de app, de nieuwe werkt met dezelfde link.
  await beheerNaar(page, 'Leden');
  await page.getByRole('button', { name: 'Uitloggen' }).click();
  await page.goto('about:blank');
  await page.goto(`/${links[anna].slice(links[anna].indexOf('#'))}`);
  await pinIn(page, pins[anna]);
  await expect(page.getByText('Deze pincode klopt niet')).toBeVisible();
  await page.goto('about:blank');
  await page.goto(`/${links[anna].slice(links[anna].indexOf('#'))}`);
  await pinIn(page, nieuwePin);
  await expect(page.getByText('Je bent ingelogd')).toBeVisible();
  await page.getByRole('button', { name: 'Uitloggen' }).click();

  // Bram: de nieuwe link met de nieuwe pincode werkt.
  await page.goto('about:blank');
  await page.goto(`/${nieuweLink.slice(nieuweLink.indexOf('#'))}`);
  await pinIn(page, nieuwePinBram);
  await expect(page.getByText('Je bent ingelogd')).toBeVisible();
});

test('EDI-6: de organisator maakt een beheerlink voor een lid, dat lid kiest een eigen wachtwoord', async ({ page, nep }) => {
  await logInAlsOrganisator(page, nep);
  await beheerNaar(page, 'Uitnodigen');
  await page.getByLabel('Lid', { exact: true }).selectOption({ label: 'Chris' });
  await page.getByRole('button', { name: 'Beheerlink maken' }).click();
  const link = await page.getByRole('textbox', { name: 'Beheerlink van Chris' }).inputValue();
  expect(link).toMatch(new RegExp(`/#b=${SCRIPT_ID}&beheer=[A-Za-z0-9_-]{22}$`));
  await expect(page.getByRole('button', { name: 'Beheerlink van Chris kopiëren' })).toBeVisible();
  await expect(page.getByText('Je ziet deze link alleen nu')).toBeVisible();

  await beheerNaar(page, 'Leden');
  await page.getByRole('button', { name: 'Uitloggen' }).click();
  await page.goto('about:blank');
  await page.goto(`/${link.slice(link.indexOf('#'))}`);
  await expect(page.getByLabel('Nieuw wachtwoord')).toBeVisible();
  await page.getByLabel('Nieuw wachtwoord').fill('chris-eigen-wachtwoord');
  await page.getByLabel('Herhaal wachtwoord').fill('chris-eigen-wachtwoord');
  await page.getByRole('button', { name: 'Opslaan en beheren' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leden');
  await expect(page.getByText('jij', { exact: true })).toBeVisible();
});

test('EDI-1: een editie vraagt een deadline en minstens twee deelnemers', async ({ page, nep }) => {
  await logInAlsOrganisator(page, nep);
  await beheerNaar(page, 'Nieuwe editie');
  await page.getByRole('button', { name: 'Editie maken' }).click();
  await expect(page.getByText('Kies een deadline')).toBeVisible();
  await page.getByLabel('Deadline invullen').fill('2027-12-01');
  for (const naam of ['Anna', 'Bram', 'Chris', 'Sanne', 'Joris']) await page.getByLabel(`${naam} doet mee`).uncheck();
  await page.getByRole('button', { name: 'Editie maken' }).click();
  await expect(page.getByText('Kies minstens twee deelnemers')).toBeVisible();
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Edities')).toHaveLength(1);
});

test('EDI-1 AAN-46: de maker geeft de organisatie aan een ander lid en krijgt uitleg over de beheerlink', async ({ page, nep }) => {
  await logInAlsOrganisator(page, nep);
  await beheerNaar(page, 'Nieuwe editie');
  await page.getByLabel('Deadline invullen').fill('2027-12-01');
  // Zonder organisator kan het niet.
  await page.getByLabel('Eva is organisator').uncheck();
  await page.getByRole('button', { name: 'Editie maken' }).click();
  await expect(page.getByText('Kies minstens één organisator')).toBeVisible();
  await page.getByLabel('Anna is organisator').check();
  await page.getByLabel('Titel').fill('Weekend van Anna');
  await page.getByRole('button', { name: 'Editie maken' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Editie gemaakt');
  await expect(page.getByText('Anna organiseert Weekend van Anna. Jij beheert deze editie niet.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Beheerlink maken' })).toBeVisible();
  nep.store.nieuwVerzoek();
  const editie = nep.store.lees('Edities').find((e) => e.titel === 'Weekend van Anna');
  const leden = new Map(nep.store.lees('Leden').map((l) => [l.id, l.voornaam]));
  const rollen = nep.store.lees('Deelnemers').filter((d) => d.editieId === editie.id).map((d) => [leden.get(d.lidId), d.rol]);
  expect(rollen.filter(([, rol]) => rol === 'organisator')).toEqual([['Anna', 'organisator']]);
  expect(rollen).toContainEqual(['Eva', 'deelnemer']);
  await page.getByRole('link', { name: 'Terug naar Beheren' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beheren');
});
