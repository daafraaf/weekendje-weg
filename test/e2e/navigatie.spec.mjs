import { test as basis, expect } from '@playwright/test';
import { startNep, startDemo, koppelNep, stapVooruit } from './hulp.mjs';
import { hashToken } from '../../src/server/crypto.js';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

const test = basis.extend({});
test.use({ serviceWorkers: 'block' });

const menu = (page) => page.getByRole('navigation', { name: 'Menu' });

test('NAV-1 NAV-2 NAV-3 NAV-6 NAV-8: Uitleg en uitloggen zitten in het profielmenu, niet in het hoofdmenu', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'accommodatie' });
  try {
    await page.goto('/#/start');
    await expect(menu(page).getByRole('link', { name: 'Invullen', exact: true })).toHaveCount(1);
    await expect(menu(page).getByRole('link', { name: 'Archief' })).toHaveCount(0);
    await expect(menu(page).getByRole('link', { name: 'Uitleg' })).toHaveCount(0);
    const knop = page.getByRole('button', { name: 'Profiel en uitleg' });
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    await knop.click();
    await expect(knop).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Uitleg' })).toBeFocused();
    await page.keyboard.press('Escape'); // NAV-3
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    await expect(knop).toBeFocused();
    await knop.click();
    await page.getByRole('heading', { level: 1 }).click(); // een tik buiten het menu sluit het
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    // NAV-8: ook op een ander scherm bereikbaar
    await page.goto('/#/voortgang');
    await page.getByRole('button', { name: 'Profiel en uitleg' }).click();
    await page.getByRole('link', { name: 'Uitleg' }).click();
    await expect(page.getByRole('heading', { name: 'Welkom bij Weekendje weg' })).toBeVisible();
    await page.getByRole('button', { name: 'Profiel en uitleg' }).click();
    await page.getByRole('button', { name: 'Uitloggen' }).last().click();
    await expect(page.getByRole('heading', { name: 'Welkom bij Weekendje weg' })).toHaveCount(0);
    await expect(menu(page)).toBeHidden();
  } finally { nep.server.close(); }
});

test('NAV-4 NAV-5: Afgelopen weekenden is dicht bij een lopende editie en toont alleen afgeronde edities', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'accommodatie', als: 'Bas' });
  try {
    await page.goto('/#/start');
    const sectie = page.locator('details.afgelopen');
    await expect(sectie).not.toHaveAttribute('open', '');
    await sectie.locator('summary').click();
    await expect(sectie.locator('[data-editie]')).toHaveCount(1); // alleen 2026; de lopende editie staat al bovenaan
    await expect(sectie.locator('[data-editie]')).toContainText('2026');
    await sectie.getByRole('link', { name: 'Bekijk' }).click();
    await expect(page).toHaveURL(/#\/start\?editie=/);
  } finally { nep.server.close(); }
});

test('NAV-4: bij een afgeronde editie staat Afgelopen weekenden open', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'afgerond' });
  try {
    await page.goto('/#/start');
    await expect(page.locator('details.afgelopen')).toHaveAttribute('open', '');
    await expect(page.locator('details.afgelopen [data-editie]').first()).toBeVisible();
  } finally { nep.server.close(); }
});

test('NAV-7: een vraagteken klapt een korte hint open en dicht', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'invullen' });
  try {
    await page.goto('/#/formulier');
    const knop = page.getByRole('button', { name: 'Uitleg bij Kalender' });
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    await knop.click();
    await expect(knop).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/Hele maand/).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
  } finally { nep.server.close(); }
});

test('NAV-9: de beheerschermen zitten achter één menu-item Beheren', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'accommodatie', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/leden');
    for (const naam of ['Leden', 'Lijsten', 'Vragen', 'Stappen', 'Uitnodigen']) await expect(menu(page).getByRole('link', { name: naam, exact: true })).toHaveCount(0);
    const beheren = menu(page).getByRole('link', { name: 'Beheren', exact: true });
    await expect(beheren).toHaveAttribute('aria-current', 'page'); // we staan op een beheerscherm
    await beheren.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beheren');
    await expect(page.getByRole('main').getByRole('link')).toHaveCount(8);
    await page.getByRole('main').getByRole('link', { name: /^Lijsten/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(beheren).toHaveAttribute('aria-current', 'page');
  } finally { nep.server.close(); }
});

const ZEVEN = ['Start', 'Invullen', 'Voortgang', 'Weekendje prikker', 'Accommodatie', 'Meenemen', 'Afrekening'];
const balkNu = (page) => page.getByRole('navigation', { name: 'Stappen van de editie' }).locator('[aria-current="step"] .sb-naam');

