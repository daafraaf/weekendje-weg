# Overdracht fase 17

Af: startschermen per stap en archief (STA-3 t/m STA-6, ARC-1, ARC-2). `#/start` toont per stap de rij uit spec §7.14 voor deelnemer (`screens/start.js`) en organisator (`screens/start-organisator.js`, bovenaan altijd de knop "Eerstvolgende actie", `eersteActie` in `shared/start.js`). Gedeelde bouwstenen staan in `components/startblokken.js`.
Aftelteller (STA-5) bij een vastgelegd weekend; de klok is `lokaalNu` uit `programma.js`.
Server: schermen `start` en `archief` in `acties/start.js` (alleen tellingen en eigen gegevens, geen deelnemer-ID's). `#/archief` toont alle edities van de groep, nieuwste bovenaan.
Menu (STA-6): `components/menu.js` en `inMenu`/`MENU_VANAF` in `shared/start.js`. De schil haalt de stap op bij elke navigatie behalve naar start (start meldt hem zelf).
Nieuwe editie (ARC-2): knop op de start van een afgeronde editie gaat naar `#/editie-nieuw?van=<id>`; `editieAanmaken` kent nu `vanEditieId` (blokken, maanden en lijsten over, leden als voorinvulling). Na Afgerond blijft alles alleen-lezen via `rechten.js` (AAN-29).
Nieuwe aanname: AAN-71. AAN-12, AAN-29 en AAN-30 hebben hun codeplek.
Aangepast buiten de lijst: `toegang.test.mjs` gebruikte `scherm start` als "bestaat nog niet"-probe en kijkt nu naar `geldig`; `beheerScherm` geeft `voorkeursmaanden` mee; `afrekening.js` exporteert `stand`.
Niet gebouwd: de stappenbalk toont nog steeds de voorbeeldeditie (AAN-40) en niet de echte stap; "Uitgave toevoegen" is een link naar `#/posten`; geen desktopindeling van de startkaarten.
Niet in de browser getest: een weekend dat al bezig is (aftelteller verdwijnt) en meerdere edities met de editiekiezer op start; alleen unit.
De volgende fase moet weten: bij een nieuwe route die alleen vanaf een stap zichtbaar mag zijn, voeg hem toe aan `MENU_VANAF`.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
