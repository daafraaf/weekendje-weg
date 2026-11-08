# Fase 14: Boodschappenlijst

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** De boodschappenlijst op supermarktvolgorde met definitief, afvinken, tellingen uit eten en drinken en kopiëren als tekst.

- **Eisen:** MEE-5, MEE-6, MEE-7, MEE-8, MEE-9
- **Aannames:** AAN-19, AAN-27
- **Leest:** `docs/02-bouwspec.md` §7.8, §8 MEE-5 t/m 9. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/shared/boodschappen.js`, `src/web/screens/boodschappen.js`, `test/unit/boodschappen.test.mjs`, `test/e2e/boodschappen.spec.mjs`
- **Klaar als:** `npm run check` groen. De gekopieerde tekst van de demolijst is gelijk aan een vaste verwachte tekst. Na definitief geeft toevoegen `gesloten`; afvinken werkt en is na verversen in een tweede context zichtbaar.
- **Hangt af van:** fase 13

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 14: boodschappenlijst (MEE-5, MEE-6, MEE-7, MEE-8, MEE-9)`.
3. Schrijf `docs/overdracht/fase-14.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