test('NAV-10 AAN-12: het menu toont altijd de zeven items in stapvolgorde; een scherm dat nog niet aan de beurt is zegt dat', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'invullen' });
  try {
    await page.goto('/#/start');
    await expect(menu(page).getByRole('link')).toHaveText(ZEVEN);
    await expect(menu(page).locator('.menu-scheiding')).toHaveCount(0);
    await menu(page).getByRole('link', { name: 'Weekendje prikker', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Komt in stap Weekendje prikker' })).toBeVisible();
    await menu(page).getByRole('link', { name: 'Accommodatie', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Komt in stap Accommodatie' })).toBeVisible();
    await page.goto('/#/kamers'); // niet in het menu, wel bereikbaar via het adres
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  } finally { nep.server.close(); }
});

test('NAV-10: in een beheersessie staat Beheren apart na een scheidingslijn', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'accommodatie', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/start');
    await expect(menu(page).getByRole('link')).toHaveText([...ZEVEN.filter((t) => t !== 'Invullen'), 'Beheren']);
    await expect(menu(page).locator('.menu-scheiding + a')).toHaveText('Beheren');
  } finally { nep.server.close(); }
});

test('NAV-11: Afrekening heeft de tabs Wie betaalt wat en Eindafrekening; de oude adressen werken', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'afrekenen', als: 'Bas' });
  try {
    await page.goto('/#/start');
    const item = menu(page).getByRole('link', { name: 'Afrekening', exact: true });
    await item.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitgaven');
    const tabs = page.getByRole('navigation', { name: 'Afrekening' });
    await expect(tabs.getByRole('link', { name: 'Wie betaalt wat' })).toHaveAttribute('aria-current', 'page');
    await expect(item).toHaveAttribute('aria-current', 'page');
    await tabs.getByRole('link', { name: 'Eindafrekening' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eindafrekening');
    await expect(item).toHaveAttribute('aria-current', 'page');
    await page.goto('/#/posten');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitgaven');
  } finally { nep.server.close(); }
});

test('AAN-71: een beheersessie krijgt de balk van de nieuwste eigen editie', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'accommodatie', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/leden');
    await expect(balkNu(page)).toHaveText('Accommodatie'); // 2027; editie 2026 is afgerond
    await expect(menu(page).locator('a[data-stap-nu]')).toHaveText('Accommodatie');
  } finally { nep.server.close(); }
});

// STA-8: de organisator zet de stap in beheer; na verversen tonen balk, menu en start bij elke rol en op elk scherm dezelfde stap.
test('STA-8: na een stapwijziging in beheer tonen balk, menu en start overal dezelfde stap', async ({ browser, context, page }) => {
  const { nep, demo } = await startDemo(context, { stap: 'invullen', als: 'Anne', beheer: true });
  const deelnemer = await browser.newContext({ serviceWorkers: 'block' });
  try {
    nep.store.nieuwVerzoek();
    nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'lokaal'), soort: 'deelnemer', subjectId: demo.deelnemerIds[2027].Bas, verloopt: '2099-01-01T00:00:00.000Z' });
    nep.store.flush();
    await koppelNep(deelnemer, nep, { token: 'lokaal' });
    const bas = await deelnemer.newPage();
    await bas.goto('/#/voortgang');
    await expect(balkNu(bas)).toHaveText('Invullen');

    await page.goto('/#/stappen');
    await expect(balkNu(page)).toHaveText('Invullen');
    await stapVooruit(page, 'Weekendje prikker'); // AAN-88: bevestigen als niet iedereen heeft ingevuld
    await expect(balkNu(page)).toHaveText('Weekendje prikker'); // de schil vraagt de stand opnieuw op

    await bas.reload();
    for (const [p, schermen] of [[bas, ['start', 'formulier', 'voortgang', 'overzicht', 'accommodaties', 'meenemen', 'posten', 'afrekening']], [page, ['start', 'voortgang', 'overzicht', 'leden', 'stappen']]]) {
      for (const scherm of schermen) {
        await p.goto(`/#/${scherm}`);
        await expect(balkNu(p), scherm).toHaveText('Weekendje prikker');
        await expect(menu(p).locator('a[data-stap-nu]'), scherm).toHaveText('Weekendje prikker');
      }
      await p.goto('/#/start');
      await expect(p.getByRole('main').locator('.wz-kop .t-cap').first()).toHaveText('Weekendje prikker');
    }
  } finally { await deelnemer.close(); nep.server.close(); }
});
