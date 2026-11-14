import { test as basis, expect } from '@playwright/test';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';
import { OPSLAG_SLEUTEL } from '../../src/web/sessie.js';
import { SJABLOON_KOPIE } from '../../src/shared/uitrol.js';
import { naarLeden, uitloggen } from './hulp.mjs';

const SCRIPT_ID = 'demo-weekendje-weg-0001';
const WACHTWOORD = 'duinpan-kraanvogel';

// Elke test krijgt een eigen nepbackend. [leeg] start zonder groep (de wizard); anders met de demogroep.
// [oud script] laat het script zich melden met een andere apiVersie (§7.17).
const test = basis.extend({
  nep: async ({ context }, use, testInfo) => {
    const leeg = testInfo.title.includes('[leeg]');
    const oud = testInfo.title.includes('[oud script]');
    const demo = maakDemo();
    const nep = await startServer({ port: 0, seed: leeg ? {} : demo.seed });
    await context.addInitScript(() => localStorage.setItem('ww-rondleiding', '1')); // RON-1: deze tests gaan niet over de rondleiding
    await context.route('https://script.google.com/**', async (route) => {
      const body = route.request().postData() || '';
      if (oud && JSON.parse(body).actie === 'status') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { apiVersie: 1, opgezet: false } }) });
      }
      // Een gesloten verbinding (ECONNRESET) krijgt één nieuwe poging; is de nepserver al dicht, dan stopt het verzoek.
      const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body }).catch(() => fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body })).catch(() => null);
      if (!antwoord) return route.abort().catch(() => {});
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
    });
    await use({ ...nep, demo });
    nep.server.close();
  },
});

// Playwright kan verkeer van pagina's onder een service worker in WebKit niet onderscheppen.
test.use({ serviceWorkers: 'block' });

const opslag = (page) => page.evaluate((k) => localStorage.getItem(k), OPSLAG_SLEUTEL);

async function verbind(page, code) {
  await page.goto('about:blank'); // een tweede keer dezelfde URL zou anders geen nieuwe pagina laden
  await page.goto('/#/opzetten');
  await page.getByRole('button', { name: 'Ik heb de URL en de setupcode al' }).click();
  await page.getByLabel('Script-URL').fill(`https://script.google.com/macros/s/${SCRIPT_ID}/exec`);
  await page.getByLabel('Setupcode').fill(code);
  await page.getByLabel('Groepsnaam').fill('Studievrienden');
  await page.getByRole('button', { name: 'Volgende: leden' }).click();
}

async function voegLedenToe(page) {
  for (const [naam, plaats] of [['Eva', 'Nijmegen'], ['Anne', 'Utrecht'], ['Bas', 'Groningen']]) {
    await page.getByLabel('Naam', { exact: true }).fill(naam);
    await page.getByLabel('Woonplaats', { exact: true }).fill(plaats);
    await page.getByRole('button', { name: 'Lid toevoegen' }).click();
  }
}

