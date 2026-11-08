# Fase 6: Kalender met vakanties en feestdagen

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** De blanco weekendkalender met ja, misschien en nee, voorkeursmaanden, schoolvakanties en feestdagen.

- **Eisen:** KAL-1, KAL-2, KAL-3, KAL-4, KAL-5, KAL-6, KAL-7
- **Aannames:** AAN-13, AAN-15, AAN-17
- **Leest:** `docs/02-bouwspec.md` §7.3, §8 KAL, §5.2 (beschikbaarheid). Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/shared/datums.js`, `src/shared/feestdagen.js`, `src/shared/vakanties.js`, `data/vakanties.json`, `scripts/vakanties.mjs`, `src/web/components/kalender.js`, `test/unit/feestdagen.test.mjs`, `test/unit/vakanties.test.mjs`, `test/e2e/kalender.spec.mjs`
- **Klaar als:** `npm run check` groen. De feestdagentest voor 2026 tot en met 2030 slaagt. In de browser toont de kalender april 2027 met voorkeursmarkering, de meivakantie per regio en Koningsdag; tikken en toetsenbord doorlopen de vier waarden.
- **Hangt af van:** fase 5

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 6: kalender met vakanties en feestdagen (KAL-1, KAL-2, KAL-3, KAL-4, KAL-5, KAL-6, KAL-7)`.
3. Schrijf `docs/overdracht/fase-06.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
