# Fase 11: Afrekenen en afhaken

Hoort bij `docs/03-fasen.md`. Model: Opus.

**Doel.** De afrekening met zo min mogelijk betalingen, betalingen afvinken in rondes, betaalverzoek en de afhaakregel.

- **Eisen:** GELD-8, GELD-9, GELD-10, GELD-11, EDI-9
- **Aannames:** AAN-22, AAN-35
- **Leest:** `docs/02-bouwspec.md` §7.13.6 t/m §7.13.9, §7.12.2, §7.12.3, §8 GELD-8 t/m 11, EDI-9. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/shared/afrekening.js`, `src/server/acties/afrekening.js`, `src/server/acties/afhaken.js`, `src/web/screens/afrekening.js`, `test/unit/afrekening.test.mjs`, `test/e2e/afrekening.spec.mjs`
- **Klaar als:** `npm run check` groen. Een eigenschapstest bewijst hooguit n − 1 betalingen en saldi nul na alle betalingen. In de browser markeert de demo één betaling, de afrekening herberekent; de afgehaakte deelnemer houdt zijn aandeel in de accommodatie en zit niet in een nieuwe post.
- **Hangt af van:** fase 10

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 11: afrekenen en afhaken (GELD-8, GELD-9, GELD-10, GELD-11, EDI-9)`.
3. Schrijf `docs/overdracht/fase-11.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
