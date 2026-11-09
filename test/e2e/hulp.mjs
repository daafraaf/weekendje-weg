// Hulp voor de e2e-tests: een ingelogde context en een nepbackend per test.
import { OPSLAG_SLEUTEL } from '../../src/web/sessie.js';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo, maakVolledigeDemo } from '../mock-backend/demo.mjs';
import { hashToken } from '../../src/server/crypto.js';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

// Zet een geldige sessie in de opslag voordat de pagina laadt (de schil leest de sessie lokaal).
export async function logIn(context, { rondleidingGezien = true, soort = 'deelnemer', token = 'lokaal', editieId = 'demo-editie-2027' } = {}) {
  const sessie = { scriptId: 'demo-weekendje-weg-0001', sessie: token, soort, verloopt: '2099-01-01T00:00:00.000Z', editieId };
  await context.addInitScript(([sleutel, waarde]) => { if (!localStorage.getItem(sleutel)) localStorage.setItem(sleutel, waarde); }, [OPSLAG_SLEUTEL, JSON.stringify(sessie)]);
  // De rondleiding (RON-1) verschijnt bij eerste gebruik; de meeste tests slaan hem over.
  if (rondleidingGezien) await context.addInitScript(() => localStorage.setItem('ww-rondleiding', '1'));
}

// Stuurt de aanroepen van een context naar script.google.com door naar de nepbackend en logt in als Anna.
export async function koppelNep(context, nep, opties) {
  await context.route('https://script.google.com/**', async (route) => {
    const verzoek = { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' };
    // Een hergebruikte verbinding kan door de nepserver gesloten zijn (ECONNRESET); één nieuwe poging volstaat.
    const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, verzoek).catch(() => fetch(`${nep.url}/macros/s/x/exec`, verzoek)).catch(() => null);
    if (!antwoord) { await route.abort().catch(() => {}); return; } // de nepserver is al gesloten aan het eind van de test
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
  });
  await logIn(context, opties);
}

// De volledige demo uit spec §11 (editie 2027 in `stap`) met een sessie voor `als`: een deelnemer van 2027,
// of met `beheer: true` een beheersessie van dat lid. `aanpassen(seed)` kan de demo vooraf wijzigen.
export async function startDemo(context, { stap = 'weekend', als = 'Bas', beheer = false, aanpassen } = {}) {
  const demo = maakVolledigeDemo({ stap });
  if (aanpassen) aanpassen(demo.seed, demo);
  const nep = await startServer({ port: 0, seed: demo.seed });
  const token = beheer ? 'beheer-lokaal' : 'lokaal';
  let subjectId = demo.deelnemerIds[2027][als];
  if (beheer) {
    const beheerToken = nep.beheerlink(demo.ledenIds[als], 'demo-wachtwoord-lang');
    nep.store.nieuwVerzoek();
    subjectId = nep.store.lees('Beheerlinks').find((b) => b.tokenHash === hashToken(nodeSha256, beheerToken)).id;
  }
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, token), soort: beheer ? 'beheer' : 'deelnemer', subjectId, verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  await koppelNep(context, nep, beheer ? { soort: 'beheer', token, editieId: '' } : { token });
  return { nep, demo };
}

// Start een nepbackend met de demodata en een geldige deelnemerssessie voor Anna (token 'lokaal').
// opties gaan naar maakDemo, bijvoorbeeld { antwoorden: true } voor de demoantwoorden.
export async function startNep(context, opties = {}) {
  const demo = maakDemo(opties);
  const nep = await startServer({ port: 0, seed: demo.seed });
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'lokaal'), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  await koppelNep(context, nep);
  return nep;
}
