// Hulp voor de e2e-tests: een ingelogde context en een nepbackend per test.
import { OPSLAG_SLEUTEL } from '../../src/web/sessie.js';

// Zet een geldige sessie in de opslag voordat de pagina laadt (de schil leest de sessie lokaal).
export async function logIn(context) {
  const sessie = { scriptId: 'demo-weekendje-weg-0001', sessie: 'lokaal', soort: 'deelnemer', verloopt: '2099-01-01T00:00:00.000Z', editieId: 'demo-editie-2027' };
  await context.addInitScript(([sleutel, waarde]) => { if (!localStorage.getItem(sleutel)) localStorage.setItem(sleutel, waarde); }, [OPSLAG_SLEUTEL, JSON.stringify(sessie)]);
}
