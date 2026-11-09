import { test as basis, expect } from '@playwright/test';
import { startNep } from './hulp.mjs';
import { maakStandaardMaaltijden } from '../../src/server/acties/maaltijden.js';

// Demo in de stap Voorbereiding met de demoantwoorden en het weekend van 11 juni 2027 vastgelegd; de sessie is Anna.
const test = basis.extend({
  nep: [async ({ context }, use) => { const nep = await startNep(context, { antwoorden: true, stap: 'voorbereiding', items: true }); await use(nep); nep.server.close(); }, { auto: true }],
});
test.use({ serviceWorkers: 'block' });
const EDITIE = 'demo-editie-2027';

function leg(nep, extra = {}) {
  nep.store.nieuwVerzoek();
  nep.store.werkBij('Edities', EDITIE, { vastgelegdWeekend: '2027-06-11', ...extra }, 1);
  maakStandaardMaaltijden(nep.store, EDITIE);
  nep.store.flush();
}

test('KOK-1 KOK-2 KOK-3 KOK-4: kok worden, eetwensen zonder namen en een ingrediënt op de boodschappenlijst', async ({ page, nep }) => {
  leg(nep);
  await page.goto('/#/kookbeurten');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kookbeurten');
  // KOK-1: zes maaltijden, per dag gegroepeerd met de datum.
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Vrijdag 11 juni', 'Zaterdag 12 juni', 'Zondag 13 juni']);
  await expect(page.locator('[data-maaltijd]')).toHaveCount(6);
  // KOK-4: een deelnemer die niet kookt ziet de eetwensen niet.
  await expect(page.getByText('Eetwensen, zonder namen')).toHaveCount(0);
  // KOK-2: kok worden.
  await page.getByRole('button', { name: 'Ik kook zaterdag diner' }).click();
  await expect(page.getByRole('button', { name: 'Stoppen met koken: zaterdag diner' })).toBeVisible();
  await expect(page.getByText('Eetwensen, zonder namen')).toHaveCount(1);
  // De aantallen en de vrije tekst staan er, de namen van Eva, Bram en Chris niet.
  await expect(page.locator('[data-wensen]')).toContainText('Vegetarisch 2');
  await expect(page.locator('[data-teksten]')).toContainText('Notenallergie');
  const paneel = await page.locator('.kk-wensen').innerText();
  for (const naam of ['Eva', 'Bram', 'Chris']) expect(paneel).not.toContain(naam);
  // KOK-3: een ingrediënt komt met de maaltijdnaam op de boodschappenlijst.
  await page.getByLabel('Ingrediënt voor zaterdag diner', { exact: true }).fill('Risottorijst');
  await page.getByRole('button', { name: 'Ingrediënt voor zaterdag diner toevoegen' }).click();
  await expect(page.locator('[data-ingredient]')).toHaveText(['Risottorijst']);
  await page.goto('/#/boodschappen');
  await expect(page.locator('[data-item]', { hasText: 'Risottorijst' })).toContainText('Zaterdag diner');
  // Stoppen haalt de wensen weer weg.
  await page.goto('/#/kookbeurten');
  await page.getByRole('button', { name: 'Stoppen met koken: zaterdag diner' }).click();
  await expect(page.getByText('Eetwensen, zonder namen')).toHaveCount(0);
});

test('PRG-2 PRG-3: het programma toont zaterdag op tijd met het punt van nu uitgelicht, ook op het startscherm', async ({ page, nep }) => {
  leg(nep, { stap: 'weekend' });
  for (const [dag, begin, eind, titel, adres] of [['za', '18:30', '', 'Risotto', ''], ['za', '09:30', '', 'Ontbijt', 'Hoeve 1, Meppel'], ['za', '11:00', '12:30', 'Kanoën op de Reest', ''], ['vr', '20:00', '', 'Aankomst', '']]) {
    nep.store.nieuwVerzoek();
    nep.store.voegToe('Programma', { editieId: EDITIE, dag, begin, eind, titel, adres, link: '', notitie: '' });
    nep.store.flush();
  }
  await page.clock.setFixedTime(new Date(2027, 5, 12, 11, 20)); // zaterdag 12 juni, 11:20
  await page.goto('/#/programma');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Programma');
  // PRG-2: vandaag (zaterdag) is gekozen en de punten staan op begintijd.
  await expect(page.getByRole('button', { name: 'Za 12 · vandaag' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-punt] .prg-tijd')).toHaveText(['09:30', '11:00 – 12:30', '18:30']);
  await expect(page.locator('[data-punt] .prg-titel')).toContainText(['Ontbijt', 'Kanoën op de Reest', 'Risotto']);
  // PRG-3: het punt dat nu loopt is uitgelicht.
  await expect(page.locator('[data-status="nu"]')).toContainText('Kanoën op de Reest');
  // PRG-2: een adres opent als kaartlink.
  await expect(page.getByRole('link', { name: 'Kaart van Hoeve 1, Meppel' })).toHaveAttribute('href', 'https://maps.google.com/?q=Hoeve%201%2C%20Meppel');
  // Een andere dag.
  await page.getByRole('button', { name: /^Vr 11/ }).click();
  await expect(page.locator('[data-punt] .prg-titel')).toHaveText(['Aankomst']);
  // Een deelnemer beheert het programma niet.
  await expect(page.getByRole('button', { name: 'Programmapunt toevoegen' })).toHaveCount(0);
  // PRG-3: het startscherm toont het programma van vandaag met het punt van nu uitgelicht.
  await page.goto('/#/start');
  await expect(page.getByRole('heading', { name: 'Programma van vandaag' })).toBeVisible();
  await expect(page.locator('.prg-vandaag [data-status="nu"]')).toContainText('Kanoën op de Reest');
});
