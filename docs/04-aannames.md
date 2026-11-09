# Aannameregister Weekendje weg

Versie 0.2, 9 november 2026: AAN-15 bevestigd met het kalenderjaar.
Versie 0.1, 8 november 2026

We bouwen op deze aannames en toetsen ze daarna bij David. Elke aanname heeft een ID
(AAN-xx). In de code staat een aanname op precies één plek, met het ID in een commentaar.
Er is minstens één test met het ID in de naam. Wijzigt een antwoord, dan pas je die plek en
die test aan en werk je hier de status bij.

**Soorten**
- **Instelling:** in de app aan te passen. Een ander antwoord vraagt geen code.
- **Regel:** staat als constante of functie in de code. Een ander antwoord is een kleine wijziging.
- **Flow:** gaat over schermen en statussen. Een ander antwoord kost meer werk, dus deze eerst vragen.

| ID | Aanname | Soort | Plek in de code | Standaard | Impact bij ander antwoord | Status |
|---|---|---|---|---|---|---|
| AAN-01 | Blokkering na foute pincodes | Regel | | 5 pogingen, 15 minuten; na 3 blokkades nieuwe pincode nodig | laag | open |
| AAN-02 | Duur van een sessie | Regel | | deelnemer 60 dagen, beheer 12 uur | laag | open |
| AAN-03 | Roulerende organisator | Flow | | Beheerlinks horen bij een lid; elke houder van een beheerlink kan een nieuwe editie aanmaken en beheerlinks voor andere leden maken; het nieuwe lid kiest zijn eigen wachtwoord; de eigenaar kan via het Sheet-menu altijd een beheerlink maken | midden | open |
| AAN-04 | Naar Overzicht gaan sluit het invullen | Flow | | ja, ook voor de deadline | midden | open |
| AAN-05 | Stap terug | Regel | | één stap terug, niet meer terug naar Invullen vanaf Accommodatie | laag | open |
| AAN-06 | Rangorde voorkeursdatum | Regel | | minste nee, meeste ja, meeste misschien, voorkeursmaand, vroegste | midden | open |
| AAN-07 | Wat de groep ziet na vrijgave | Flow | | aantallen zonder namen, bandbreedte van budget en reistijd; vrije tekst en allergieën met namen alleen voor de organisator | midden | open |
| AAN-08 | Stemmen op accommodaties | Regel | | één favoriet per persoon, aantallen zichtbaar, wijzigen mag | laag | open |
| AAN-09 | Verdeling per bedrag moet sluiten | Regel | | opslaan pas bij verschil nul | laag | open |
| AAN-10 | Restcent als de betaler niet meedeelt | Regel | | eerste deelnemer in de verdeling op voornaam | laag | open |
| AAN-11 | Claims van wie afhaakt | Regel | | vervallen, item staat weer open | laag | open |
| AAN-12 | Bereikbaarheid onderdelen | Flow | | voor Accommodatie alleen formulier, voortgang, archief; daarna alles via het menu | laag | open |
| AAN-13 | Bron van schoolvakanties | Regel | | `data/vakanties.json` uit de open data van de Rijksoverheid, bijgewerkt met `npm run vakanties` | laag | open |
| AAN-14 | Verouderd script per groep | Flow | | API-versiecontrole met instructie voor de eigenaar | midden | open |
| AAN-15 | Kalendervenster | Instelling | | kalenderjaar van de editie: 1 januari tot en met 31 december van `jaar` (was: twaalf maanden vanaf aanmaken) | laag | bevestigd 9 nov 2026 |
| AAN-16 | Categorieën van posten | Regel | | Verblijf, Eten en drinken, Boodschappen, Activiteit, Vervoer, Overig | laag | open |
| AAN-17 | Volgorde bij tikken in de kalender | Regel | | leeg, ja, misschien, nee, leeg | laag | open |
| AAN-18 | Standaardmaaltijden | Instelling | | vr diner; za ontbijt, lunch, diner; zo ontbijt, lunch | laag | open |
| AAN-19 | Categorie "Overig" en categorievoorstel | Regel | | 13e categorie Overig; voorstel uit een vaste woordenlijst | laag | open |
| AAN-20 | Groepsgrootte | Regel | | 2 tot en met 20 | laag | open |
| AAN-21 | Eten en drinken, activiteiten en programma standaard aan | Instelling | | aan, uit te zetten door de organisator | laag | open |
| AAN-22 | Geen rekeningnummer in betaalverzoek | Regel | | tekst zonder IBAN of betaallink | laag | open |
| AAN-23 | Kamers | Flow | | organisator maakt kamers met slaapplaatsen en deelt in; niet voller dan slaapplaatsen | laag | open |
| AAN-24 | Carpool | Flow | | bestuurder biedt rit aan, meerijder kiest zelf, organisator kan indelen | laag | open |
| AAN-25 | Programma vullen | Regel | | alleen de organisator | laag | open |
| AAN-26 | Items verwijderen | Regel | | eigen item tot definitief; organisator elk item | laag | open |
| AAN-27 | Afvinken bij boodschappen | Regel | | iedereen, gedeeld | laag | open |
| AAN-28 | Setupcode | Regel | | acht tekens, eenmalig, 30 minuten geldig | laag | open |
| AAN-29 | Na Afgerond | Regel | | editie alleen-lezen | laag | open |
| AAN-30 | Wie het archief ziet | Flow | | iedere deelnemer met een geldige link van een editie van de groep | laag | open |
| AAN-31 | Links per editie | Flow | | nieuwe link en pincode per editie; oude links alleen-lezen na Afgerond | midden | open |
| AAN-32 | Hashen | Regel | | tokens SHA-256 zonder salt; pincode en wachtwoord iteratieve SHA-256 met salt, aantal iteraties zo dat een login in Apps Script onder 1 seconde blijft (meten in fase 20) | laag | open |
| AAN-33 | Ingevuld-status | Regel | | minstens één weekend, beide budgetten en reistijd gekozen | laag | open |
| AAN-34 | Wat koks zien | Flow | | aantallen per eetwens en vrije tekst zonder namen; allergieën met namen alleen voor de organisator (volgt B-28; zonder deze regel kan ieder lid zich kok maken en alle allergieën met namen zien) | midden | open |
| AAN-35 | Afrekening goed genoeg in plaats van minimaal | Regel | | eerst gelijke bedragen koppelen, daarna grootste schuldenaar naar grootste schuldeiser | laag | open |
| AAN-36 | Wie de pincode kiest | Regel | | het script kiest willekeurig zes cijfers; de organisator verstuurt hem alleen (F-38 zei "de organisator voegt een wachtwoordje toe") | laag | open |

## Volgorde voor het gesprek

Eerst de flow-aannames: AAN-34, AAN-03, AAN-04, AAN-07, AAN-14, AAN-31, daarna AAN-12, AAN-23,
AAN-24, AAN-30. Dan de regel met impact midden: AAN-06.

## Log

- 2026-11-08: register aangemaakt uit het interview.
- 2026-11-08: AAN-34 t/m AAN-36 toegevoegd en AAN-03, AAN-07, AAN-21, AAN-32 aangepast na de spec-review.
