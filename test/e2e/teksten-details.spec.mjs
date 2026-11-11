// Fase 33: teksten, onderdelen en details (EDI-10, EDI-11, GRP-5, ACC-10, MEE-10, GELD-12, AAN-89, AAN-90;
// BV-09, BV-10, BV-11, BV-15, BV-27, BV-28, BV-30, BV-31, BV-34).
import { test, expect } from '@playwright/test';
import { startDemo, startNep, naarLeden, stapVooruit } from './hulp.mjs';
import { nieuweEditieVoorstel } from '../../src/shared/editie.js';

test.use({ serviceWorkers: 'block' });

const main = (page) => page.getByRole('main');
const OUDE_DEADLINE = /vult iedereen .* in|kan nu tot|Invullen kan tot/;

test('EDI-10 DDL-1 BV-10 BV-09: Nieuwe editie, Stappen en Beheren zeggen niet dat de deadline het invullen afsluit', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/editie-nieuw');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nieuwe editie');
    await expect(page.getByLabel('Deadline invullen')).toHaveAccessibleDescription(/^Graag ingevuld vóór deze dag\./);
    await expect(main(page)).not.toContainText(OUDE_DEADLINE);
    await page.goto('/#/stappen');
    await expect(main(page).getByRole('heading', { name: 'Nu: Invullen' })).toBeVisible();
    await expect(main(page)).toContainText(/Graag ingevuld vóór \S+ \d+ \S+\./);
    await expect(main(page)).not.toContainText(OUDE_DEADLINE);
    await page.goto('/#/beheren');
    await expect(main(page)).toContainText('Stap en deadline');
    await expect(main(page)).not.toContainText('verwachte datums');
  } finally { nep.server.close(); }
});

test('EDI-11 AAN-89 BV-11: Nieuwe editie stelt het eerste vrije jaar voor, met titel en kalenderjaar', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'afgerond', als: 'Anne', beheer: true });
  try {
    const voorstel = nieuweEditieVoorstel({ jaren: [2026, 2027] });
    await page.goto('/#/editie-nieuw');
    await expect(page.getByLabel('Titel')).toHaveValue(voorstel.titel);
    await expect(page.getByLabel('Jaar')).toHaveValue(String(voorstel.jaar));
    await expect(page.getByLabel('Periode van')).toHaveValue(`${voorstel.jaar}-01-01`);
    await expect(page.getByLabel('Periode tot en met')).toHaveValue(`${voorstel.jaar}-12-31`);
    // Een ander jaar schuift titel en periode mee.
    await page.getByLabel('Jaar').selectOption(String(voorstel.jaar + 1));
    await expect(page.getByLabel('Titel')).toHaveValue(`Weekendje weg ${voorstel.jaar + 1}`);
    await expect(page.getByLabel('Periode van')).toHaveValue(`${voorstel.jaar + 1}-01-01`);
  } finally { nep.server.close(); }
});

test('GRP-5 AAN-90 BV-15: geen knop om jezelf inactief te maken, wel een waarschuwing bij een dubbele naam', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Anne', beheer: true });
  try {
    await naarLeden(page);
    await expect(main(page).getByRole('button', { name: 'Bas inactief maken', exact: true })).toBeVisible();
    await expect(main(page).getByRole('button', { name: 'Anne inactief maken', exact: true })).toHaveCount(0);
    await page.getByLabel('Naam', { exact: true }).fill(' bas');
    await expect(page.getByLabel('Naam', { exact: true })).toHaveAccessibleDescription(/Er is al een lid dat bas heet\./);
    await page.getByLabel('Naam', { exact: true }).fill('Bastiaan');
    await expect(main(page).getByText('Er is al een lid')).toBeHidden();
  } finally { nep.server.close(); }
});

test('OND-2 BV-27: bevestiging bij Ander weekend kiezen en het bericht bij Meenemen noemen geen uitgezette onderdelen', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'accommodatie', als: 'Anne', beheer: true, onderdelen: 'standaard' });
  try {
    await page.goto('/#/overzicht');
    const blok = main(page).getByRole('region', { name: 'Weekend vastleggen' });
    await blok.getByRole('button', { name: 'Ander weekend kiezen' }).click();
    const dialoog = blok.getByRole('group', { name: 'Ander weekend kiezen' });
    await expect(dialoog).toContainText('wilt loslaten?');
    await expect(dialoog).not.toContainText(/maaltijd|programma/);
    await dialoog.getByRole('button', { name: 'Annuleren' }).click();
    await page.goto('/#/stappen');
    await stapVooruit(page, 'Meenemen');
    const bericht = main(page).getByRole('region', { name: 'Bericht voor de groep: Meenemen' });
    await expect(bericht).toContainText('Kijk in de app wat je meeneemt.');
    await expect(bericht).not.toContainText(/kook|rijd/);
  } finally { nep.server.close(); }
});

