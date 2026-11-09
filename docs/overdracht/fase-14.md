# Overdracht fase 14

Af: boodschappenlijst (MEE-5 t/m MEE-9). Scherm `#/boodschappen` (iedereen, menu "Boodschappen"): `boodschap`-items en `keuken` zonder claim op categorievolgorde, afvinken met doorgestreept onderaan de categorie, teller "x van y afgevinkt", "Kopieer als tekst", chip "Definitief", tellingen uit eten en drinken als label bij het item. De organisator ziet "Lijst definitief maken" of "Definitief terugdraaien".
Pure logica in `shared/boodschappen.js` (`boodschappenLijst`, `kopieerTekst`, `tellingenBij`, `voortgang`). Server in `acties/items.js`: `afvinken` (zonder versie, laatste schrijft, spullen weigert `ongeldig`) en `boodschappenDefinitief` (zet de vlag; de weigeringen van fase 13 gelden nu echt). Het scherm `meenemen` geeft per item `afgevinkt` en `wensen` (aantallen per eten-en-drinkenwens, zonder namen).
Nieuwe aanname: AAN-67 (koppeling wens aan item op woorden, kopieertekst als "- naam" per categoriekop zonder afgevinkte items en lege categorieën, tellingen niet in de kopie). AAN-27 heeft zijn codeplek.
Keuze buiten de spec: het boodschappenscherm leest het scherm `meenemen`; toevoegen blijft bij Wie neemt wat mee (link onderaan). Een claim op een keuken-item haalt het van de lijst.
Voor fase 15: kok-ingrediënten zijn `boodschap`-items met `maaltijdId`; het ontwerp toont de maaltijd als `tag` bij het item (nog niet gebouwd, `rij()` in `screens/boodschappen.js`).
Niet gebouwd: maaltijdlabel, definitief-knop getest in de browser (alleen unit), echte klembord (e2e vangt `writeText` op), desktopindeling, donkere modus.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
