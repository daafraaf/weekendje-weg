import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uitnodigingTekst, pincodeTekst, heeftLinkEnPincode } from '../../src/shared/whatsapp.js';
import { maakToken, maakPincode } from '../../src/server/crypto.js';
import { persoonlijkeLinkVan } from '../../src/web/sessie.js';
import { waLink } from '../../src/web/navigatie.js';
import { deel } from '../../src/web/delen.js';
import { nodeRandom } from '../mock-backend/memorystore.mjs';

const TITEL = 'Studievrienden · Weekendje weg 2027';

test('EDI-4: de uitnodiging heeft naam en link en geen pincode', () => {
  const link = persoonlijkeLinkVan('https://x.github.io/ww/', 'demo-weekendje-weg-0001', 'DemoLinksAnna000000002');
  const t = uitnodigingTekst({ voornaam: 'Anna', editieTitel: TITEL, link });
  assert.ok(t.includes('Anna') && t.includes(link) && t.includes(TITEL));
  assert.doesNotMatch(t.replace(link, ''), /[0-9]{6}/);
});

test('EDI-4: de pincodetekst heeft alleen de pincode en de naam van de editie, zonder link', () => {
  const t = pincodeTekst({ voornaam: 'Anna', editieTitel: TITEL, pin: '123456' });
  assert.ok(t.includes('123456') && t.includes(TITEL));
  assert.doesNotMatch(t, /https?:|#b=|\.github\.io/);
  assert.throws(() => pincodeTekst({ voornaam: 'Anna', editieTitel: TITEL, pin: '12345' }));
});

test('§7.12.3: geen WhatsApp-tekst bevat link en pincode samen, ook niet bij tokens met cijferreeksen', () => {
  for (let i = 0; i < 300; i++) {
    const token = i % 3 === 0 ? `${maakToken(nodeRandom).slice(0, 14)}12345678` : maakToken(nodeRandom);
    const pin = maakPincode(nodeRandom);
    const link = persoonlijkeLinkVan('https://x.github.io/ww/', 'demo-weekendje-weg-0001', token);
    const teksten = [uitnodigingTekst({ voornaam: 'Eva', editieTitel: TITEL, link }), pincodeTekst({ voornaam: 'Eva', editieTitel: TITEL, pin })];
    for (const t of teksten) assert.equal(heeftLinkEnPincode(t), false, t);
  }
  // De waakhond slaat wel aan als het mis zou gaan.
  assert.equal(heeftLinkEnPincode('Link https://x.nl/#b=abc&t=def en pincode 123456.'), true);
  assert.equal(heeftLinkEnPincode('Je pincode is 123456'), false);
});

test('§7.12.1: delen gaat via het deelmenu en anders via WhatsApp op het web, met de tekst URL-gecodeerd', async () => {
  const tekst = 'Hoi Eva & Bas: kom mee?';
  assert.equal(waLink(tekst), `https://wa.me/?text=${encodeURIComponent(tekst)}`);
  const gedeeld = [];
  assert.equal(await deel(tekst, { share: async (d) => { gedeeld.push(d.text); }, open: () => assert.fail('geen WhatsApp nodig') }), true);
  assert.deepEqual(gedeeld, [tekst]);
  const geopend = [];
  assert.equal(await deel(tekst, { share: null, open: (u) => geopend.push(u) }), true);
  assert.deepEqual(geopend, [waLink(tekst)]);
  assert.equal(await deel(tekst, { share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); }, open: () => assert.fail('annuleren opent niets') }), false);
});
