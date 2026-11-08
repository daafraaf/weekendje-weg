# Fase 4: Groep opzetten en beheer

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** De eigenaar zet een groep op met setupcode en krijgt een beheerlink; de organisator logt in met wachtwoord.

- **Eisen:** GRP-1, GRP-2, GRP-3, GRP-4, GRP-5, TOE-5, RON-5
- **Aannames:** AAN-14, AAN-20, AAN-28
- **Leest:** `docs/02-bouwspec.md` §3 (Implementaties), §7.1.9, §7.1.10, §7.17, §8 GRP, TOE-5, RON-5. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/server/acties/opzet.js`, `src/server/gas/menu.js`, `src/web/screens/opzetten.js`, `src/web/screens/beheerlogin.js`, `src/web/screens/leden.js`, `test/unit/opzet.test.mjs`, `test/e2e/opzetten.spec.mjs`
- **Klaar als:** `npm run check` groen. Tegen de nepbackend doorloopt de e2e-test de wizard met een setupcode uit de console, kiest een wachtwoord, en komt op het beheerscherm. Een tweede opzet wordt geweigerd. Een afwijkende `apiVersie` toont de melding uit §7.17.
- **Hangt af van:** fase 3

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 4: groep opzetten en beheer (GRP-1, GRP-2, GRP-3, GRP-4, GRP-5, TOE-5, RON-5)`.
3. Schrijf `docs/overdracht/fase-04.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
