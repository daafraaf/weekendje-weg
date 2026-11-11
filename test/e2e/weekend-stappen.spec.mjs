// Fase 32: weekend en stappen (ACC-1, ACC-7, EDI-7, GELD-9, AAN-88; BV-01, BV-25, BV-26).
import { test, expect } from '@playwright/test';
import { startDemo } from './hulp.mjs';

test.use({ serviceWorkers: 'block' });

const main = (page) => page.getByRole('main');
const editie2027 = (nep) => { nep.store.nieuwVerzoek(); return nep.store.lees('Edities').find((e) => e.jaar === 2027); };

test('ACC-1 ACC-7 AAN-81 BV-01: de organisator legt het weekend vast op Weekendje prikker, kiest na bevestiging een ander en legt opnieuw vast', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'overzicht', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/overzicht');
    const blok = main(page).getByRole('region', { name: 'Weekend vastleggen' });
    const lijst = blok.getByRole('list', { name: 'Top weekenden' });
    await lijst.getByRole('listitem').first().getByRole('button', { name: /^Leg .* vast$/ }).click();
    await expect(page.getByText(/^Het weekend is vastgelegd:/)).toBeVisible();
    const eerste = editie2027(nep).vastgelegdWeekend;
    expect(eerste).not.toBe('');
    await expect(lijst.getByRole('button', { name: / is vastgelegd$/ })).toHaveCount(1);

    await blok.getByRole('button', { name: 'Ander weekend kiezen' }).click();
    const dialoog = blok.getByRole('group', { name: 'Ander weekend kiezen' });
    await expect(dialoog).toContainText('wilt loslaten?');
    await dialoog.getByRole('button', { name: 'Ja, maak los' }).click();
    await expect(page.getByText(/^Het weekend is losgemaakt/)).toBeVisible();
    expect(editie2027(nep).vastgelegdWeekend).toBe('');

    await lijst.getByRole('listitem').nth(1).getByRole('button', { name: /^Leg .* vast$/ }).click();
    await expect(page.getByText(/^Het weekend is vastgelegd:/)).toBeVisible();
    const tweede = editie2027(nep).vastgelegdWeekend;
    expect(tweede).not.toBe('');
    expect(tweede).not.toBe(eerste);
  } finally { nep.server.close(); }
});

test('§7.6.8 BV-01: in stap Weekend staat bij het weekend de melding met een werkende link naar Stappen, ook op 360, 390 en 1280 pixels', async ({ page, context }) => {
  test.skip(test.info().project.name.endsWith('mobiel'), 'breedtes staan in de test');
  const { nep } = await startDemo(context, { stap: 'weekend', als: 'Anne', beheer: true });
  try {
    for (const breedte of [360, 390, 1280]) {
      await page.setViewportSize({ width: breedte, height: 800 });
      await page.goto('about:blank');
      await page.goto('/#/overzicht');
      const blok = main(page).getByRole('region', { name: 'Weekend vastleggen' });
      await expect(blok).toContainText('Het weekend wijzigen kan tot en met de stap Meenemen. Zet de stap terug onder Stappen.');
      await expect(blok.getByRole('button', { name: 'Ander weekend kiezen' })).toHaveCount(0);
      const items = page.getByRole('navigation', { name: 'Menu' }).getByRole('link');
      const dozen = await items.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, label: e.getAttribute('aria-label') }; }));
      expect(dozen).toHaveLength(7);
      for (const d of dozen) {
        expect(d.l, `${breedte} ${d.label}`).toBeGreaterThanOrEqual(0);
        expect(d.r, `${breedte} ${d.label}`).toBeLessThanOrEqual(breedte);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(main(page)).not.toContainText('null');
    }
    await main(page).getByRole('region', { name: 'Weekend vastleggen' }).getByRole('link', { name: 'Stappen' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Stappen');
    await expect(main(page).getByRole('heading', { name: 'Nu: Weekend' })).toBeVisible();
    await expect(main(page).getByRole('button', { name: 'Terug naar Meenemen' })).toBeVisible();
  } finally { nep.server.close(); }
});

test('EDI-7 AAN-88 BV-26: Naar Weekendje prikker met open formulieren vraagt een bevestiging met de namen', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/stappen');
    await main(page).getByRole('button', { name: 'Naar Weekendje prikker' }).click();
    const vraag = main(page).getByRole('group', { name: 'Naar Weekendje prikker bevestigen' });
    await expect(vraag).toContainText('nog niet ingevuld.');
    await expect(vraag).toContainText('Toch door?');
    await vraag.getByRole('button', { name: 'Annuleren' }).click();
    expect(editie2027(nep).stap).toBe('invullen');
    await main(page).getByRole('button', { name: 'Naar Weekendje prikker' }).click();
    await main(page).getByRole('button', { name: 'Ja, naar Weekendje prikker' }).click();
    await expect(main(page).getByRole('heading', { name: 'Bericht voor de groep: Weekendje prikker' })).toBeVisible();
    expect(editie2027(nep).stap).toBe('overzicht');
  } finally { nep.server.close(); }
});

test('EDI-7 GELD-9 AAN-29 AAN-88 BV-25: Naar Afgerond met open betalingen vraagt een bevestiging met het aantal, het bericht zegt niet afgerekend en terug naar Afrekening kan', async ({ page, context }) => {
  const { nep } = await startDemo(context, { stap: 'afrekenen', als: 'Anne', beheer: true });
  try {
    await page.goto('/#/stappen');
    await main(page).getByRole('button', { name: 'Naar Afgerond' }).click();
    const vraag = main(page).getByRole('group', { name: 'Naar Afgerond bevestigen' });
    await expect(vraag).toContainText(/Er staa?n? nog \d+ betalingen? open\. Die kun je na Afgerond nog afvinken\./);
    await expect(vraag).toContainText(/Het weekend is pas over \d+ dagen\./); // beide redenen in één bevestiging
    await expect(vraag).toContainText('Toch afronden?');
    await vraag.getByRole('button', { name: 'Ja, rond af' }).click();
    const bericht = main(page).getByRole('region', { name: 'Bericht voor de groep: Afgerond' });
    await expect(bericht).toBeVisible();
    await expect(bericht).not.toContainText('afgerekend');
    expect(editie2027(nep).stap).toBe('afgerond');

    // Na Afgerond kan een open betaling nog worden afgevinkt.
    await page.goto('/#/afrekening');
    await expect(main(page).getByText('De editie is afgerond. Open betalingen kun je nog afvinken.')).toBeVisible();
    await expect(main(page).getByRole('button', { name: /^Betaling van .* betaald$/ }).first()).toBeEnabled();

    await page.goto('/#/stappen');
    await main(page).getByRole('button', { name: 'Terug naar Afrekening' }).click();
    await expect(main(page).getByRole('heading', { name: 'Nu: Afrekening' })).toBeVisible();
    expect(editie2027(nep).stap).toBe('afrekenen');
  } finally { nep.server.close(); }
});
