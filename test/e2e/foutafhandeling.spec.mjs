// Fase 29: foutafhandeling en versie (NFR-21, NFR-22, §7.17, SYNC-5, SYNC-8, EDI-12, NAV-13; BV-04, BV-05,
// BV-12, BV-13, BV-14, BV-24, BV-35).
import { test, expect } from '@playwright/test';
import { startNep, startDemo } from './hulp.mjs';

test.use({ serviceWorkers: 'block' });

const keuken = (page) => page.getByRole('list', { name: 'Uit eigen keuken' }).locator('[data-item]');

// Het script weigert elke actie in de bundel met een technische melding, zoals een oud script dat doet.
async function weigerBundel(page) {
  await page.route('https://script.google.com/**', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.actie !== 'bundel') return route.fallback();
    const uitslagen = body.data.acties.map((_, i) => ({ ok: false, fout: 'ongeldig', melding: `Veld data.acties[${i}].actie: onbekende keuze.` }));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { uitslagen } }) });
  });
}

test('AAN-14 §7.17 BV-04: een nepbackend met apiVersie 1 toont de verouderd-melding', async ({ page, context }) => {
  const nep = await startNep(context, { apiVersie: 1 });
  try {
    await page.goto('/#/start');
    await expect(page.getByRole('main')).toContainText('Het script van deze groep is verouderd.');
    await expect(page.getByRole('main')).not.toContainText('Veld');
  } finally { nep.server.close(); }
});

test('NFR-21 SYNC-5 BV-05: een geweigerde wachtrij-actie toont geen veldnaam', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'voorbereiding', items: true });
  try {
    await weigerBundel(page);
    await page.goto('/#/meenemen');
    await keuken(page).nth(0).getByRole('button', { name: /^Ik neem .* mee$/ }).click();
    const melding = page.locator('.sync-terug');
    await expect(melding).toContainText('Niet opgeslagen. Je wijziging is teruggezet. Deze handeling kent het script van de groep nog niet.');
    await expect(melding).not.toContainText('Veld');
    await expect(melding).not.toContainText('data.');
  } finally { nep.server.close(); }
});

test('SYNC-5 BV-24: na herladen staat er geen Niet opgeslagen als er niets terug te zetten is', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'voorbereiding', items: true });
  try {
    await page.goto('/#/meenemen');
    nep.zetStoring(['bundel']);
    await keuken(page).nth(0).getByRole('button', { name: /^Ik neem .* mee$/ }).click();
    await expect(page.locator('.sync')).toHaveText('Niet opgeslagen, opnieuw proberen');
    // Na herladen gaat de bewaarde handeling alsnog en het script weigert haar.
    nep.zetStoring([]);
    await weigerBundel(page);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await page.reload();
    await expect(keuken(page)).toHaveCount(9);
    await expect(keuken(page).nth(0)).toContainText('nog niemand');
    await expect(page.locator('.sync-terug')).toBeHidden();
    await expect(page.getByText(/Niet opgeslagen/)).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ww-wachtrij:')).length)).toBe(0);
  } finally { nep.server.close(); }
});

test('NAV-13 BV-14: een onbekende route stuurt door naar #/start', async ({ page, context }) => {
  const nep = await startNep(context);
  try {
    for (const adres of ['/#/vragen', '/#/onzin', '/#/vragen-beheer']) {
      await page.goto(adres);
      await expect(page.getByRole('main')).toBeVisible();
      await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/start');
    }
  } finally { nep.server.close(); }
});

test('NFR-21 EDI-12 SYNC-8 BV-05 BV-12 BV-13: eigen vragen geven leesbare meldingen en een bezig-status in de knop', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/vragen-beheer');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eigen vragen');
    const knop = page.getByRole('button', { name: 'Vraag toevoegen' });
    const melding = page.getByRole('main').getByRole('alert');
    // BV-05: een lege vraag.
    await knop.click();
    await expect(melding).toHaveText('Vul een vraag in.');
    await expect(page.getByRole('main')).not.toContainText('Veld data.');
    // BV-12: een keuzevraag met één optie; de vorige melding verdwijnt.
    await page.getByLabel('Vraag', { exact: true }).fill('Welke kleur shirt?');
    await page.getByLabel('Type').selectOption('keuze');
    const opties = page.getByRole('combobox', { name: /Antwoordopties/ });
    await opties.fill('Rood');
    await opties.press('Enter');
    await knop.click();
    await expect(melding).toHaveText('Geef minstens twee antwoordopties.');
    // BV-13: met twee opties wacht de knop met aria-busy en Opslaan…; daarna is het veld leeg en staat de bevestiging bij het formulier.
    await page.route('https://script.google.com/**', async (route) => {
      if ((route.request().postData() || '').includes('"vragenBeheren"')) await new Promise((r) => setTimeout(r, 1500));
      await route.fallback();
    });
    await opties.fill('Blauw');
    await opties.press('Enter');
    await knop.click();
    await expect(knop).toHaveAttribute('aria-busy', 'true');
    await expect(knop).toHaveText('Opslaan…');
    await expect(melding).toBeHidden();
    const bevestiging = page.locator('.vb-formulier').getByRole('status').filter({ hasText: 'Vraag toegevoegd.' });
    await expect(bevestiging).toBeVisible();
    await expect(page.getByLabel('Vraag', { exact: true })).toHaveValue('');
    await expect(page.getByText('Welke kleur shirt?')).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  } finally { nep.server.close(); }
});

