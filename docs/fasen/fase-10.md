# Fase 10: Posten en verdeling

Hoort bij `docs/03-fasen.md`. Model: Opus.

**Doel.** Uitgaven en ontvangsten invoeren met de drie verdeelwijzen, afronden en restcenten, eigen posten en saldi.

- **Eisen:** GELD-1, GELD-2, GELD-3, GELD-4, GELD-5, GELD-6, GELD-7
- **Aannames:** AAN-09, AAN-10, AAN-16
- **Leest:** `docs/02-bouwspec.md` §5.1 (Posten), §5.2 (verdeling), §7.9, §7.13.1 t/m §7.13.6, §7.13.10, §8 GELD-1 t/m 7. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/shared/geld.js`, `src/shared/verdeling.js`, `src/shared/saldo.js`, `src/server/acties/posten.js`, `src/web/screens/posten.js`, `src/web/screens/post-bewerken.js`, `src/web/components/verdeelinvoer.js`, `test/unit/verdeling.test.mjs`, `test/unit/saldo.test.mjs`, `test/e2e/posten.spec.mjs`
- **Klaar als:** `npm run check` groen. De voorbeelden uit §7.13.2 en §7.13.3 zijn tests; een eigenschapstest met 1000 willekeurige posten houdt de som van de saldi op nul. In de browser voert een deelnemer een uitgave met aandelen in en kan een post van een ander niet wijzigen.
- **Hangt af van:** fase 9

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 10: posten en verdeling (GELD-1, GELD-2, GELD-3, GELD-4, GELD-5, GELD-6, GELD-7)`.
3. Schrijf `docs/overdracht/fase-10.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