test('GRP-2 GRP-4 RON-5 TOE-5 [leeg]: de wizard zet de groep op met de setupcode en eindigt op het beheerscherm', async ({ page, nep }) => {
  const code = nep.setupcode(); // de code die het Sheet-menu (en de console van de nepbackend) toont
  await page.goto('/#/opzetten');
  // RON-5: de wizard begint met de rondleiding voor de eigenaar.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Groep opzetten');
  await expect(page.getByRole('listitem')).toHaveCount(3);
  for (const woord of ['sjabloon-Sheet', 'Implementeren', 'Google heeft deze app niet geverifieerd', 'Geavanceerd', 'Groep opzetten en klik op de link']) await expect(page.getByRole('listitem').filter({ hasText: woord })).toBeVisible();
  // De knop Kopie maken is een gewone link naar de sjabloon en staat er alleen als SJABLOON_KOPIE is ingevuld.
  const kopie = page.getByRole('link', { name: 'Kopie maken' });
  if (SJABLOON_KOPIE) {
    await expect(kopie).toHaveAttribute('href', SJABLOON_KOPIE);
    await expect(kopie).toHaveAttribute('target', '_blank');
    await expect(kopie).toHaveAttribute('rel', 'noopener noreferrer');
  } else {
    await expect(kopie).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Ik heb de URL en de setupcode al' }).click();

  // Stap 1: een /dev-URL wordt geweigerd met uitleg (GRP-2).
  await page.getByLabel('Script-URL').fill(`https://script.google.com/macros/s/${SCRIPT_ID}/dev`);
  await page.getByLabel('Setupcode').fill(code);
  await page.getByLabel('Groepsnaam').fill('Studievrienden');
  await page.getByRole('button', { name: 'Volgende: leden' }).click();
  await expect(page.getByText('eindigt op /dev')).toBeVisible();
  await page.getByLabel('Script-URL').fill(`https://script.google.com/macros/s/${SCRIPT_ID}/exec`);
  await page.getByRole('button', { name: 'Volgende: leden' }).click();

  // Stap 2: leden en eigenaar.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wie gaan er mee?');
  await voegLedenToe(page);
  await page.getByRole('button', { name: 'Volgende: wachtwoord' }).click();
  await expect(page.getByText('Kies welk lid jij bent')).toBeVisible();
  await page.getByRole('button', { name: 'Eva: kies als eigenaar' }).click();
  await expect(page.getByText('jij · eigenaar')).toBeVisible();
  await page.getByRole('button', { name: 'Volgende: wachtwoord' }).click();

  // Stap 3: een wachtwoord van minimaal 10 tekens.
  await page.getByLabel('Nieuw wachtwoord').fill('kort');
  await page.getByLabel('Herhaal wachtwoord').fill('kort');
  await expect(page.getByText('4 tekens, minimaal 10')).toBeVisible();
  await page.getByRole('button', { name: 'Groep opzetten' }).click();
  await expect(page.getByText('Kies een wachtwoord van minimaal 10 tekens')).toBeVisible();
  await page.getByLabel('Nieuw wachtwoord').fill(WACHTWOORD);
  await page.getByLabel('Herhaal wachtwoord').fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Groep opzetten' }).click();

  // Stap 4 (GRP-4): de beheerlink met kopieerknop en de uitleg om hem te bewaren.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Je groep is opgezet');
  const link = await page.getByLabel('Je beheerlink').inputValue();
  expect(link).toMatch(new RegExp(`#b=${SCRIPT_ID}&beheer=[A-Za-z0-9_-]{22}$`));
  await expect(page.getByRole('button', { name: 'Kopieer de link' })).toBeVisible();
  await expect(page.getByText('Bewaar deze link nu')).toBeVisible();
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Groep')[0].opgezet).toBe(true);
  expect(nep.store.lees('Leden')).toHaveLength(3);

  await page.getByRole('button', { name: 'Naar beheren' }).click();
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
  await naarLeden(page);
  await expect(page.getByText('jij', { exact: true })).toBeVisible();
  expect(JSON.parse(await opslag(page)).soort).toBe('beheer');
  await expect(page.getByRole('navigation', { name: 'Stappen van de editie' })).toHaveCount(0);

  // De link werkt ook later: wachtwoord vragen, daarna het beheerscherm (TOE-5).
  await page.getByRole('button', { name: 'Uitloggen' }).click();
  await expect(page.getByLabel('Plak je persoonlijke link')).toBeVisible();
  await page.goto(link.slice(link.indexOf('#')));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beheren');
  await page.getByLabel('Wachtwoord', { exact: true }).fill('verkeerd-wachtwoord');
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByText('Dit wachtwoord klopt niet')).toBeVisible();
  await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
});

