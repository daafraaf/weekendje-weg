// Toegankelijkheid (NFR-11, WCAG 2.1 AA): per scherm namen en labels, alles bereikbaar met Tab, een zichtbare
// focusstijl en contrast in licht en donker; daarna een paar flows alleen met het toetsenbord.
import { test, expect } from '@playwright/test';
import { startDemo } from './hulp.mjs';
import { startServer } from '../mock-backend/server.mjs';
import { maakVolledigeDemo } from '../mock-backend/demo.mjs';

test.use({ serviceWorkers: 'block' });

const DEELNEMER = ['start', 'archief', 'formulier', 'voortgang', 'overzicht', 'posten', 'afrekening', 'accommodaties', 'meenemen', 'boodschappen', 'kookbeurten', 'programma', 'kamers', 'carpool', 'uitleg'];
const BEHEER = ['leden', 'start', 'editie-nieuw', 'uitnodigen', 'lijsten-beheer', 'vragen-beheer', 'voortgang', 'overzicht', 'detail', 'stappen', 'accommodatie-beheer', 'meenemen', 'kookbeurten', 'programma', 'kamers', 'carpool', 'posten', 'afrekening'];

// Draait in de pagina: zoekt problemen met namen, labels, tabvolgorde en contrast. Geeft een lijst met teksten.
function controleer() {
  const fouten = [];
  const zichtbaar = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0 && !el.closest('[hidden],[inert]');
  };
  const beschrijf = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''} "${(el.textContent || '').trim().slice(0, 30)}"`;
  const naam = (el) => {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
    const door = el.getAttribute('aria-labelledby');
    if (door) return door.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
    if (el.labels && el.labels.length) return [...el.labels].map((l) => l.textContent).join(' ').trim();
    if (el.title) return el.title.trim();
    if (el.tagName === 'INPUT' && ['button', 'submit'].includes(el.type)) return el.value;
    const alt = [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join(' ');
    return `${el.textContent || ''} ${alt}`.trim();
  };

  // Elk bedieningselement heeft een naam; velden hebben een label; geen positieve tabindex.
  const bediening = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [tabindex]')]
    .filter((el) => zichtbaar(el) && !(el.tagName === 'INPUT' && el.type === 'hidden'));
  for (const el of bediening) {
    if (!naam(el)) fouten.push(`geen naam: ${beschrijf(el)}`);
    if (el.tabIndex > 0) fouten.push(`positieve tabindex: ${beschrijf(el)}`);
    const uitgezet = el.disabled || el.getAttribute('aria-disabled') === 'true';
    if (!uitgezet && el.tabIndex < 0 && !el.matches('[role="radio"],[role="tab"]')) fouten.push(`niet met Tab bereikbaar: ${beschrijf(el)}`);
  }
  // Afbeeldingen en svg's: met een naam of verborgen voor hulpsoftware.
  for (const el of document.querySelectorAll('img, svg, [role="img"]')) {
    if (!zichtbaar(el) || el.closest('[aria-hidden="true"]')) continue;
    if (el.tagName === 'IMG' && el.hasAttribute('alt')) continue;
    if (el.closest('button, a, [role="img"]') && el.getAttribute('role') !== 'img') continue; // de knop of link draagt de naam
    if (!naam(el) && el.getAttribute('aria-hidden') !== 'true') fouten.push(`afbeelding zonder naam: ${beschrijf(el)}`);
  }
  if (document.documentElement.lang !== 'nl') fouten.push('html zonder lang="nl"');
  if (document.querySelectorAll('h1').length !== 1) fouten.push(`aantal h1: ${document.querySelectorAll('h1').length}`);

  // Contrast van tekst tegen de samengestelde achtergrond (1.4.3): 4,5 en voor grote tekst 3.
  const kleur = (t) => { const m = t.match(/[\d.]+/g); return m ? m.map(Number).concat(m.length === 3 ? [1] : []) : [0, 0, 0, 0]; };
  const mix = (boven, onder) => { const a = boven[3]; return [0, 1, 2].map((i) => boven[i] * a + onder[i] * (1 - a)).concat([1]); };
  const lum = ([r, g, b]) => [r, g, b].map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((t, c, i) => t + c * [0.2126, 0.7152, 0.0722][i], 0);
  // De pagina zelf heeft een verloop van --bg-top naar --bg-bottom; beide uiteinden tellen als ondergrond.
  const hex = (t) => { const h = t.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat([1]); };
  const wortel = getComputedStyle(document.documentElement);
  const bodems = [hex(wortel.getPropertyValue('--bg-top')), hex(wortel.getPropertyValue('--bg-bottom'))];
  const achtergronden = (el) => {
    const lagen = [];
    for (let e = el; e; e = e.parentElement) {
      const c = kleur(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) lagen.push(c);
      if (c[3] >= 1) break;
    }
    const vast = lagen.length && lagen[lagen.length - 1][3] >= 1 ? [lagen.pop()] : bodems;
    return vast.map((b) => { let uit = b; for (let i = lagen.length - 1; i >= 0; i -= 1) uit = mix(lagen[i], uit); return uit; });
  };
  const gezien = new Set();
  const lopen = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = lopen.nextNode(); n; n = lopen.nextNode()) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !el || gezien.has(el) || !zichtbaar(el) || el.closest('[aria-hidden="true"], svg')) continue;
    const vak = el.getBoundingClientRect();
    if (vak.width <= 2 || vak.height <= 2) continue; // alleen voor schermlezers (klasse sr)
    gezien.add(el);
    const s = getComputedStyle(el);
    if (el.closest('button:disabled, [aria-disabled="true"], input:disabled')) continue; // 1.4.3 geldt niet voor uitgezette bediening
    const px = parseFloat(s.fontSize);
    const groot = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
    for (const bg of achtergronden(el)) {
      let tekst = kleur(s.color);
      if (tekst[3] < 1) tekst = mix(tekst, bg);
      const [l1, l2] = [lum(tekst), lum(bg)].sort((a, b) => b - a);
      const ratio = (l1 + 0.05) / (l2 + 0.05);
      if (ratio < (groot ? 3 : 4.5) - 0.01) { fouten.push(`contrast ${ratio.toFixed(2)}: ${beschrijf(el)} (${s.color} op rgb(${bg.slice(0, 3).map(Math.round).join(',')}))`); break; }
    }
  }
  return [...new Set(fouten)];
}

// Tab door de hele pagina: elk element dat focus krijgt, toont een focusstijl (2.4.7).
async function tabRonde(page) {
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const fouten = [];
  const gezien = new Set();
  for (let i = 0; i < 250; i += 1) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1) || (s.boxShadow && s.boxShadow !== 'none');
      const sleutel = `${el.tagName}|${el.id}|${el.getAttribute('aria-label') || ''}|${(el.textContent || '').trim().slice(0, 40)}|${Math.round(el.getBoundingClientRect().top + scrollY)}`;
      return { sleutel, ring, wat: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}"` };
    });
    if (!r) { if (gezien.size) break; continue; }
    if (gezien.has(r.sleutel)) break;
    gezien.add(r.sleutel);
    if (!r.ring) fouten.push(`geen focusstijl: ${r.wat}`);
  }
  return { fouten, aantal: gezien.size };
}

