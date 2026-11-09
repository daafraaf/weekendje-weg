# Overdracht fase 8

Af: de wensblokken in het formulier (FRM-5 Activiteiten, Programma en sfeer, Eten en drinken als vinkjeslijst met vrij veld; FRM-6 Samenwerken; FRM-7 eigen vragen per type) en de beheerschermen `#/lijsten-beheer` (EDI-2, blokken aan/uit volgens AAN-21) en `#/vragen-beheer` (EDI-3).
Server: `acties/vragen.js` met `editieBijwerken` (alleen `blokken` en `lijsten`; deadline en periode volgen later) en `vragenBeheren` (`actie` toevoegen, wijzigen, verwijderen). Het beheerscherm levert per editie nu ook `blokken`, `lijsten` en `vragen` (met `heeftAntwoord`). `shared/lijsten.js` heeft startlijsten, sleutels en `antwoordGeldig`.
Voorkant: `components/vinkjeslijst.js` (ook voor keuze en meerkeuze), `components/vraag.js`; `drieknop` kreeg `klasse` (schaal 1 tot 5).
Keuzes buiten de spec: AAN-53 (inhoud startlijsten; `Edities.lijsten` bevat ook `keuken` en `spullen` als startlijst voor fase 11), AAN-54 (antwoord op een eigen vraag is een tekst: `ja`/`nee`, optiesleutel, sleutels met komma's, `1` tot `5`), AAN-55 (blokken en lijsten ook alleen tot Overzicht).
Voor volgende fases: `lijstenVan(editie)` en `blokkenVan(editie)` vullen ontbrekende waarden aan; labels van antwoorden zoek je op via de sleutels in `editie.lijsten`, een sleutel die niet meer in de lijst staat telt niet mee (overzicht, fase 9). Bij verwijderen van een vraag blijft het antwoord staan tot de deelnemer weer opslaat; filter op bestaande vragen.
Bugfix: de schermen lieten `null` als tekst zien door `replaceChildren` met lege elementen; het formulier filtert die nu.
Niet getest: echte telefoon, toetsenbord en schermlezer op de nieuwe vinkjes; de beheerlijst bij 40 onderdelen.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
