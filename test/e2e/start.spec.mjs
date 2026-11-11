import { test as basis, expect } from '@playwright/test';
import { startNep, zetOnderdelen } from './hulp.mjs';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';

const EDITIE = 'demo-editie-2027';
const SCRIPT_ID = 'demo-weekendje-weg-0001';
const WACHTWOORD = 'duinpan-kraanvogel';
const STAPPEN = ['invullen', 'overzicht', 'accommodatie', 'voorbereiding', 'weekend', 'afrekenen', 'afgerond'];
const vanaf = (stap, eerste) => STAPPEN.indexOf(stap) >= STAPPEN.indexOf(eerste);

// Wat een deelnemer (Anna) en de organisator (Eva) bovenaan zien (spec §7.14), per stap.
const DEELNEMER = {
  invullen: ['Vul je beschikbaarheid en wensen in', 'Formulier invullen'],
  overzicht: ['Overlapoverzicht', 'Naar Weekendje prikker'],
  accommodatie: ['Accommodatie', 'Bekijk de accommodaties'],
  voorbereiding: ['Boodschappenlijst', 'Wie neemt wat mee', 'Kookbeurten', 'Carpool', 'Kamer'],
  weekend: ['Uitgave toevoegen'],
  afrekenen: ['Dit staat er voor jou open', 'Naar de afrekening'],
  afgerond: ['Samenvatting'],
};
const ORGANISATOR = {
  invullen: 'Herinnering sturen',
  overzicht: 'Weekend vastleggen',
  accommodatie: 'Accommodaties beheren',
  voorbereiding: 'Boodschappen definitief maken',
  weekend: 'Programma beheren',
  afrekenen: 'Betalingen afvinken', // BV-33: de kop van de kaart heet Openstaande betalingen
  afgerond: 'Nieuwe editie',
};

const test = basis.extend({});
test.use({ serviceWorkers: 'block' });

const menu = (page) => page.getByRole('navigation', { name: 'Menu' });

function wijzig(nep, patch) {
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', EDITIE, patch, nep.store.vind('Edities', EDITIE).versie);
  nep.store.flush();
}

const lokaleDatum = (plusDagen = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + plusDagen);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function startOrganisator(context, page, opties) {
  const demo = maakDemo(opties);
  const nep = await startServer({ port: 0, seed: demo.seed });
  await zetOnderdelen(context); // de bestaande verwachtingen gaan uit van alle onderdelen; onderdelen.spec.mjs test de standaard
  await context.route('https://script.google.com/**', async (route) => {
    // Een gesloten verbinding (ECONNRESET) krijgt één nieuwe poging; is de nepserver al dicht, dan stopt het verzoek.
    const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' }).catch(() => fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' })).catch(() => null);
    if (!antwoord) return route.abort().catch(() => {});
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
  });
  nep.store.nieuwVerzoek();
  const token = nep.beheerlink(nep.store.lees('Leden')[0].id, WACHTWOORD);
  await page.goto('about:blank');
  await page.goto(`/#b=${SCRIPT_ID}&beheer=${token}`);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page).toHaveURL(/#\/start$/); // STA-4, BV-07: na inloggen op Start
  return nep;
}

for (const stap of STAPPEN) {
  test(`STA-3 NAV-10: deelnemer ziet in de stap ${stap} het juiste bovenaan en het juiste menu`, async ({ page, context }) => {
    const nep = await startNep(context, { stap, afrekening: vanaf(stap, 'afrekenen') });
    try {
      await page.goto('/#/start');
      const boven = page.locator('[data-boven]');
      await expect(boven).toHaveAttribute('data-boven', stap);
      for (const t of DEELNEMER[stap]) await expect(boven).toContainText(t);
      // Een deelnemer heeft geen eerstvolgende actie van de organisator.
      await expect(page.getByRole('region', { name: 'Eerstvolgende actie' })).toHaveCount(0);
      // NAV-10: in elke stap dezelfde zeven items; STA-8: de stip staat bij de stap van de editie.
      await expect(menu(page).getByRole('link')).toHaveText(['Start', 'Invullen', 'Voortgang', 'Weekendje prikker', 'Accommodatie', 'Meenemen', 'Afrekening']);
      await expect(menu(page).locator('a[data-stap-nu]')).toHaveCount(['weekend', 'afgerond'].includes(stap) ? 0 : 1);
    } finally { nep.server.close(); }
  });

  test(`STA-3 STA-4: organisator ziet in de stap ${stap} zijn eerstvolgende actie bovenaan`, async ({ page, context }) => {
    const nep = await startOrganisator(context, page, { stap, antwoorden: stap !== 'invullen', afrekening: vanaf(stap, 'afrekenen') });
    try {
      await page.goto('/#/start');
      const boven = page.locator('[data-boven]');
      await expect(boven).toHaveAttribute('data-boven', stap);
      // De eerste knop of het eerste blok is de eerstvolgende actie.
      const actie = page.getByRole('region', { name: 'Eerstvolgende actie' });
      await expect(actie.getByRole('link', { name: ORGANISATOR[stap] })).toBeVisible();
      await expect(boven.locator(':scope > :first-child')).toHaveAttribute('aria-label', 'Eerstvolgende actie');
      await expect(menu(page).getByRole('link', { name: 'Kamers', exact: true })).toHaveCount(0);
      await expect(menu(page).getByRole('link', { name: 'Beheren', exact: true })).toHaveCount(1);
    } finally { nep.server.close(); }
  });
}

