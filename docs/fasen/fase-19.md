# Fase 19: Eindtest

Hoort bij `docs/03-fasen.md`. Model: Opus.

**Doel.** Een volledig scenario van zes personen over alle stappen, toegankelijkheid en een beveiligingsronde.

- **Eisen:** NFR-11
- **Leest:** `docs/02-bouwspec.md` §6, §7.14, §10, §11, §14, `docs/overdracht/` (alle bestanden). Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `test/e2e/scenario.spec.mjs`, `test/e2e/toegankelijkheid.spec.mjs`, `test/e2e/beveiliging.spec.mjs`, `test/fixtures/demo.json` (volledig volgens §11), kleine fixes
- **Klaar als:** `npm run check` groen. Het scenario doorloopt een editie van uitnodiging tot laatste betaling met zes browsercontexten. Alle bediening werkt met het toetsenbord; elke actie uit §6 is zonder sessie en met de verkeerde rol geweigerd. Elke AAN-xx heeft een test met het ID in de naam (een check telt ze).
- **Hangt af van:** fase 18

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 19: eindtest (NFR-11)`.
3. Schrijf `docs/overdracht/fase-19.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
