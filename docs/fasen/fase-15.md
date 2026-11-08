# Fase 15: Kookbeurten en programma

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** Maaltijden met koks en ingrediënten, en het weekendprogramma per dag.

- **Eisen:** KOK-1, KOK-2, KOK-3, KOK-4, PRG-1, PRG-2, PRG-3
- **Aannames:** AAN-18, AAN-25, AAN-34
- **Leest:** `docs/02-bouwspec.md` §5.1 (Maaltijden, Koks, Programma), §7.10, §7.11.1, §8 KOK, PRG. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/server/acties/maaltijden.js`, `src/server/acties/programma.js`, `src/web/screens/kookbeurten.js`, `src/web/screens/programma.js`, `test/unit/maaltijden.test.mjs`, `test/e2e/kookbeurten.spec.mjs`
- **Klaar als:** `npm run check` groen. Na vastleggen staan zes maaltijden klaar; een kok voegt een ingrediënt toe dat met maaltijdnaam op de boodschappenlijst staat en ziet de eetwensen met namen; een andere deelnemer ziet die namen niet. Het programma toont zaterdag op tijd.
- **Hangt af van:** fase 14

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 15: kookbeurten en programma (KOK-1, KOK-2, KOK-3, KOK-4, PRG-1, PRG-2, PRG-3)`.
3. Schrijf `docs/overdracht/fase-15.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
