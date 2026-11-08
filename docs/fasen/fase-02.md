# Fase 2: Schil

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** De app-schil met router, stappenbalk, thema, PWA en offline-melding, nog zonder login.

- **Eisen:** STA-1, STA-2, RON-6, NFR-8, NFR-9, NFR-10, NFR-12
- **Leest:** `docs/02-bouwspec.md` §7.2.1, §8 STA-1, STA-2, RON-6, §9, §10 (NFR-8, 9, 10, 12), `docs/05-designbrief.md` §3 en §4. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/web/router.js`, `src/web/api.js`, `src/web/components/stappenbalk.js`, `src/web/css/tokens.css`, `src/web/css/app.css`, `src/web/manifest.webmanifest`, `src/web/sw.js`, `src/web/icons/`, `test/e2e/schil.spec.mjs`
- **Klaar als:** `npm run check` groen. De Playwright-test toont de stappenbalk op 360 en 1440 pixels, wisselt licht en donker via `colorScheme`, en ziet de offline-melding bij `context.setOffline(true)`. De manifest-test vindt naam, iconen en `standalone`.
- **Hangt af van:** fase 1

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 2: schil (STA-1, STA-2, RON-6, NFR-8, NFR-9, NFR-10, NFR-12)`.
3. Schrijf `docs/overdracht/fase-02.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
