# Overdracht fase 6

Af: kalender. Gedeeld: `shared/datums.js` (ISO-datumhulp, `vrijdagen`, `standaardPeriode`), `shared/feestdagen.js` (Meeus/Jones/Butcher, testtabel 2026 t/m 2030), `shared/vakanties.js` (`weekendKenmerken`, `maandNotities`, `schooljaarBekend`, `vanOpenData`), `shared/beschikbaarheid.js` (`volgendeWaarde`, `zetWaarde`, `maandVullen`, `tel`).
Voorkant: `components/kalender.js` met `maakKalender({ periodeVan, periodeTot, voorkeursmaanden, waarden, bijWijziging })`; bijWijziging krijgt het hele `beschikbaarheid`-object. Zichtbaar op `#/kalender` (voorbeeldperiode 2027, bewaart niets; AAN-50). `scripts/vakanties.mjs` is `npm run vakanties`.
Keuzes buiten de spec: per weekend staan de regioletters (N M Z) op de balk; Hele maand is een knop per maand die drie keuzes uitklapt; feestdagen buiten een weekend (Koningsdag op dinsdag) staan als regel onder de maand; desktop toont de maanden in een raster, de jaarstrook staat op elke breedte bovenaan.
Aannames: AAN-49 (schooljaar loopt 1 sep t/m 31 aug), AAN-50 (kalender als eigen route tot fase 7).
LET OP: `data/vakanties.json` is een voorlopig handbestand (alleen kerst 2026 en mei 2027, `schooljaren` leeg). Het script `npm run vakanties` is niet gedraaid: de URL `.../infotypes/schoolholidays/schoolyear/<jaar>?output=json` gaf vanaf hier 404, dus het antwoordformaat en de URL zijn ongetest. David draait het script en controleert de uitvoer; pas zo nodig `vanOpenData` aan.
Volgende fase: het formulier (fase 7) moet `maakKalender` in het blok Kalender zetten en `waarden` laden en opslaan; de route `kalender` en het menu-item kunnen dan weg.
Niet getest: echte open data, jaarstrook en raster op een echt apparaat.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
