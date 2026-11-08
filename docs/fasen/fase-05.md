# Fase 5: Editie aanmaken en uitnodigen

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** De organisator maakt een editie, kiest deelnemers en organisatoren en verstuurt links en pincodes.

- **Eisen:** EDI-1, EDI-4, EDI-5, EDI-6, TOE-8, TOE-12
- **Aannames:** AAN-03, AAN-31, AAN-36
- **Leest:** `docs/02-bouwspec.md` §5.1 (Edities, Deelnemers, Beheerlinks), §7.1.3, §7.1.5, §7.1.7, §7.1.10, §7.1.11, §7.2.4, §7.12, §8 EDI-1, EDI-4, EDI-5, EDI-6, TOE-8, TOE-12. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/server/acties/editie.js`, `src/shared/whatsapp.js`, `src/web/screens/editie-nieuw.js`, `src/web/screens/uitnodigen.js`, `src/web/delen.js`, `test/unit/editie.test.mjs`, `test/unit/whatsapp.test.mjs`, `test/e2e/editie.spec.mjs`
- **Klaar als:** `npm run check` groen. De e2e-test maakt een editie met zes deelnemers, ziet zes links met pincodes en kopieerknoppen, logt in met één ervan en vernieuwt een pincode en een link waarna de oude faalt. Geen WhatsApp-tekst bevat link en pincode samen.
- **Hangt af van:** fase 4

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 5: editie aanmaken en uitnodigen (EDI-1, EDI-4, EDI-5, EDI-6, TOE-8, TOE-12)`.
3. Schrijf `docs/overdracht/fase-05.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