async function wachtOpScherm(page, route) {
  await page.goto('about:blank'); // een nieuwe pagina, zodat de kop van het vorige scherm niet meetelt
  await page.goto(`/#/${route}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Laden…')).toHaveCount(0);
}

for (const thema of ['light', 'dark']) {
  for (const beheer of [false, true]) {
    test(`NFR-11: namen, labels, Tab en focusstijl en contrast op elk scherm (${beheer ? 'organisator' : 'deelnemer'}, ${thema === 'light' ? 'licht' : 'donker'})`, async ({ page, context }) => {
      test.skip(test.info().project.name !== 'chromium-desktop' && !(test.info().project.name === 'webkit-mobiel' && thema === 'light'), 'twee browsers volstaan');
      test.setTimeout(240000);
      await page.emulateMedia({ colorScheme: thema });
      const { nep } = await startDemo(context, { stap: 'weekend', als: beheer ? 'Anne' : 'Bas', beheer });
      const alle = [];
      let getabd = 0;
      for (const route of beheer ? BEHEER : DEELNEMER) {
        await wachtOpScherm(page, route);
        for (const f of await page.evaluate(controleer)) alle.push(`${route}: ${f}`);
        if (test.info().project.name === 'chromium-desktop') {
          const ronde = await tabRonde(page);
          getabd += ronde.aantal;
          for (const f of ronde.fouten) alle.push(`${route}: ${f}`);
          if (!ronde.aantal) alle.push(`${route}: niets bereikbaar met Tab`);
        }
      }
      expect([...new Set(alle)]).toEqual([]);
      if (test.info().project.name === 'chromium-desktop') expect(getabd).toBeGreaterThan(150);
      nep.server.close();
    });
  }
}

test('NFR-11: inloggen met link en pincode alleen met het toetsenbord', async ({ page }) => {
  test.skip(test.info().project.name.endsWith('mobiel'), 'toetsenbord op desktop');
  const demo = maakVolledigeDemo({ stap: 'voorbereiding' });
  const nep = await startServer({ port: 0, seed: demo.seed });
  await page.context().addInitScript(() => localStorage.setItem('ww-rondleiding', '1'));
  await page.context().route('https://script.google.com/**', async (route) => {
    const verzoek = { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' };
    const r = await fetch(`${nep.url}/macros/s/x/exec`, verzoek).catch(() => fetch(`${nep.url}/macros/s/x/exec`, verzoek)).catch(() => null);
    if (!r) return route.abort().catch(() => {});
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await r.text() });
  });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Plak je persoonlijke link')).toBeFocused();
  await page.keyboard.type(`#b=${demo.scriptId}&t=${demo.tokens[2027].Daan}`);
  await page.keyboard.press('Tab');
  await page.keyboard.type(demo.pin);
  await expect(page.getByRole('button', { name: 'Inloggen' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByLabel('Plak je persoonlijke link')).toHaveCount(0);
  await expect(page.getByText('Laden…')).toHaveCount(0);
  await page.goto('about:blank');
  nep.server.close();
});

test('NFR-11: menu, claimen, uitklappen en een uitgave invoeren alleen met het toetsenbord', async ({ page, context }) => {
  test.skip(test.info().project.name.endsWith('mobiel'), 'toetsenbord op desktop');
  test.setTimeout(60000);
  const { nep, demo } = await startDemo(context, { stap: 'weekend', als: 'Sanne' });
  // Menu: naar Wie neemt wat mee met Tab en Enter.
  await wachtOpScherm(page, 'start');
  const menuLink = page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Meenemen', exact: false }).first();
  await menuLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/meenemen/);
  await expect(page.getByText('Laden…')).toHaveCount(0);
  // Claimen met de spatiebalk.
  const kaartspel = page.getByRole('button', { name: 'Ik neem Kaartspel mee' });
  await kaartspel.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-item]', { hasText: 'Kaartspel' }).locator('.chip')).toHaveText(['jij']);
  // Een uitgave: velden met Tab, verdeelwijze en opslaan met Enter.
  await wachtOpScherm(page, 'posten');
  await page.getByRole('button', { name: 'Uitgave toevoegen' }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Omschrijving').focus();
  await page.keyboard.type('Ijsjes');
  await page.getByLabel('Bedrag', { exact: true }).focus();
  await page.keyboard.type('18,00');
  await page.getByRole('group', { name: 'Verdeelwijze' }).getByRole('button', { name: 'Aandeel' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Aandeel Sanne hoger' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Opslaan' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('De post is toegevoegd.')).toBeVisible();
  nep.store.nieuwVerzoek();
  const post = nep.store.lees('Posten').find((p) => p.omschrijving === 'Ijsjes');
  expect(post.verdeling.wijze).toBe('aandeel');
  expect(post.verdeling.aandelen[demo.deelnemerIds[2027].Sanne]).toBe(2);
  nep.server.close();
});

test('NFR-11: de kalender en de drieknoppen in het formulier werken met het toetsenbord', async ({ page, context }) => {
  test.skip(test.info().project.name.endsWith('mobiel'), 'toetsenbord op desktop');
  const { nep } = await startDemo(context, { stap: 'invullen', als: 'Joris' });
  await wachtOpScherm(page, 'formulier');
  const weekend = page.getByRole('region', { name: 'April 2027' }).getByRole('button', { name: /^9 apr/ });
  await weekend.focus();
  await page.keyboard.press('Enter');
  await expect(weekend).toHaveAttribute('aria-label', /: ja/);
  await page.keyboard.press('Space');
  await expect(weekend).toHaveAttribute('aria-label', /: misschien/);
  const sauna = page.getByRole('group', { name: 'Sauna' }).getByRole('button', { name: /Ja/ });
  await sauna.focus();
  await page.keyboard.press('Enter');
  await expect(sauna).toHaveAttribute('aria-pressed', 'true');
  // Een schuif met de pijltjestoetsen.
  await page.locator('#bv').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#bv')).not.toHaveValue('0');
  nep.server.close();
});

test('NFR-11 OVZ-6: uitklappen per persoon met het toetsenbord, en de heatmap draagt meer dan kleur', async ({ page, context }) => {
  test.skip(test.info().project.name.endsWith('mobiel'), 'toetsenbord op desktop');
  const { nep } = await startDemo(context, { stap: 'overzicht', als: 'Anne', beheer: true });
  await wachtOpScherm(page, 'detail');
  const bas = page.getByRole('button', { name: /^Bas/ });
  await bas.focus();
  await page.keyboard.press('Enter');
  await expect(bas).toHaveAttribute('aria-expanded', 'true');
  await wachtOpScherm(page, 'overzicht');
  // 1.4.1: elke cel van de heatmap heeft een tekst met de aantallen, de kleur is extra.
  const cellen = page.locator('.heat');
  await expect(cellen.first()).toBeVisible();
  expect(await cellen.count()).toBeGreaterThan(40);
  const zonder = await cellen.evaluateAll((els) => els.filter((e) => !(e.getAttribute('aria-label') || '').match(/\d+ ja/) && !(e.closest('[aria-label]') || {}).getAttribute?.('aria-label')).length);
  expect(zonder).toBe(0);
  nep.server.close();
});
