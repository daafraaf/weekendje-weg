# MEMORY.md — Weekendje weg

Laatst bijgewerkt: 2026-11-11 (fase 29: foutafhandeling en versie)

## Status

Fase 23 (stappenbalk en menu) klaar; open staat de uitrol met David (fase 20) en de proef uit `docs/fasen/fase-22.md`. De repo bevat naast de opzet de docs uit de Werkplaats: spec v0.3, aannames
v0.2 (45), 21 fasen (0 tot en met 20), designbrief v0.3 en het ontwerp in `docs/design/`
(README, tokens.css, iconen en 37 artboards, stand 9 november 2026).

Vóór de run doet David eenmalig `npm ci` en `npx playwright install` (Node 22 of nieuwer),
zodra fase 0 `package.json` heeft neergezet.

## Open punten

- BV-32 (beslissing David): de rangorde volgens AAN-06 zet een weekend met 0 ja en 0 nee boven weekenden met 3 ja en 1 nee. Voorstel: niet-ingevuld als onzeker tellen, of sorteren op ja min nee en dan misschien. AAN-06 blijft tot dan ongewijzigd.
- Feedbackronde 2 (fase 29 t/m 33, `docs/fasen/`): in uitvoering.

- Feedbackronde gebouwd (fase 23 t/m 28, `docs/plan-feedbackronde.md`). Open: Davids test op toestel (telefoon en laptop), lijst in `docs/overdracht/fase-28.md`; daarna uitrol (fase 20) en proef (fase 22).

## Sessielog

Nieuwste bovenaan. Houd hier de laatste drie fasen; oudere regels naar
`docs/sessielog-archief.md`.

- 2026-11-11 fase 29: foutafhandeling en versie: API_VERSIE 2 met snapshot-test, foutteksten in gewone taal (`web/foutteksten.js`), geen Niet opgeslagen na herladen, onbekende route naar #/start, Opslaan… in de knop met bevestiging bij het veld, minstens twee antwoordopties (NFR-21, NFR-22, SYNC-5, SYNC-8, EDI-12, NAV-13; BV-04, 05, 12, 13, 14, 24, 35); check groen; zie `docs/overdracht/fase-29.md`.
- 2026-11-11 uitrol feedbackronde (fase 23 t/m 28): voorkant gepusht naar Pages; script bijgewerkt in de sjabloon (@2) en in twee kopieën (@2), waaronder de kopie van de live groep "Weekendje weg test" (implementatie eindigt op MMEbIJ); POST bundel geeft daar geen "onbekende keuze" meer.
- 2026-11-11 fase 28: uitleg van de stappen: route op Start (sluitbaar, vlag `ww-route-gezien`), Hoe werkt het?, info-icoon bij de stappenbalk, teksten per rol in `web/uitleg.js` (UIT-1 t/m UIT-4, NAV-7, AAN-85); check groen; eindlijst voor David in `docs/overdracht/fase-28.md`.
- 2026-11-10 fase 26: synchronisatielaag: wachtrij met debounce, localStorage en terugdraaien, actie `bundel`, `antwoordZetten` per veld, formulier zonder Opslaan (K4), indicator in de kopregel (SYNC-1 t/m SYNC-8, AAN-82, AAN-83); check groen; zie `docs/overdracht/fase-26.md`.
