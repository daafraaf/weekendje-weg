# Overdracht fase 28 (uitleg van de stappen) en eindlijst feedbackronde

Af: UIT-1 t/m UIT-4 nieuw, NAV-7 aangepast (spec 0.10), AAN-85 nieuw (aannames 0.27). Teksten in `src/web/uitleg.js`, route in `components/route.js`, "Hoe werkt het?" in `screens/start.js`, info-icoon (twee knoppen, CSS toont er één) in `components/stappenbalk.js`. De balk kiest de rolltekst via `soortNu() === 'beheer'`; op Start volgt de route `g.organisator`. e2e: `logIn`/`startDemo` zetten `ww-route-gezien` standaard; `routeGezien: false` toont de route. Tests: `uitleg.spec.mjs`, `uitleg.test.mjs`. Laatste regel `npm run check`: `CHECK GROEN: bronregels, aannames, unittests, build, playwright`.

## Eindlijst voor David: wat is gewijzigd per fase
- Fase 23 (STA-8, NAV-10, NAV-11): stap van de editie heeft één bron voor balk, menu en Start; menu altijd zeven items in stapvolgorde met stip bij de huidige; Afrekening heeft tabs Wie betaalt wat en Eindafrekening; Weekendje prikker en Accommodatie zijn voor deelnemers "Komt in stap ..." vóór hun stap. AAN-40 vervallen, AAN-12 en AAN-71 herschreven.
- Fase 24 (OND-1 t/m OND-3, FRM-11, DDL-1): boodschappen, kookbeurten, programma, kamerindeling en carpool staan uit (`ONDERDELEN`, AAN-80); invullen vraagt alleen een weekend, Budget, Reistijd en Verblijf zijn optioneel; deadline informatief, geen datums per stap. AAN-04, AAN-33, AAN-39, AAN-57 aangepast.
- Fase 25 (ACC-6, ACC-7): één vastgelegd weekend; wijzigen via Ander weekend kiezen met bevestiging; boeking blijft. AAN-81 nieuw, AAN-63 aangepast.
- Fase 26 (SYNC-1 t/m SYNC-8): kleine handelingen (claimen, afvinken, formuliervelden, top 3) staan direct in beeld en gaan via een wachtrij; formulier zonder Opslaan; indicator Opgeslagen. AAN-82, AAN-83 nieuw.
- Fase 27 (ACC-8 t/m ACC-14): accommodatie Verrassing of Samen kiezen (top 3, 3-2-1), boeken, onthullen nooit vanzelf, bedden en eigen kamers. AAN-84, AAN-86, AAN-87 nieuw; AAN-08, AAN-64, AAN-65 aangepast.
- Fase 28 (UIT-1 t/m UIT-4, NAV-7): route "Zo gaat het weekend" bij eerste bezoek, "Hoe werkt het?" op Start, info-icoon (i) bij de stappenbalk. AAN-85 nieuw.

## Nieuwe en aangepaste aannames (feedbackronde)
Nieuw: AAN-80, 81, 82, 83, 84, 85, 86, 87. Aangepast: AAN-04, 08, 12, 33, 39, 57, 63, 64, 65, 71. Vervallen: AAN-40. Zie `docs/04-aannames.md`.

## Testlijst op telefoon en laptop (nieuwe link of gewist localStorage)
1. Eerste bezoek: route op Start, Sluiten, verversen: weg; Hoe werkt het? haalt hem terug. Als organisator en als deelnemer: tekst klopt bij de rol?
2. Info-icoon (i) bij de stappenbalk: opent de uitleg van de huidige stap, op telefoon naast het uitklappijltje, op laptop rechts naast de zeven stappen.
3. Invullen: tik door het formulier, wacht op Opgeslagen, ververs, alles staat er nog; zet vliegtuigmodus aan en weer uit.
4. Meenemen claimen en intrekken op twee toestellen; de ander ziet het na verversen.
5. Weekendje prikker: weekend vastleggen, andere knoppen grijs, Ander weekend kiezen met bevestiging.
6. Accommodatie: Samen kiezen met top 3 en ranglijst; Verrassing: deelnemer ziet niets tot jij onthult; bedden en eigen kamers.
7. Afrekening: tabs Wie betaalt wat en Eindafrekening.
8. Niet getest: echte Sheet (GAS) met oude kolomkop, beforeunload-dialoog per browser, visibilitychange op een echt toestel.
