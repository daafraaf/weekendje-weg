// Eindtest (fase 19): één editie van uitnodiging tot laatste betaling, met zes personen in zes browsercontexten.
// Anne is organisator: ze maakt de editie en de links, vult zelf in met haar deelnemerslink en logt daarna weer in
// met haar beheerlink. De datums volgen de klok: de editie is voor volgend jaar met een deadline over een maand.
import { test, expect } from '@playwright/test';
import { startServer } from '../mock-backend/server.mjs';
import { maakVolledigeDemo } from '../mock-backend/demo.mjs';
import { datumPlus } from '../../src/shared/editie.js';
import { saldi } from '../../src/shared/saldo.js';

test.use({ serviceWorkers: 'block' });

const NAMEN = ['Anne', 'Bas', 'Daan', 'Eva', 'Joris', 'Sanne'];
const WACHTWOORD = 'kraanvogel-op-de-hei';
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const hoofd = (page) => page.getByRole('heading', { level: 1 });

async function naar(page, route) {
  await page.goto('about:blank');
  await page.goto(`/#/${route}`);
  await expect(hoofd(page)).toBeVisible();
  await expect(page.getByText('Laden…')).toHaveCount(0);
}

// Eerste vrijdag van een maand, als JJJJ-MM-DD.
function eersteVrijdag(jaar, maand) {
  const d = new Date(Date.UTC(jaar, maand - 1, 1));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test('NFR-11 §11 eindtest: zes personen doorlopen een editie van uitnodiging tot laatste betaling', async ({ browser }) => {
  test.skip(test.info().project.name !== 'chromium-desktop', 'het scenario draait één keer; de schermen zelf zijn per browser getest');
  test.setTimeout(300000);

  // Een opgezette groep met zes leden en nog geen editie.
  const demo = maakVolledigeDemo();
  const nep = await startServer({ port: 0, seed: { Groep: demo.seed.Groep, Leden: demo.seed.Leden } });
  const beheerToken = nep.beheerlink(demo.ledenIds.Anne, WACHTWOORD);

  const pagina = {};
  for (const naam of NAMEN) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('ww-rondleiding', '1'));
    await context.addInitScript(() => { window.gedeeld = []; Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.gedeeld.push(d.text); } }); });
    await context.route('https://script.google.com/**', async (route) => {
      const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' }).catch(() => null);
      if (!antwoord) return route.abort().catch(() => {});
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
    });
    pagina[naam] = await context.newPage();
  }
  const anne = pagina.Anne;
  const alsBeheer = async () => {
    await anne.goto('about:blank');
    await anne.goto(`/#b=${demo.scriptId}&beheer=${beheerToken}`);
    await anne.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD);
    await anne.getByRole('button', { name: 'Inloggen' }).click();
    await expect(hoofd(anne)).toHaveText('Leden');
  };
  const stapNaar = async (stapNaam) => {
    await naar(anne, 'stappen');
    await anne.getByRole('button', { name: `Naar ${stapNaam}` }).click();
    await expect(anne.getByRole('navigation', { name: 'Stappen van de editie' }).locator('[aria-current="step"]')).toContainText(stapNaam);
  };

  // 1. Uitnodiging: Anne maakt de editie voor volgend jaar en de links (EDI-1, EDI-4).
  const jaar = new Date().getFullYear() + 1;
  const deadline = datumPlus(new Date().toISOString().slice(0, 10), 30);
  await alsBeheer();
  await naar(anne, 'editie-nieuw');
  await anne.getByLabel('Jaar').selectOption(String(jaar));
  await anne.getByLabel('Periode van').fill(`${jaar}-04-01`);
  await anne.getByLabel('Periode tot en met').fill(`${jaar}-10-31`);
  await anne.getByLabel('Deadline invullen').fill(deadline);
  for (const naam of NAMEN.slice(1)) await expect(anne.getByLabel(`${naam} doet mee`)).toBeChecked();
  await anne.getByRole('button', { name: 'Editie maken' }).click();
  await expect(hoofd(anne)).toHaveText('Uitnodigen');
  await anne.getByRole('button', { name: 'Links maken' }).click();
  await expect(anne.getByLabel(/^Link van /)).toHaveCount(6);
  const links = {};
  const pins = {};
  for (const naam of NAMEN) {
    links[naam] = await anne.getByLabel(`Link van ${naam}`).inputValue();
    pins[naam] = await anne.getByLabel(`Pincode van ${naam}`).inputValue();
    // §7.12.3: uitnodiging en pincode gaan als twee losse berichten.
    await anne.getByRole('button', { name: `Uitnodiging voor ${naam} delen` }).click();
    await anne.getByRole('button', { name: `Pincode voor ${naam} delen` }).click();
  }
  expect(await anne.evaluate(() => window.gedeeld.length)).toBe(12);

  // 2. Iedereen opent zijn link en logt in met de pincode (TOE-2); Anne gebruikt haar eigen deelnemerslink.
  for (const naam of NAMEN) {
    const p = pagina[naam];
    await p.goto('about:blank');
    await p.goto(`/${links[naam].slice(links[naam].indexOf('#'))}`);
    await p.getByLabel('Cijfer 1').click();
    await p.keyboard.type(pins[naam]);
    await p.getByRole('button', { name: 'Inloggen' }).click();
    await expect(p.getByLabel('Cijfer 1')).toHaveCount(0);
    await expect(hoofd(p)).toBeVisible();
  }

  // 3. Invullen: iedereen kan het eerste weekend van mei; vier van de zes ook het eerste van september (FRM-1 t/m FRM-8).
  const mei = eersteVrijdag(jaar, 5);
  const sep = eersteVrijdag(jaar, 9);
  const knop = (p, vrijdag) => {
    const [, m, d] = vrijdag.split('-').map(Number);
    const regio = MAANDEN[m - 1].charAt(0).toUpperCase() + MAANDEN[m - 1].slice(1);
    return p.getByRole('region', { name: `${regio} ${jaar}` }).getByRole('button', { name: new RegExp(`^${d} ${MAANDEN[m - 1].slice(0, 3)}`) });
  };
  for (const [i, naam] of NAMEN.entries()) {
    const p = pagina[naam];
    await naar(p, 'formulier');
    await knop(p, mei).click();
    await expect(knop(p, mei)).toHaveAttribute('aria-label', /: ja/);
    if (i < 4) await knop(p, sep).click();
    await p.locator('#bv').fill(String(1 + (i % 3)));
    await p.locator('#bw').fill(String(1 + (i % 4)));
    await p.locator('#rt').fill(String(1 + (i % 3)));
    await p.getByRole('button', { name: 'Opslaan' }).click();
    await expect(p.getByText('Opgeslagen', { exact: true })).toBeVisible();
    await expect(p.locator('.form-status')).toHaveText('Ingevuld');
  }

  // 4. Overzicht: Anne ziet zes van zes en geeft het overzicht vrij; de groep ziet de voorkeursdatum (OVZ-1, OVZ-4).
  await alsBeheer();
  await naar(anne, 'voortgang');
  await expect(anne.getByText(/^6 van 6, deadline /)).toBeVisible();
  await stapNaar('Overzicht');
  const [, , meiDag] = mei.split('-').map(Number);
  for (const naam of ['Bas', 'Joris']) {
    await naar(pagina[naam], 'overzicht');
    await expect(pagina[naam].locator('.ovz-voorkeur')).toContainText(`${meiDag} tot`);
    await expect(pagina[naam].getByText('Alle 6 hebben ingevuld.')).toBeVisible();
  }

  // 5. Accommodatie: weekend vastleggen, twee huizen, stemmen, één op geboekt (ACC-1 t/m ACC-5).
  await stapNaar('Accommodatie');
  await naar(anne, 'accommodatie-beheer');
  await anne.getByRole('list', { name: 'Top weekenden' }).getByRole('listitem').first().getByRole('button', { name: /^Leg .* vast$/ }).click();
  await expect(anne.getByText(/^Het weekend is vastgelegd:/)).toBeVisible();
  for (const [naamHuis, plaats, prijs] of [['Hoeve de Kraanvogel', 'Dwingeloo', '1380'], ['Strandhuis Duinzicht', 'Renesse', '960']]) {
    await anne.getByRole('button', { name: 'Accommodatie toevoegen' }).click();
    await anne.getByLabel('Naam', { exact: true }).fill(naamHuis);
    await anne.getByLabel('Plaats').fill(plaats);
    await anne.getByLabel('Totaalprijs in euro').fill(prijs);
    await anne.getByRole('button', { name: 'Opslaan' }).click();
    await expect(anne.getByText('De accommodatie is toegevoegd.')).toBeVisible();
  }
  await anne.getByRole('group', { name: 'Deelvorm' }).getByRole('button', { name: 'Stemmen' }).click();
  await expect(anne.getByText('De deelvorm is stemmen.')).toBeVisible();
  for (const [naam, huis] of [['Bas', 'Kraanvogel'], ['Daan', 'Kraanvogel'], ['Eva', 'Duinzicht'], ['Sanne', 'Kraanvogel']]) {
    const p = pagina[naam];
    await naar(p, 'accommodaties');
    const kaart = p.locator('article', { hasText: huis });
    await kaart.getByRole('button', { name: 'Kies als favoriet' }).click();
    await expect(kaart.getByRole('button', { name: 'Jouw favoriet' })).toBeVisible();
  }
  await naar(pagina.Joris, 'accommodaties');
  await expect(pagina.Joris.locator('article', { hasText: 'Kraanvogel' })).toContainText('3 stemmen');
  await naar(anne, 'accommodatie-beheer');
  await anne.getByRole('button', { name: 'Zet Hoeve de Kraanvogel op geboekt' }).click();
  await expect(anne.getByText('Hoeve de Kraanvogel staat op geboekt.')).toBeVisible();
  await naar(pagina.Eva, 'accommodaties');
  await expect(pagina.Eva.locator('article')).toHaveCount(1);
  await expect(pagina.Eva.locator('article')).toContainText('€ 230 p.p.');

  // 6. Voorbereiding: meenemen, een boodschap, koken, een rit, een kamer en de lijst definitief (MEE, KOK, CAR, KMR).
  await stapNaar('Voorbereiding');
  await naar(pagina.Bas, 'meenemen');
  await pagina.Bas.getByRole('button', { name: 'Ik neem Pindakaas mee' }).click();
  await expect(pagina.Bas.locator('[data-item]', { hasText: 'Pindakaas' }).locator('.chip')).toHaveText(['jij']);
  await naar(pagina.Daan, 'meenemen');
  await pagina.Daan.getByRole('button', { name: 'Ik neem Speaker mee' }).click();
  await expect(pagina.Daan.locator('[data-item]', { hasText: 'Pindakaas' })).toContainText('Bas');
  await naar(pagina.Joris, 'meenemen');
  await pagina.Joris.getByLabel('Nieuwe boodschap', { exact: true }).fill('Speciaalbier');
  await pagina.Joris.getByRole('button', { name: 'Nieuwe boodschap toevoegen' }).click();
  await expect(pagina.Joris.getByText('Speciaalbier staat op de lijst.')).toBeVisible();
  await naar(pagina.Sanne, 'kookbeurten');
  await pagina.Sanne.getByRole('button', { name: 'Ik kook zaterdag diner' }).click();
  await expect(pagina.Sanne.getByRole('button', { name: 'Stoppen met koken: zaterdag diner' })).toBeVisible();
  await naar(pagina.Bas, 'carpool');
  await pagina.Bas.getByLabel('Vrije plaatsen').fill('3');
  await pagina.Bas.getByRole('button', { name: 'Rit aanbieden', exact: true }).click();
  await expect(pagina.Bas.locator('[data-rit="Bas"]')).toContainText('Vertrekt uit Utrecht');
  await naar(pagina.Eva, 'carpool');
  await pagina.Eva.getByRole('button', { name: 'Rij mee met Bas' }).click();
  await expect(pagina.Eva.locator('[data-rit="Bas"] [data-meerijder="Eva"]')).toBeVisible();
  await naar(anne, 'kamers');
  await anne.getByLabel('Naam van de nieuwe kamer').fill('Hooizolder');
  await anne.getByRole('button', { name: 'Kamer toevoegen' }).click();
  await expect(anne.getByText('De kamer is toegevoegd.')).toBeVisible();
  await anne.getByRole('button', { name: 'Joris indelen' }).click();
  await expect(anne.locator('[data-kamer="Hooizolder"] [data-bewoner="Joris"]')).toBeVisible();
  await naar(anne, 'boodschappen');
  await anne.getByRole('button', { name: 'Lijst definitief maken' }).click();
  await expect(anne.getByRole('button', { name: 'Definitief terugdraaien' })).toBeVisible();
  await naar(pagina.Joris, 'kamers');
  await expect(pagina.Joris.locator('[data-kamer="Hooizolder"]')).toContainText('Joris');

  // 7. Weekend: programma en uitgaven (PRG-1, GELD-1 t/m GELD-4).
  await stapNaar('Weekend');
  await naar(anne, 'programma');
  await anne.getByRole('button', { name: 'Programmapunt toevoegen' }).click();
  await anne.getByLabel('Begin').fill('10:30');
  await anne.getByLabel('Titel').fill('Kanoën op de Reest');
  await anne.getByRole('button', { name: 'Toevoegen' }).click();
  await expect(anne.getByText('Het programmapunt is toegevoegd.')).toBeVisible();
  await naar(pagina.Daan, 'programma');
  await expect(pagina.Daan.getByText('Kanoën op de Reest')).toBeVisible();
  const uitgave = async (p, omschrijving, bedrag) => {
    await naar(p, 'posten');
    await p.getByRole('button', { name: 'Uitgave toevoegen' }).click();
    await p.getByLabel('Omschrijving').fill(omschrijving);
    await p.getByLabel('Bedrag', { exact: true }).fill(bedrag);
    await p.getByRole('button', { name: 'Opslaan' }).click();
    await expect(p.getByText('De post is toegevoegd.')).toBeVisible();
  };
  await uitgave(anne, 'Hoeve de Kraanvogel', '1380,00');
  await uitgave(pagina.Bas, 'Boodschappen vrijdag', '186,40');
  await uitgave(pagina.Daan, 'Kanoverhuur', '90,00');
  await naar(pagina.Sanne, 'posten');
  await expect(pagina.Sanne.getByRole('button', { name: /Kanoverhuur/ })).toContainText('€ 90,00');

  // 8. Afrekenen: iedereen die moet betalen markeert zijn betalingen tot er niets meer open staat (GELD-8, GELD-9).
  await stapNaar('Afrekenen');
  for (const naam of NAMEN) {
    const p = pagina[naam];
    await naar(p, 'afrekening');
    for (let i = 0; i < 5; i += 1) {
      const kaart = p.getByRole('region', { name: /^Jij betaalt / }).first();
      if (!(await kaart.count())) break;
      await kaart.getByRole('button', { name: 'Markeer als betaald' }).click();
      await expect(p.getByText('De betaling staat op betaald.')).toBeVisible();
      await naar(p, 'afrekening');
    }
  }
  await naar(anne, 'afrekening');
  await expect(anne.getByText(/^Alle betalingen · (\d+) van \1 betaald$/)).toBeVisible();
  nep.store.nieuwVerzoek();
  const editie = nep.store.lees('Edities')[0];
  const ids = nep.store.lees('Deelnemers').filter((d) => d.editieId === editie.id).map((d) => d.id);
  const posten = nep.store.lees('Posten').filter((p) => p.editieId === editie.id);
  const betalingen = nep.store.lees('Betalingen').filter((b) => b.editieId === editie.id);
  expect(posten).toHaveLength(3);
  expect(betalingen.length).toBeGreaterThanOrEqual(3);
  // Na de laatste betaling is elk saldo nul (§7.13.6).
  const namen = new Map(nep.store.lees('Leden').map((l) => [l.id, l.voornaam]));
  const naamVan = (id) => namen.get((nep.store.vind('Deelnemers', id) || {}).lidId) || '';
  expect(Object.values(saldi(posten, betalingen, { deelnemers: ids, naamVan }))).toEqual(ids.map(() => 0));

  // 9. Afgerond: het archief toont de editie met de geboekte accommodatie (ARC-1).
  await stapNaar('Afgerond');
  await naar(pagina.Sanne, 'archief');
  await expect(pagina.Sanne.getByText('Hoeve de Kraanvogel').first()).toBeVisible();
  for (const naam of NAMEN) await pagina[naam].context().close();
  nep.server.close();
});
