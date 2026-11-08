# Fase 3: Inloggen met link en pincode

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** Een deelnemer komt met link en pincode binnen, blijft ingelogd en wordt geblokkeerd bij raden.

- **Eisen:** TOE-1, TOE-2, TOE-3, TOE-4, TOE-9, TOE-10, TOE-11, NFR-2, NFR-5
- **Aannames:** AAN-01, AAN-02
- **Leest:** `docs/02-bouwspec.md` §7.1, §8 TOE, §10 (NFR-2, NFR-5). Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/server/acties/toegang.js`, `src/web/screens/pincode.js`, `src/web/sessie.js`, `test/unit/toegang.test.mjs`, `test/e2e/inloggen.spec.mjs`, `test/fixtures/demo.json` (alleen groep, leden, deelnemers)
- **Klaar als:** `npm run check` groen. In de browser: demolink zonder pincode toont alleen het pinscherm; `123456` opent een lege startpagina; vijf foute pogingen tonen de blokkadetijd. Een nieuwe context zonder fragment accepteert de geplakte demolink. De XSS-test faalt niet op het pinscherm.
- **Hangt af van:** fase 2

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 3: inloggen met link en pincode (TOE-1, TOE-2, TOE-3, TOE-4, TOE-9, TOE-10, TOE-11, NFR-2, NFR-5)`.
3. Schrijf `docs/overdracht/fase-03.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
