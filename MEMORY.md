# MEMORY.md — Weekendje weg

Laatst bijgewerkt: 2026-11-10 (fase 26: synchronisatielaag met wachtrij)

## Status

Fase 23 (stappenbalk en menu) klaar; open staat de uitrol met David (fase 20) en de proef uit `docs/fasen/fase-22.md`. De repo bevat naast de opzet de docs uit de Werkplaats: spec v0.3, aannames
v0.2 (45), 21 fasen (0 tot en met 20), designbrief v0.3 en het ontwerp in `docs/design/`
(README, tokens.css, iconen en 37 artboards, stand 9 november 2026).

Vóór de run doet David eenmalig `npm ci` en `npx playwright install` (Node 22 of nieuwer),
zodra fase 0 `package.json` heeft neergezet.

## Open punten

- Feedbackronde: fase 26 af, volgende is fase 27; fase 23 t/m 28 (`docs/plan-feedbackronde.md`). Keuzes K1 t/m K4 bevestigd (alle a), zie plan.

## Sessielog

Nieuwste bovenaan. Houd hier de laatste drie fasen; oudere regels naar
`docs/sessielog-archief.md`.

- 2026-11-10 fase 26: synchronisatielaag: wachtrij met debounce, localStorage en terugdraaien, actie `bundel`, `antwoordZetten` per veld, formulier zonder Opslaan (K4), indicator in de kopregel (SYNC-1 t/m SYNC-8, AAN-82, AAN-83); check groen; zie `docs/overdracht/fase-26.md`.
- 2026-11-10 fase 25: één vastgelegd weekend (tweede vastlegging `gesloten`), `weekendLosmaken` met bevestiging, boeking blijft (K3) (ACC-6, ACC-7, AAN-81, AAN-63 aangepast); check groen; zie `docs/overdracht/fase-25.md`.
- 2026-11-10 fase 24: vijf onderdelen uit met vlaggen (AAN-80), invullen vraagt alleen beschikbaarheid, deadline informatief en geen stapData meer (OND-1, OND-2, OND-3, FRM-11, DDL-1); check groen; zie `docs/overdracht/fase-24.md`.
