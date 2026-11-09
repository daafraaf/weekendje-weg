# Overdracht fase 15

Af: kookbeurten en programma (KOK-1 t/m KOK-4, PRG-1 t/m PRG-3). Schermen `#/kookbeurten` en `#/programma` (iedereen; de organisator beheert), schermen `kookbeurten` en `programma` in de API.
Server: `acties/maaltijden.js` (`maakStandaardMaaltijden`, `maaltijdOpslaan`, `kokWorden`, `kokStoppen`, scherm), `acties/programma.js`. `weekendVastleggen` maakt de zes standaardmaaltijden als er nog geen zijn. Pure logica in `shared/maaltijden.js` (`maaltijdNaam`, `puntenVanDag`, `uitgelicht`, `dagVanDatum`).
Ingrediënt: `itemOpslaan` kreeg optioneel `maaltijdId` (alleen een kok van die maaltijd, soort `boodschap`). Het scherm `meenemen` geeft per item `maaltijd` (bijvoorbeeld "Zaterdag diner"); de boodschappenlijst toont dat als tag.
Eetwensen: alleen de koks van de maaltijd krijgen `wensen` ({aantallen, teksten}), zonder namen of ID's; "met namen" in de opdracht is gelezen als de namen (labels) van de wensen. Een test bewijst dat het antwoord geen deelnemer-ID bevat.
Nieuwe aannames: AAN-68 (maaltijden: geen verwijderen, afgehaakt kookt niet, wensen alleen voor koks), AAN-69 (grenzen programma, uitgelicht punt, klok van het apparaat). AAN-18, AAN-25, AAN-34 hebben hun codeplek.
Keuze buiten de spec: PRG-3 staat als blok `maakProgrammaVandaag` onder de placeholder van het startscherm (alleen in de stap Weekend, op een dag van het weekend); fase 17 of later kan het opnemen in het echte startscherm.
Niet gebouwd: maaltijd verwijderen, ingrediënt verwijderen vanaf kookbeurten (kan bij Wie neemt wat mee), kok-wijzigen door de organisator, desktopindeling, donkere modus, de organisatorweergave van allergieën met namen hier (staat bij Per persoon).
Niet in de browser getest: het beheren van programmapunten (toevoegen, wijzigen, verwijderen) en de organisatorknoppen op Kookbeurten; alleen unit (acties).
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