test('GRP-3 [leeg]: een tweede opzet wordt geweigerd', async ({ page, nep }) => {
  const code = nep.setupcode();
  await verbind(page, code);
  await voegLedenToe(page);
  await page.getByRole('button', { name: 'Anne: kies als eigenaar' }).click();
  await page.getByRole('button', { name: 'Volgende: wachtwoord' }).click();
  await page.getByLabel('Nieuw wachtwoord').fill(WACHTWOORD);
  await page.getByLabel('Herhaal wachtwoord').fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Groep opzetten' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Je groep is opgezet');

  // Een tweede keer, met een nieuwe geldige setupcode: de wizard meldt dat de groep al is opgezet.
  await page.evaluate(() => localStorage.clear());
  await verbind(page, nep.setupcode());
  await expect(page.getByText('Deze groep is al opgezet')).toBeVisible();
  // En rechtstreeks tegen het script wordt ook een tweede groepOpzetten geweigerd.
  const direct = nep.api.verwerk(JSON.stringify({ actie: 'groepOpzetten', apiVersie: 3, data: { setupcode: nep.setupcode(), groepsnaam: 'Kaping', leden: [{ voornaam: 'X', woonplaats: '' }, { voornaam: 'Y', woonplaats: '' }], eigenaar: 0, wachtwoord: WACHTWOORD } }));
  expect(direct).toMatchObject({ ok: false, fout: 'gesloten' });
});

test('GRP-2 [leeg]: een verkeerde setupcode brengt de eigenaar terug naar stap 1', async ({ page, nep }) => {
  nep.setupcode();
  await verbind(page, 'ZZZZZZZZ');
  await voegLedenToe(page);
  await page.getByRole('button', { name: 'Bas: kies als eigenaar' }).click();
  await page.getByRole('button', { name: 'Volgende: wachtwoord' }).click();
  await page.getByLabel('Nieuw wachtwoord').fill(WACHTWOORD);
  await page.getByLabel('Herhaal wachtwoord').fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Groep opzetten' }).click();
  await expect(page.getByText('De setupcode klopt niet of is verlopen')).toBeVisible();
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Leden')).toHaveLength(0);
});

