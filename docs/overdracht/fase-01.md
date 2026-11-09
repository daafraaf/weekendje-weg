# Overdracht fase 1

Af: `src/server/` (api, rechten, validatie, store, crypto, fouten) en `src/shared/stappen.js`; GAS-adapter
(`main.js`, `sheetstore.js`, `random.js`, `ingangen.js`), `appsscript.json`, bundel `dist/gas/Code.js`, nepbackend
op poort 8787 (`npm run mock`, ook als tweede Playwright-webServer). Alleen `status` heeft een handler.

Keuzes buiten de spec:
- Volgorde per verzoek: envelop, slot (schrijven), sessie, editie, data valideren, `context`, `reden()`, uitvoeren, Log, flush.
- `apiVersie` mag alleen bij `status` ontbreken (curl uit het fasebestand); een bekende actie zonder handler geeft `ongeldig`.
- Verlopen sessie geeft `verlopen`, onbekende `geen_toegang`. Log-`detail` is voorlopig leeg.
- MemoryStore bewaart tekstcellen via dezelfde `maakStore` als SheetStore. `ITERATIES` = 1000 (meten in fase 20).
- Menu: alleen "Log legen" werkt; setupcode, beheerlink en wachtwoord resetten tonen een melding tot fase 4.

Nieuwe aannames: AAN-38 (rechten die §6 niet letterlijk noemt), AAN-39 (eigen rij en deadline voor de organisator).
Volgende fase: de nepbackend draait nog zonder demodata; `fetch` naar localhost moet in fase 2/3 een oplossing krijgen (NFR-2).
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
