# Fase 16: Kamers en carpool

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** Kamerindeling met eigen-kamerwens en ritten met vrije plaatsen.

- **Eisen:** KMR-1, CAR-1, CAR-2
- **Aannames:** AAN-23, AAN-24
- **Leest:** `docs/02-bouwspec.md` §5.1 (Kamers, Kamerindeling, Ritten, Meerijders), §7.11.2 t/m §7.11.4, §8 KMR, CAR. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/server/acties/kamers.js`, `src/server/acties/ritten.js`, `src/web/screens/kamers.js`, `src/web/screens/carpool.js`, `test/unit/kamers.test.mjs`, `test/e2e/kamers-carpool.spec.mjs`
- **Klaar als:** `npm run check` groen. Een volle kamer of rit weigert een extra persoon; wie geen rit heeft staat in een aparte lijst; een afgehaakte deelnemer verdwijnt uit beide.
- **Hangt af van:** fase 15

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 16: kamers en carpool (KMR-1, CAR-1, CAR-2)`.
3. Schrijf `docs/overdracht/fase-16.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
