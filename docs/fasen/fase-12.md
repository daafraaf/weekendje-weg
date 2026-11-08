# Fase 12: Datum vastleggen en accommodaties

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** De organisator legt het weekend vast en deelt accommodaties als informatie, stemronde of geboekt.

- **Eisen:** ACC-1, ACC-2, ACC-3, ACC-4, ACC-5
- **Aannames:** AAN-08
- **Leest:** `docs/02-bouwspec.md` §5.1 (Accommodaties, Stemmen), §7.6, §8 ACC. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/server/acties/accommodatie.js`, `src/web/screens/accommodaties.js`, `src/web/screens/accommodatie-beheer.js`, `test/unit/accommodatie.test.mjs`, `test/e2e/accommodatie.spec.mjs`
- **Klaar als:** `npm run check` groen. In de browser legt de organisator de voorkeursdatum vast, zet drie accommodaties op stemmen, twee deelnemers stemmen, daarna zet hij er één op geboekt met prijs per persoon.
- **Hangt af van:** fase 11

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 12: datum vastleggen en accommodaties (ACC-1, ACC-2, ACC-3, ACC-4, ACC-5)`.
3. Schrijf `docs/overdracht/fase-12.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
