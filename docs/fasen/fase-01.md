# Fase 1: Fundament doorgeefluik

Hoort bij `docs/03-fasen.md`. Model: Opus.

**Doel.** Het API-contract, de Store-interface met MemoryStore en SheetStore, rechten, validatie, sloten en de nepbackend.

- **Eisen:** TOE-6, TOE-7, NFR-1, NFR-6, NFR-7, NFR-14, NFR-15, NFR-16, NFR-19, NFR-20
- **Aannames:** AAN-32
- **Leest:** `docs/02-bouwspec.md` §3 (één logica, twee adapters, HTTP-contract, bundel, appsscript.json), §5, §6, §7.1.3, §7.1.4, §7.16, §10 (NFR-1, 6, 7, 14, 15, 16, 19, 20). Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/server/api.js`, `src/server/rechten.js`, `src/server/validatie.js`, `src/server/store.js`, `src/server/crypto.js`, `src/server/gas/random.js`, `src/server/gas/main.js`, `src/server/gas/sheetstore.js`, `appsscript.json`, `test/mock-backend/server.mjs`, `test/mock-backend/memorystore.mjs`, `test/unit/rechten.test.mjs`, `test/unit/api.test.mjs`, `test/unit/sheetstore.test.mjs`, `test/unit/bundel.test.mjs`
- **Klaar als:** `npm run check` groen. `npm run mock` start de nepbackend op localhost; `curl -X POST -H 'Content-Type: text/plain' -d '{"actie":"status"}'` geeft `ok: true` met `apiVersie`. Elke rij uit §6 heeft een rechtentest. `dist/gas/` bevat één Apps Script-bestand dat `doPost` exporteert. Twee parallelle schrijfacties op dezelfde rij geven één `gewijzigd`. Een onverwachte fout geeft JSON met code `fout`. De hashtestvector is gelijk in Node en in de GAS-code.
- **Hangt af van:** fase 0

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 1: fundament doorgeefluik (TOE-6, TOE-7, NFR-1, NFR-6, NFR-7, NFR-14, NFR-15, NFR-16, NFR-19, NFR-20)`.
3. Schrijf `docs/overdracht/fase-01.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