test('§7.12.4 BV-28: naar Accommodatie zonder opties vraagt een bevestiging en het bericht vraagt geen top 3', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'overzicht', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/stappen');
    await main(page).getByRole('button', { name: 'Naar Accommodatie' }).click();
    const vraag = main(page).getByRole('group', { name: 'Naar Accommodatie bevestigen' });
    await expect(vraag).toContainText('Er staan nog geen accommodaties klaar.');
    await vraag.getByRole('button', { name: 'Ja, naar Accommodatie' }).click();
    const bericht = main(page).getByRole('region', { name: 'Bericht voor de groep: Accommodatie' });
    await expect(bericht).toContainText('De organisator zet binnenkort opties in de app.');
    await expect(bericht).not.toContainText('top 3');
  } finally { nep.server.close(); }
});

test('MEE-10 BV-30: de organisator wijst een item toe aan een deelnemer; ook op 360, 390 en 1280 pixels past alles', async ({ page, context }) => {
  test.skip(test.info().project.name.endsWith('mobiel'), 'breedtes staan in de test');
  const { nep } = await startDemo(context, { stap: 'voorbereiding', als: 'Anne', beheer: true });
  try {
    for (const breedte of [360, 390, 1280]) {
      await page.setViewportSize({ width: breedte, height: 800 });
      await page.goto('about:blank');
      await page.goto('/#/meenemen');
      await expect(main(page).getByRole('combobox', { name: 'Kaartspel toewijzen aan' })).toBeVisible();
      const items = page.getByRole('navigation', { name: 'Menu' }).getByRole('link');
      const dozen = await items.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, label: e.getAttribute('aria-label') }; }));
      expect(dozen.length).toBeGreaterThan(0);
      for (const d of dozen) {
        expect(d.l, `${breedte} ${d.label}`).toBeGreaterThanOrEqual(0);
        expect(d.r, `${breedte} ${d.label}`).toBeLessThanOrEqual(breedte);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(main(page)).not.toContainText('null');
    }
    await main(page).getByRole('combobox', { name: 'Kaartspel toewijzen aan' }).selectOption({ label: 'Sanne' });
    await expect(main(page).getByText('Sanne neemt Kaartspel mee.')).toBeVisible();
    const rij = main(page).getByRole('listitem').filter({ hasText: 'Kaartspel' });
    await expect(rij.getByText('Sanne', { exact: true })).toBeVisible();
    nep.store.nieuwVerzoek();
    const item = nep.store.lees('Items').find((i) => i.naam === 'Kaartspel');
    const sanne = nep.store.lees('Deelnemers').find((d) => d.editieId === item.editieId && nep.store.vind('Leden', d.lidId).voornaam === 'Sanne');
    expect(nep.store.lees('Claims').filter((c) => c.itemId === item.id).map((c) => c.deelnemerId)).toEqual([sanne.id]);
  } finally { nep.server.close(); }
});

test('MEE-10 OND-2 BV-31: onder Uit eigen keuken geen categorie zolang Boodschappen uit staat', async ({ page, context }) => {
  const open = (seed) => { for (const e of seed.Edities) e.boodschappenDefinitief = false; };
  const { nep } = await startDemo(context, { stap: 'voorbereiding', als: 'Bas', onderdelen: 'standaard', aanpassen: open });
  try {
    await page.goto('/#/meenemen');
    await expect(main(page).getByRole('textbox', { name: 'Nieuw item uit je keuken' })).toBeVisible();
    await expect(main(page).getByRole('combobox', { name: /^Categorie van/ })).toHaveCount(0);
  } finally { nep.server.close(); }
});

test('GELD-12 BV-34: wisselen van Gelijk naar Bedrag vult de bedragen voor en laat nog € 0,00 te verdelen zien', async ({ page, context }) => {
  const nep = await startNep(context, { posten: true, stap: 'weekend' });
  try {
    await page.goto('/#/start');
    await page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Afrekening', exact: true }).click();
    await page.getByRole('button', { name: 'Uitgave toevoegen' }).click();
    await page.getByLabel('Omschrijving').fill('Taxi');
    await page.getByLabel('Bedrag', { exact: true }).fill('100,00');
    await expect(page.getByText('Verdeeld: € 100,00')).toBeVisible();
    await page.getByRole('group', { name: 'Verdeelwijze' }).getByRole('button', { name: 'Bedrag' }).click();
    await expect(page.getByText('Nog € 0,00 te verdelen')).toBeVisible();
    const waarden = await Promise.all(['Anna', 'Bram', 'Chris', 'Eva'].map((n) => page.getByLabel(n, { exact: true }).inputValue()));
    expect(waarden).toEqual(['25,00', '25,00', '25,00', '25,00']);
    await expect(page.getByRole('button', { name: 'Opslaan' })).toBeEnabled();
  } finally { nep.server.close(); }
});