test('AAN-14 §7.17 [leeg] [oud script]: een script met een andere apiVersie toont de melding voor de eigenaar', async ({ page, nep }) => {
  await verbind(page, nep.setupcode());
  await expect(page.getByText('Het script van deze groep is verouderd')).toBeVisible();
  await expect(page.getByText('nieuwe versie op de bestaande implementatie')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verbind je Sheet'); // niet verder naar stap 2
});

test('TOE-5: een nieuwe beheerlink vraagt eerst een wachtwoord van minimaal 10 tekens, daarna elke login', async ({ page, nep }) => {
  const token = nep.beheerlink(nep.demo.seed.Leden[1].id);
  await page.goto(`/#b=${SCRIPT_ID}&beheer=${token}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beheren');
  await expect(page.getByLabel('Nieuw wachtwoord')).toBeVisible();
  await expect(page.getByText('Je blijft 12 uur ingelogd')).toBeVisible();
  await page.getByLabel('Nieuw wachtwoord').fill('kort');
  await page.getByLabel('Herhaal wachtwoord').fill('kort');
  await page.getByRole('button', { name: 'Opslaan en beheren' }).click();
  await expect(page.getByText('minimaal 10 tekens')).toBeVisible();
  await page.getByLabel('Nieuw wachtwoord').fill(WACHTWOORD);
  await page.getByLabel('Herhaal wachtwoord').fill(`${WACHTWOORD}x`);
  await page.getByRole('button', { name: 'Opslaan en beheren' }).click();
  await expect(page.getByText('niet gelijk')).toBeVisible();
  await page.getByLabel('Nieuw wachtwoord').fill(WACHTWOORD);
  await page.getByLabel('Herhaal wachtwoord').fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Opslaan en beheren' }).click();
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
  const s = JSON.parse(await opslag(page));
  expect(Date.parse(s.verloopt) - Date.now()).toBeLessThan(12 * 3600 * 1000 + 60000);
  expect(Date.parse(s.verloopt) - Date.now()).toBeGreaterThan(11 * 3600 * 1000);

  await uitloggen(page);
  await expect(page.getByLabel('Plak je persoonlijke link')).toBeVisible();
  await page.goto(`/#b=${SCRIPT_ID}&beheer=${token}`);
  await expect(page.getByText('Vul je wachtwoord in om te beheren')).toBeVisible();
  await expect(page.getByLabel('Wachtwoord', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Herhaal wachtwoord')).toBeHidden();
});

test('TOE-5 AAN-44: vijf foute wachtwoorden tonen de blokkadetijd', async ({ page, nep }) => {
  const token = nep.beheerlink(nep.demo.seed.Leden[1].id, WACHTWOORD);
  await page.goto(`/#b=${SCRIPT_ID}&beheer=${token}`);
  for (let i = 0; i < 5; i++) {
    await page.getByLabel('Wachtwoord', { exact: true }).fill(`fout-wachtwoord-${i}`);
    await page.getByRole('button', { name: 'Inloggen' }).click();
    if (i < 4) await expect(page.getByText('Dit wachtwoord klopt niet')).toBeVisible();
  }
  await expect(page.getByText('Vijf keer een verkeerd wachtwoord')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inloggen' })).toBeDisabled();
});

test('GRP-5: de organisator voegt leden toe, wijzigt een woonplaats en maakt een lid inactief', async ({ page, nep }) => {
  const token = nep.beheerlink(nep.demo.seed.Leden[0].id, WACHTWOORD);
  await page.goto(`/#b=${SCRIPT_ID}&beheer=${token}`);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
  await naarLeden(page);
  await expect(page.getByText('Zwolle')).toBeVisible();

  await page.getByLabel('Naam', { exact: true }).fill('Sanne');
  await page.getByLabel('Woonplaats', { exact: true }).fill('Eindhoven');
  await page.getByRole('button', { name: 'Lid toevoegen' }).click();
  await expect(page.getByText('Eindhoven')).toBeVisible();

  await page.getByRole('button', { name: 'Woonplaats van Anna wijzigen' }).click();
  await page.getByLabel('Woonplaats van Anna').fill('Deventer');
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByText('Deventer')).toBeVisible();
  await expect(page.getByText('Zwolle')).toHaveCount(0);

  await page.getByRole('button', { name: 'Sanne inactief maken' }).click();
  await expect(page.getByText('inactief', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sanne inactief maken' })).toHaveCount(0);
  nep.store.nieuwVerzoek();
  const leden = nep.store.lees('Leden');
  expect(leden).toHaveLength(5); // nooit verwijderd
  expect(leden.find((l) => l.voornaam === 'Sanne').actief).toBe(false);
});

test('GRP-5: tijdens opslaan staat er een lader en geeft een tweede klik of Enter geen dubbel lid', async ({ page, nep }) => {
  const token = nep.beheerlink(nep.demo.seed.Leden[0].id, WACHTWOORD);
  await page.goto(`/#b=${SCRIPT_ID}&beheer=${token}`);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
  await naarLeden(page);
  // Een traag script: elk verzoek duurt ruim een halve seconde.
  await page.route('https://script.google.com/**', async (route) => { await new Promise((r) => { setTimeout(r, 600); }); await route.fallback(); });

  await page.getByLabel('Naam', { exact: true }).fill('Sanne');
  await page.getByLabel('Woonplaats', { exact: true }).fill('Eindhoven');
  await page.getByLabel('Woonplaats', { exact: true }).press('Enter');
  await expect(page.locator('.lader')).toHaveText('Opslaan…');
  await page.getByLabel('Woonplaats', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Lid toevoegen' }).dispatchEvent('click'); // op mobiel kan het menu over de knop liggen
  await expect(page.getByText('Eindhoven')).toBeVisible();
  await expect(page.locator('.lader')).toBeHidden();
  await expect(page.getByLabel('Naam', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Naam', { exact: true })).toBeFocused();
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Leden').filter((l) => l.voornaam === 'Sanne')).toHaveLength(1);
});

test('GRP-5 TOE-7: een deelnemerssessie ziet het ledenscherm niet', async ({ page, nep }) => {
  await page.goto(`/${nep.demo.fragment(1)}`);
  await page.getByLabel('Cijfer 1').click();
  await page.keyboard.type(nep.demo.pin);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByRole('button', { name: 'Profiel en uitleg' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu' }).getByText('Leden')).toHaveCount(0);
  await page.goto('/#/leden');
  await expect(page).toHaveURL(/#\/start$/); // NAV-13: een scherm van de andere rol gaat naar Start
  await expect(page.getByRole('heading', { name: 'Leden' })).toHaveCount(0);
});

test('GRP-7 AAN-78 [leeg]: een opzetlink opent stap 1 met URL en code ingevuld, verdwijnt uit de adresbalk en zet de groep op', async ({ page, nep }) => {
  const code = nep.setupcode();
  await page.goto(`/#/opzetten?b=${SCRIPT_ID}&code=${code}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verbind je Sheet');
  await expect(page.getByText('Je Sheet is gekoppeld. Geef de groep een naam.')).toBeVisible();
  await expect(page.getByLabel('Script-URL')).toHaveValue(`https://script.google.com/macros/s/${SCRIPT_ID}/exec`);
  await expect(page.getByLabel('Setupcode')).toHaveValue(code);
  await expect(page.getByLabel('Groepsnaam')).toBeFocused();
  // In de adresbalk en de geschiedenis staat alleen #/opzetten.
  expect(new URL(page.url()).hash).toBe('#/opzetten');
  // De velden blijven te wijzigen.
  await expect(page.getByLabel('Script-URL')).toBeEditable();
  await expect(page.getByLabel('Setupcode')).toBeEditable();

  await page.getByLabel('Groepsnaam').fill('Studievrienden');
  await page.getByRole('button', { name: 'Volgende: leden' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wie gaan er mee?');
  await voegLedenToe(page);
  await page.getByRole('button', { name: 'Eva: kies als eigenaar' }).click();
  await page.getByRole('button', { name: 'Volgende: wachtwoord' }).click();
  await page.getByLabel('Nieuw wachtwoord').fill(WACHTWOORD);
  await page.getByLabel('Herhaal wachtwoord').fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Groep opzetten' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Je groep is opgezet');
  nep.store.nieuwVerzoek();
  expect(nep.store.lees('Groep')[0].opgezet).toBe(true);
  expect(nep.store.lees('Leden')).toHaveLength(3);
  await page.getByRole('button', { name: 'Naar beheren' }).click();
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
});

test('GRP-7 [leeg]: een opzetlink met een fout ID of een code van zeven tekens toont stap 0 met de melding', async ({ page, nep }) => {
  const code = nep.setupcode();
  for (const query of [`b=kort&code=${code}`, `b=${SCRIPT_ID}&code=${code.slice(0, 7)}`]) {
    await page.goto('about:blank');
    await page.goto(`/#/opzetten?${query}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Groep opzetten');
    await expect(page.getByRole('alert')).toHaveText('Deze opzetlink klopt niet. Kies in de Sheet opnieuw Weekendje weg en Groep opzetten.');
    expect(new URL(page.url()).hash).toBe('#/opzetten');
    // Ook in de geschiedenis staat de opzetlink niet meer: terug en weer vooruit geeft alleen #/opzetten.
    await page.goBack();
    expect(page.url()).toBe('about:blank');
    await page.goForward();
    expect(new URL(page.url()).hash).toBe('#/opzetten');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Groep opzetten');
    // De handmatige route blijft open, zonder ingevulde velden.
    await page.getByRole('button', { name: 'Ik heb de URL en de setupcode al' }).click();
    await expect(page.getByLabel('Script-URL')).toHaveValue('');
    await expect(page.getByLabel('Setupcode')).toHaveValue('');
  }
});
