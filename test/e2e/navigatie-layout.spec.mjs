// Fase 31: navigatie en layout (NAV-10, NAV-12, NAV-14, NAV-15, UIT-2, NFR-9; BV-16, BV-17, BV-18, BV-19).
import { test, expect } from '@playwright/test';
import { startDemo } from './hulp.mjs';

test.use({ serviceWorkers: 'block' });

const menu = (page) => page.getByRole('navigation', { name: 'Menu' });
const NAMEN_DEELNEMER = ['Start', 'Invullen', 'Voortgang', 'Weekendje prikker', 'Accommodatie', 'Meenemen', 'Afrekening'];
const NAMEN_BEHEER = ['Start', 'Voortgang', 'Weekendje prikker', 'Accommodatie', 'Meenemen', 'Afrekening', 'Beheren'];
// De breedtes staan in de tests zelf; de mobiele projecten voegen niets toe.
const alleenDesktop = () => test.skip(test.info().project.name.endsWith('mobiel'), 'breedtes staan in de test');

// BV-16, NAV-12, NFR-9: alle items binnen beeld, geen horizontaal scrollen, volle naam in aria-label, tikdoel 44 px.
for (const [rol, als, beheer, namen] of [['deelnemer', 'Bas', false, NAMEN_DEELNEMER], ['organisator', 'Anne', true, NAMEN_BEHEER]]) {
  test(`NAV-12 NFR-9 BV-16: het menu van de ${rol} past op 360, 390 en 1280 pixels, zonder null in main`, async ({ page, context }) => {
    alleenDesktop();
    const { nep } = await startDemo(context, { stap: 'invullen', als, beheer });
    try {
      for (const breedte of [360, 390, 1280]) {
        await page.setViewportSize({ width: breedte, height: 800 });
        // Fase 32 (BV-01): Weekendje prikker heeft voor de organisator het weekendblok, dus die route ook.
        for (const route of beheer ? ['start', 'voortgang', 'overzicht', 'meenemen', 'posten'] : ['start', 'voortgang', 'meenemen', 'posten']) {
          await page.goto('about:blank');
          await page.goto(`/#/${route}`);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          const items = menu(page).getByRole('link');
          await expect(items).toHaveCount(namen.length);
          const dozen = await items.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, label: e.getAttribute('aria-label') }; }));
          expect(dozen.map((d) => d.label)).toEqual(namen);
          for (const d of dozen) {
            expect(d.l, `${breedte} ${route} ${d.label}`).toBeGreaterThanOrEqual(0);
            expect(d.r, `${breedte} ${route} ${d.label}`).toBeLessThanOrEqual(breedte);
            expect(d.t).toBeGreaterThanOrEqual(0);
            expect(d.b).toBeLessThanOrEqual(800);
            expect(d.w, `${breedte} ${route} ${d.label} breed genoeg`).toBeGreaterThanOrEqual(44);
            expect(d.h).toBeGreaterThanOrEqual(44);
          }
          const nav = await menu(page).evaluate((m) => ({ sw: m.scrollWidth, cw: m.clientWidth }));
          expect(nav.sw, `${breedte} ${route}: het menu scrolt niet`).toBeLessThanOrEqual(nav.cw);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          await expect(page.getByRole('main')).not.toContainText('null');
          // NAV-12: op mobiel heeft alleen het actieve item een zichtbaar label.
          const zichtbaar = await items.evaluateAll((els) => els.filter((e) => e.querySelector('span').getBoundingClientRect().width > 0).map((e) => e.getAttribute('aria-label')));
          if (breedte < 768) expect(zichtbaar).toEqual([{ start: 'Start', voortgang: 'Voortgang', overzicht: 'Weekendje prikker', meenemen: 'Meenemen', posten: 'Afrekening' }[route]]);
          else expect(zichtbaar).toEqual(namen);
        }
      }
    } finally { nep.server.close(); }
  });
}

test('NAV-12 BV-17: Accommodatie heeft een ander icoon dan Start', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Bas' });
  try {
    await page.goto('/#/start');
    const paden = (naam) => menu(page).getByRole('link', { name: naam, exact: true }).locator('svg').innerHTML();
    await expect(menu(page).getByRole('link', { name: 'Accommodatie', exact: true })).toBeVisible();
    const start = await paden('Start');
    const acc = await paden('Accommodatie');
    expect(acc).not.toEqual(start);
    expect(acc).not.toContain('M3.5 10.5 12 3.5'); // geen dak meer
  } finally { nep.server.close(); }
});

test('NAV-15 §7.14 BV-18: Meenemen in stap Invullen heeft het bovenschrift Meenemen', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Bas' });
  try {
    await page.goto('/#/meenemen');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wie neemt wat mee');
    await expect(page.locator('.wz-kop .t-cap').first()).toHaveText('Meenemen');
    await page.goto('/#/posten');
    await expect(page.locator('.wz-kop .t-cap').first()).toHaveText('Afrekening');
  } finally { nep.server.close(); }
});

test('NAV-14 BV-19: op 1280 pixels is de inhoud breed, staat het menu op één lijn met de stappenbalk en de editienaam in de kopregel', async ({ page, context }) => {
  alleenDesktop();
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Anne', beheer: true });
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/start');
    const titel = (await page.getByRole('heading', { level: 1 }).textContent()).trim();
    await page.goto('/#/voortgang');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // De stappenbalk toont alle namen voluit.
    for (const naam of ['Weekendje prikker', 'Accommodatie']) {
      const el = page.locator('.sb-lijst .sb-naam', { hasText: naam });
      await expect(el).toBeVisible();
      const maat = await el.evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
      expect(maat.sw, `${naam} niet afgekort`).toBeLessThanOrEqual(maat.cw);
    }
    const maten = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return { main: r('main').width, menu: r('nav.menu').top, balk: r('nav.stappenbalk').top, balkR: r('nav.stappenbalk').right, profielR: r('.profiel').right };
    });
    expect(maten.main).toBeGreaterThanOrEqual(860);
    expect(maten.main).toBeLessThanOrEqual(940);
    expect(Math.abs(maten.menu - maten.balk), 'menu op één lijn met de stappenbalk').toBeLessThanOrEqual(2);
    expect(Math.abs(maten.profielR - maten.balkR), 'profielknop boven de rechterkant van de balk').toBeLessThanOrEqual(2);
    await expect(page.locator('.kopregel')).toContainText(titel);
    await expect(page.locator('.kopregel .kop-titel')).toBeVisible();
    // Op mobiel staat de titel in de stappenbalk, niet in de kopregel.
    await page.setViewportSize({ width: 390, height: 800 });
    await expect(page.locator('.kopregel .kop-titel')).toBeHidden();
  } finally { nep.server.close(); }
});
