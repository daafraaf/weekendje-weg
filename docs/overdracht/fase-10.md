# Overdracht fase 10

Af: `#/posten` (menu "Geld", voor deelnemer en organisator): lijst met betaler, categorie, wijze en jouw deel, de aantekening "aangepast door de organisator", totaal en jouw deel, netto per categorie en saldo per deelnemer (GELD-6, GELD-7). Bewerken gebeurt in hetzelfde scherm (`screens/post-bewerken.js`), geen eigen route; posten van een ander zijn voor een deelnemer alleen-lezen (GELD-5).
Verdeelinvoer (`components/verdeelinvoer.js`): Gelijk met "Iedereen", Aandeel met teller 0 t/m 20, Bedrag met "Nog € x te verdelen" / "€ x te veel"; Opslaan staat uit tot de verdeling klopt (GELD-2, GELD-3).
Logica: `shared/geld.js` (euro, leesBedrag, CATEGORIEEN), `shared/verdeling.js` (verdeel, restNaar, verdelingFout), `shared/saldo.js` (saldi incl. `Betalingen`, totalen). Server: `acties/posten.js` met `postOpslaan`, `postVerwijderen` en scherm `posten`; `kiesEditie` uit overzicht.js is nu geëxporteerd.
Aannames: AAN-59 (grenzen van een post), AAN-60 (totalen netto, ontvangst trekt af), AAN-61 ("Iedereen" zonder afgehaakten). AAN-09, AAN-10, AAN-16 hebben hun codeplek.
Keuzes buiten de spec: categorie staat als sleutel (`etenDrinken`) in de Sheet; de soort van een bestaande post is niet te wijzigen; een organisator zonder editieId krijgt zijn nieuwste editie, zoals bij overzicht.
Demo: `maakDemo({ posten: true })` zet twee posten (Eva boodschappen, Bram kanoverhuur); `npm run mock` zet ze aan.
Schil: het mobiele menu scrolt nu horizontaal, want met tien beheerlinks viel "Geld" buiten beeld. Het ontwerp groepeert later naar vijf knoppen (Start, Plannen, Samen, Geld, Meer).
Voor fase 11 (afrekening): `saldi()` telt `Betalingen` al mee; `aandelen` per post komen van de server, de klant rekent alleen voor de voorvertoning.
Let op: Playwright los draaien test `dist/`; eerst `npm run build` (check doet dat zelf).
Niet getest: echte telefoon, schermlezer op de tellerknoppen, donkere modus, gelijktijdig wijzigen van dezelfde post in de browser (versieconflict alleen op de server getest via Store).
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
