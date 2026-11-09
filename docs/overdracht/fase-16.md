# Overdracht fase 16

Af: kamers en carpool (KMR-1, CAR-1, CAR-2). Schermen `#/kamers` en `#/carpool` (iedereen; de organisator beheert), schermen `kamers` en `carpool` in de API.
Server: `acties/kamers.js` (`kamersOpslaan`, `kamerIndelen`, `kamersScherm`, `verwijderUitKamers`), `acties/ritten.js` (`ritOpslaan`, `meerijden`, `meerijdenStoppen`, `carpoolScherm`, `verwijderUitRitten`). Grenzen en `eigenKamerLabel` in `shared/kamers.js`. De rechten stonden al in `rechten.js`.
Afhaken (`afhakenMarkeren`) haalt iemand uit kamer, rit en meerijders; zijn eigen rit gaat mee weg. Terugdraaien brengt hem niet terug (zoals de claims, AAN-11).
Een volle kamer of rit geeft `ongeldig` met "… is vol."; een deelnemer slaapt in één kamer en zit in één rit, opnieuw kiezen verplaatst hem.
Keuzes buiten de spec (AAN-70): `verwijderen: true` in `kamersOpslaan` en `ritOpslaan` (geen aparte actie in het contract); een bestuurder heeft één rit, opnieuw aanbieden past hem aan; wie rijdt, rijdt niet mee; de wens voor een eigen kamer staat voor iedereen bij de naam; deelnemer-ID's alleen voor de organisator.
Nieuwe aannames: AAN-70. AAN-23 en AAN-24 hebben hun codeplek.
Niet gebouwd: de organisator maakt in de UI geen rit namens een ander (de API kan het met `bestuurderId`), geen desktopindeling, geen donkere modus, geen kamer-indeling met slepen.
Niet in de browser getest: kamers maken, wijzigen, verwijderen en indelen door de organisator; alleen unit (acties). De e2e toont de indeling en doet de carpoolflow als deelnemer.
Het ontwerp (`KamersCarpool.dc.html`) is niet regel voor regel gevolgd; de schermen hergebruiken de bestaande componentklassen.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
