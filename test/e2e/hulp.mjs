// Hulp voor de e2e-tests: een ingelogde context en een nepbackend per test.
import { OPSLAG_SLEUTEL } from '../../src/web/sessie.js';
import { startServer } from '../mock-backend/server.mjs';
import { maakDemo } from '../mock-backend/demo.mjs';
import { hashToken } from '../../src/server/crypto.js';
import { nodeSha256 } from '../mock-backend/memorystore.mjs';

// Zet een geldige sessie in de opslag voordat de pagina laadt (de schil leest de sessie lokaal).
export async function logIn(context) {
  const sessie = { scriptId: 'demo-weekendje-weg-0001', sessie: 'lokaal', soort: 'deelnemer', verloopt: '2099-01-01T00:00:00.000Z', editieId: 'demo-editie-2027' };
  await context.addInitScript(([sleutel, waarde]) => { if (!localStorage.getItem(sleutel)) localStorage.setItem(sleutel, waarde); }, [OPSLAG_SLEUTEL, JSON.stringify(sessie)]);
}

// Stuurt de aanroepen van een context naar script.google.com door naar de nepbackend en logt in als Anna.
export async function koppelNep(context, nep) {
  await context.route('https://script.google.com/**', async (route) => {
    const antwoord = await fetch(`${nep.url}/macros/s/x/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: route.request().postData() || '' });
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await antwoord.text() });
  });
  await logIn(context);
}

// Start een nepbackend met de demodata en een geldige deelnemerssessie voor Anna (token 'lokaal').
export async function startNep(context) {
  const demo = maakDemo();
  const nep = await startServer({ port: 0, seed: demo.seed });
  nep.store.nieuwVerzoek();
  nep.store.voegToe('Sessies', { tokenHash: hashToken(nodeSha256, 'lokaal'), soort: 'deelnemer', subjectId: 'dln0000000000002', verloopt: '2099-01-01T00:00:00.000Z' });
  nep.store.flush();
  await koppelNep(context, nep);
  return nep;
}