test('STA-5: de aftelteller toont dagen tot de vrijdag en op de dag zelf Vandaag!', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'voorbereiding' });
  try {
    wijzig(nep, { vastgelegdWeekend: lokaleDatum(3) });
    await page.goto('/#/start');
    await expect(page.getByLabel('Aftellen')).toContainText('Nog 3 dagen tot het weekend');
    wijzig(nep, { vastgelegdWeekend: lokaleDatum(0) });
    await page.reload();
    await expect(page.getByLabel('Aftellen')).toContainText('Vandaag!');
    wijzig(nep, { vastgelegdWeekend: '' });
    await page.reload();
    await expect(page.locator('[data-boven]')).toBeVisible();
    await expect(page.getByLabel('Aftellen')).toHaveCount(0);
  } finally { nep.server.close(); }
});

test('ARC-1 AAN-30: het archief toont de edities van de groep met organisator en deelnemers', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'afgerond' });
  try {
    nep.store.nieuwVerzoek();
    const acc = nep.store.voegToe('Accommodaties', { editieId: EDITIE, naam: 'Huisje Veluwe', plaats: 'Ede', link: 'https://example.org/huisje', prijsTotaal: 48000, notitie: '' });
    nep.store.flush();
    wijzig(nep, { vastgelegdWeekend: '2027-05-14', deelvorm: 'geboekt', geboektAccommodatieId: acc.id });
    await page.goto('/#/archief');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Archief');
    const kaart = page.locator('[data-editie="Weekendje weg 2027"]');
    await expect(kaart).toContainText('14 tot 16 mei 2027');
    await expect(kaart).toContainText('Huisje Veluwe, Ede');
    await expect(kaart.getByRole('link', { name: 'Link' })).toHaveAttribute('href', 'https://example.org/huisje');
    await expect(kaart).toContainText('Organisatie: Eva');
    await expect(kaart).toContainText('Deelnemers: Anna, Bram, Chris, Eva');
  } finally { nep.server.close(); }
});

test('ARC-2 AAN-29: na Afgerond is alles alleen-lezen en Nieuwe editie neemt de leden over', async ({ page, context }) => {
  const nep = await startOrganisator(context, page, { stap: 'afgerond', antwoorden: true, afrekening: true });
  try {
    await page.goto('/#/accommodatie-beheer');
    await expect(page.getByRole('button', { name: /^Leg .* vast$/ }).first()).toBeDisabled();
    await page.goto('/#/start');
    await page.getByRole('region', { name: 'Eerstvolgende actie' }).getByRole('link', { name: 'Nieuwe editie' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nieuwe editie');
    await expect(page.getByLabel('Anna doet mee')).toBeChecked();
    await expect(page.getByLabel('Chris doet mee')).toBeChecked();
    await expect(page.getByLabel('Titel')).toHaveValue(/2028$/);
    await page.getByLabel('Deadline invullen').fill('2027-12-01');
    await page.getByRole('button', { name: 'Editie maken' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitnodigen');
    nep.store.nieuwVerzoek();
    const nieuw = nep.store.lees('Edities').find((e) => e.id !== EDITIE);
    expect(nieuw.stap).toBe('invullen');
    const namen = nep.store.lees('Deelnemers').filter((d) => d.editieId === nieuw.id).map((d) => nep.store.vind('Leden', d.lidId).voornaam).sort();
    expect(namen).toEqual(['Anna', 'Bram', 'Chris', 'Eva']);
  } finally { nep.server.close(); }
});
