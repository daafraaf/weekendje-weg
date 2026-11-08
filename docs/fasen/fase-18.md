# Fase 18: Rondleiding en installatie

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** De rondleiding bij eerste gebruik met installatie-uitleg per apparaat.

- **Eisen:** RON-1, RON-2, RON-3, RON-4
- **Leest:** `docs/02-bouwspec.md` §7.1.8, §8 RON-1 t/m 4, `docs/05-designbrief.md` §5 (rondleiding). Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/web/screens/rondleiding.js`, `src/web/platform.js`, `test/unit/platform.test.mjs`, `test/e2e/rondleiding.spec.mjs`
- **Klaar als:** `npm run check` groen. De platformtest herkent de user agents van iOS Safari, iOS Chrome, Android Chrome, Windows Edge en macOS Firefox. De rondleiding verschijnt één keer per apparaat en is terug te vinden onder Uitleg.
- **Hangt af van:** fase 17

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 18: rondleiding en installatie (RON-1, RON-2, RON-3, RON-4)`.
3. Schrijf `docs/overdracht/fase-18.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
