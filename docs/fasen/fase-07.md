# Fase 7: Invulformulier

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** Het formulier met kalender, budget, reistijd en verblijf: opslaan, ingevuld-status, deadline en versieconflict.

- **Eisen:** FRM-1, FRM-2, FRM-3, FRM-4, FRM-8, FRM-9, FRM-10
- **Aannames:** AAN-33
- **Leest:** `docs/02-bouwspec.md` §5.2 (Antwoorden.data), §7.4, §8 FRM. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/server/acties/antwoorden.js`, `src/web/screens/formulier.js`, `src/web/components/schuif.js`, `src/web/components/drieknop.js`, `test/unit/antwoorden.test.mjs`, `test/e2e/formulier.spec.mjs`
- **Klaar als:** `npm run check` groen. De e2e-test vult als deelnemer de vier vaste blokken in, slaat op, ziet "ingevuld", opent een tweede context met een oude versie en krijgt de conflictmelding. Na de deadline is alles alleen-lezen.
- **Hangt af van:** fase 6

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 7: invulformulier (FRM-1, FRM-2, FRM-3, FRM-4, FRM-8, FRM-9, FRM-10)`.
3. Schrijf `docs/overdracht/fase-07.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
