# Fase 13: Wie neemt wat mee

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** Spullen, uit eigen keuken en boodschappen als items met claims van meerdere personen.

- **Eisen:** MEE-1, MEE-2, MEE-3, MEE-4
- **Aannames:** AAN-11, AAN-26
- **Leest:** `docs/02-bouwspec.md` §5.1 (Items, Claims), §7.7, §7.8.3, §7.16.3, §8 MEE-1 t/m 4. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/shared/categorieen.js`, `src/server/acties/items.js`, `src/web/screens/meenemen.js`, `test/unit/items.test.mjs`, `test/e2e/meenemen.spec.mjs`
- **Klaar als:** `npm run check` groen. Twee gelijktijdige claims op pindakaas geven "Pindakaas: Anne, Bas". De startlijst uit §7.7.2 staat er bij een nieuwe editie. Een afgehaakte deelnemer verliest zijn claims.
- **Hangt af van:** fase 12

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 13: wie neemt wat mee (MEE-1, MEE-2, MEE-3, MEE-4)`.
3. Schrijf `docs/overdracht/fase-13.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
