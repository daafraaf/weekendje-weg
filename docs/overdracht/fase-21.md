# Overdracht fase 21 en 22 (taginvoer en navigatie)

Af: taginvoer (TAG-1 t/m TAG-9) en navigatie (NAV-1 t/m NAV-8), volgens de spec "Weekendje weg app: taginvoer en navigatie" (claude.ai artifact AwbpKiNim7CsnvkjKq1F4Y). Eén sessie voor beide.
Tags: `src/shared/tags.js` met `tests`, `components/tagveld.js` (in `vinkjeslijst.js`), serverschema in `acties/antwoorden.js` (alleen lijsten), `detail.js` en `maaltijden.js` lezen met `tagsUitTekst`. Fixtures houden oude tekst, zodat de migratie bij lezen getest blijft.
Navigatie: `components/profielmenu.js` in een kopregel (app.js), `NIET_IN_MENU` in `shared/start.js`, sectie Afgelopen weekenden op Start (`maakAfgelopen`), `editieKeuze` zonder afgeronde edities, hints (`hints.js`, `components/hint.js`) bij Kalender, Budget, tagblokken, Meenemen, Boodschappen, Kookbeurten, Uitgaven.
Afwijkingen van het voorstel: profielknop toont een persoon-icoon, geen beginletter (de voornaam is aan de voorkant niet bekend); Uitloggen staat ook nog onderaan Start; suggesties alleen uit niet aangevinkte vinkjes (geen eigen eerdere tags); stappenbalk heeft nog geen hint.
Nieuwe aannames: AAN-74, AAN-75, AAN-76.
Daarna gebouwd: TAG-10 (opties van een eigen vraag als tags, `max` in `tagveld.js`) en NAV-9 (Beheren: `screens/beheren.js`, `BEHEER_SCHERMEN`).
Niet getest: echte telefoon en schermlezer.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, aannames, unittests, build, playwright`
