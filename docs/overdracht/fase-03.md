# Overdracht fase 3

Af: `src/server/acties/toegang.js` (`inloggenDeelnemer`, `uitloggen`, `resetPogingen`), `acties/index.js` (`ALLE_HANDLERS`, door Apps Script en nepbackend gebruikt),
`src/web/sessie.js` (link lezen, scriptId-patroon, sessie in `localStorage`), `src/web/screens/pincode.js` (pinscherm), `app.js` kiest tussen pinscherm en schil.
Demodata: `test/fixtures/demo.json` plus `test/mock-backend/demo.mjs` (hasht tokens en pincodes, voegt een minimale editie toe zodat sessies door de API worden herkend).

Keuzes buiten de spec:
- Fouten kunnen `data` meedragen (`ApiFout(code, melding, data)`): `{ tot }` bij een blokkade, `{ nieuwePincodeNodig }` bij TOE-4, `{ resterend }` bij een foute pincode.
- De handler bewaart de pogingenteller met `store.flush()` voordat hij de fout gooit, want `api.js` flusht alleen na een geslaagde actie.
- Zonder sessie of met een link in het fragment staat er alleen het pinscherm (geen menu, geen stappenbalk); na het inloggen wordt het fragment uit de adresbalk gehaald.
- `web/api.js` stuurt `sessie` en `editieId` alleen mee als ze gevuld zijn (leeg `editieId` faalde de validatie).
- De e2e-tests sturen `https://script.google.com/**` met `context.route` door naar een nepbackend per test (CSP blijft ongewijzigd, NFR-2 gedekt); `serviceWorkers: 'block'` is nodig voor WebKit. De schil-tests starten met `logIn()` uit `test/e2e/hulp.mjs`.
- `npm run mock` toont de demolinks, maar een gewone browser bereikt de nepbackend niet (CSP laat alleen script.google.com toe); handmatig proberen kan alleen via een Playwright-route.

Nieuwe aannames: AAN-41 (beheerlink wordt herkend, beheerlogin volgt met TOE-5), AAN-42 (uitloggen wist altijd lokaal). AAN-01 en AAN-02 staan nu in de code.
Volgende fase: `inloggenBeheer` en `wachtwoordInstellen` ontbreken (TOE-5); `scherm` heeft nog geen handler (de startpagina is leeg); `pincodeVernieuwen` en `linkVernieuwen` moeten `resetPogingen` aanroepen; de verloopmelding (`verlopen`) van de API is nog niet naar het pinscherm vertaald.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
