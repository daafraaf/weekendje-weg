# Fase 9: Voortgang, overzicht en stappen

Hoort bij `docs/03-fasen.md`. Model: Opus.

**Doel.** Voortgang, herinnering, stap zetten met verwachte data, en het overlapoverzicht zonder namen naast het detailoverzicht.

- **Eisen:** OVZ-1, OVZ-2, OVZ-3, OVZ-4, OVZ-5, OVZ-6, OVZ-7, EDI-7, EDI-8, EDI-10
- **Aannames:** AAN-04, AAN-05, AAN-06, AAN-07
- **Leest:** `docs/02-bouwspec.md` §7.2, §7.5, §7.12, §8 OVZ, EDI-7, EDI-8, EDI-10. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/shared/rangorde.js`, `src/server/acties/overzicht.js`, `src/server/acties/stappen.js`, `src/web/screens/voortgang.js`, `src/web/screens/overzicht.js`, `src/web/screens/detail.js`, `src/web/screens/stappen-beheer.js`, `test/unit/rangorde.test.mjs`, `test/unit/overzicht.test.mjs`, `test/e2e/overzicht.spec.mjs`
- **Klaar als:** `npm run check` groen. De privacytest bewijst dat het antwoord van `overzicht` voor een deelnemer geen deelnemer-ID's of vrije tekst bevat. In de browser: de organisator zet de stap naar Overzicht, de stappenbalk schuift door, de WhatsApp-tekst verschijnt en de deelnemer ziet de heatmap met de demo-voorkeursdatum bovenaan.
- **Hangt af van:** fase 8

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 9: voortgang, overzicht en stappen (OVZ-1, OVZ-2, OVZ-3, OVZ-4, OVZ-5, OVZ-6, OVZ-7, EDI-7, EDI-8, EDI-10)`.
3. Schrijf `docs/overdracht/fase-09.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