test('SYNC-8 BV-35: een item toevoegen toont Opslaan… in de knop, de bevestiging bij het veld en daarna een leeg veld', async ({ page, context }) => {
  const nep = await startNep(context, { stap: 'voorbereiding', items: true });
  try {
    await page.goto('/#/meenemen');
    await page.route('https://script.google.com/**', async (route) => {
      if ((route.request().postData() || '').includes('"itemOpslaan"')) await new Promise((r) => setTimeout(r, 1500));
      await route.fallback();
    });
    const veld = page.getByLabel('Nieuw item', { exact: true });
    await veld.fill('Badminton set');
    const knop = page.getByRole('button', { name: 'Nieuw item toevoegen' });
    await knop.click();
    await expect(knop).toHaveAttribute('aria-busy', 'true');
    await expect(knop).toHaveText('Opslaan…');
    const sectie = page.getByRole('region', { name: 'Spullen' });
    await expect(sectie.getByRole('status')).toHaveText('Badminton set staat op de lijst.');
    await expect(sectie.getByLabel('Nieuw item', { exact: true })).toHaveValue('');
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  } finally { nep.server.close(); }
});

test('SYNC-8 BV-35: de deelvorm wisselen toont Opslaan… in de knop en de bevestiging in het blok', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'accommodatie', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/accommodatie-beheer');
    const blok = page.getByRole('region', { name: 'Hoe kiezen we?' });
    await expect(blok).toBeVisible();
    await page.route('https://script.google.com/**', async (route) => {
      if ((route.request().postData() || '').includes('"deelvormZetten"')) await new Promise((r) => setTimeout(r, 1500));
      await route.fallback();
    });
    const knop = blok.getByRole('button', { pressed: false });
    await knop.click();
    await expect(knop).toHaveAttribute('aria-busy', 'true');
    await expect(knop).toHaveText('Opslaan…');
    await expect(blok.getByRole('status')).toContainText('We kiezen nu:');
  } finally { nep.server.close(); }
});

// Layout: de nieuwe bezig-tekst en meldingen passen op telefoon en laptop; geen tekst "null" in beeld.
for (const breedte of [360, 390, 1280]) {
  test(`NFR-9 SYNC-8: meenemen en eigen vragen passen op ${breedte} pixels, zonder null in main`, async ({ page, context }) => {
    const { nep } = await startDemo(context, { stap: 'overzicht', als: 'Anne', beheer: true }); // boodschappen nog niet definitief
    try {
      await page.setViewportSize({ width: breedte, height: 800 });
      for (const route of ['vragen-beheer', 'meenemen']) { // Start heeft nog "null" (BV-02, fase 30)
        await page.goto(`/#/${route}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByRole('main')).not.toContainText('null');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
      // De bezig-tekst in de plusknop blijft binnen beeld.
      await page.route('https://script.google.com/**', async (route) => {
        if ((route.request().postData() || '').includes('"itemOpslaan"')) await new Promise((r) => setTimeout(r, 1000));
        await route.fallback();
      });
      await page.getByLabel('Nieuw item', { exact: true }).fill('Frisbee');
      const knop = page.getByRole('button', { name: 'Nieuw item toevoegen' });
      await knop.click();
      await expect(knop).toHaveText('Opslaan…');
      const doos = await knop.boundingBox();
      expect(doos.x + doos.width).toBeLessThanOrEqual(breedte);
      await expect(page.getByText('Frisbee staat op de lijst.')).toBeVisible();
      await expect(page.getByRole('main')).not.toContainText('null');
    } finally { nep.server.close(); }
  });

  test(`NAV-12: alle menu-items vallen binnen beeld op ${breedte} pixels`, async ({ page, context }) => {
    // Het mobiele menu met zeven items scrolt nog horizontaal; NAV-12 (iconen zonder label) hoort bij fase 31.
    test.fixme(breedte < 768, 'NAV-12: het mobiele menu wordt in fase 31 passend gemaakt');
    const { nep } = await startDemo(context, { stap: 'invullen', als: 'Anne', beheer: true });
    try {
      await page.setViewportSize({ width: breedte, height: 800 });
      await page.goto('/#/start');
      const items = page.getByRole('navigation', { name: 'Menu' }).getByRole('link');
      await expect(items.first()).toBeVisible();
      for (const doos of await items.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }))) {
        expect(doos.l).toBeGreaterThanOrEqual(0);
        expect(doos.r).toBeLessThanOrEqual(breedte);
        expect(doos.t).toBeGreaterThanOrEqual(0);
        expect(doos.b).toBeLessThanOrEqual(800);
      }
    } finally { nep.server.close(); }
  });
}
