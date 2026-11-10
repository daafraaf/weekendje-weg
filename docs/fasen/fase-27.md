# Fase 27: Accommodatie, verrassing of samen kiezen

Hoort bij `docs/03-fasen.md` en `docs/plan-feedbackronde.md`. Opdracht: punt 7. Model: Opus.

**Doel.** De organisator kiest per editie Verrassing of Samen kiezen. Bij verrassing zien deelnemers geen details tot de onthulling; bij samen kiezen geeft ieder een top 3 (3, 2, 1 punt).

- **Eisen:** ACC-3, ACC-4, ACC-5 vervangen door ACC-8 (keuze verrassing of samen), ACC-9 (verrassing verbergt naam, plaats, link tot onthullen), ACC-10 (onthullen), ACC-11 (top 3, opnieuw opgeven vervangt), ACC-12 (ranglijst met punten en aantal mensen, deelnemers zonder namen), ACC-13 (boeken, verwijderen en wisselen); ACC-2 blijft
- **Aannames:** AAN-08 en AAN-65 aangepast; nieuw AAN-84 (Store voegt ontbrekende kolommen achteraan de kop toe) en een nieuwe AAN voor de omzetting van oude deelvormen
- **Besluit K1:** één rij per keuze in `Stemmen` met nieuwe kolom `rang` (1 t/m 3) en nieuwe kolom `Edities.onthuld` (bool); de Store voegt ontbrekende kolommen achteraan de kop toe (AAN-84).
- **Leest:** spec §5.1, §5.3, §7.6, §8 ACC; AAN-08, AAN-64, AAN-65; `docs/design/README.md` voor verwante borden; overdracht fase 26.
- **Raakt:** `src/server/store.js` (`TABS`, ontbrekende kolom), `src/server/acties/accommodatie.js`, `src/server/rechten.js`, `src/shared/accommodatie.js` (punten tellen als pure functie), `src/web/screens/accommodaties.js`, `accommodatie-beheer.js`, `src/shared/start.js`, `src/server/acties/start.js` en archief (geboekte accommodatie), demo-fixtures, tests.

## Werkwijze

1. **Schets eerst.** Ontwerp drie schermen in de stijl van de app (tokens uit `docs/design/tokens.css`, Liquid Glass, Zee en duin): organisator (keuze, opties beheren, ranglijst, boeken, onthullen), deelnemer bij samen kiezen (top 3 kiezen, stand), deelnemer bij verrassing (voor en na onthulling). Laat ze David zien als artifact of screenshot en **stop tot hij akkoord geeft**.
2. **Omzetting bij lezen**, de Sheet blijft ongewijzigd tot de volgende schrijfactie: `info` en `stemmen` worden `samen`; een oude stem wordt rang 1; `geboekt` wordt `samen` met de geboekte accommodatie.
3. **Regels.** Verwijderen neemt de voorkeuren mee; was het de geboekte, dan "nog geen accommodatie gekozen". Wisselen mag zolang er niets geboekt is; voorkeuren blijven bewaard. De top 3 gaat via de wachtrij van fase 26; boeken en onthullen wachten op de Sheet.

- **Klaar als:** `npm run check` groen. Unittest op punten tellen (3, 2, 1, minder dan drie opties, opnieuw opgeven). Een test bewijst dat een deelnemer bij verrassing geen naam, plaats of link ontvangt tot de onthulling. Verwijderen van de geboekte en wisselen gedragen zich als hierboven. Een bestaande Sheet zonder de nieuwe kolommen blijft werken.

## Afsluiten

`npm run check` groen; commit `fase 27: accommodatie verrassing of samen kiezen (ACC-8 t/m ACC-13)`; overdracht; sessielog.
