# Aannameregister Weekendje weg

Versie 0.12, 9 november 2026: AAN-62 (fase 11).
Versie 0.11, 9 november 2026: AAN-59 t/m AAN-61 (fase 10).
Versie 0.10, 9 november 2026: AAN-56 t/m AAN-58 (fase 9).
Versie 0.9, 9 november 2026: AAN-51 en AAN-52 (fase 7); AAN-50 vervallen.
Versie 0.8, 9 november 2026: AAN-49 en AAN-50 (fase 6).
Versie 0.7, 9 november 2026: AAN-46 t/m AAN-48 (fase 5).
Versie 0.6, 9 november 2026: AAN-43 t/m AAN-45 (fase 4).
Versie 0.5, 9 november 2026: AAN-41 en AAN-42 (fase 3).
Versie 0.4, 9 november 2026: AAN-40 (fase 2).
Versie 0.3, 9 november 2026: AAN-38 en AAN-39 (fase 1).
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
| AAN-01 | Blokkering na foute pincodes | Regel | `src/server/acties/toegang.js` (`MAX_FOUT`) | 5 pogingen, 15 minuten; na 3 blokkades nieuwe pincode nodig | laag | open |
| AAN-02 | Duur van een sessie | Regel | `src/server/acties/toegang.js` (`SESSIE_DEELNEMER_MS`) | deelnemer 60 dagen, beheer 12 uur | laag | open |
| AAN-03 | Roulerende organisator | Flow | `src/server/rechten.js` (`REGELS.editieAanmaken`) | Beheerlinks horen bij een lid; elke houder van een beheerlink kan een nieuwe editie aanmaken en beheerlinks voor andere leden maken; het nieuwe lid kiest zijn eigen wachtwoord; de eigenaar kan via het Sheet-menu altijd een beheerlink maken | midden | open |
| AAN-04 | Naar Overzicht gaan sluit het invullen | Flow | `src/server/rechten.js` (`eigenAntwoorden`) | ja, ook voor de deadline | midden | open |
| AAN-05 | Stap terug | Regel | `src/shared/stappen.js` (`stapMogelijk`) | één stap terug, niet meer terug naar Invullen vanaf Accommodatie | laag | open |
| AAN-06 | Rangorde voorkeursdatum | Regel | `src/shared/rangorde.js` (`vergelijk`) | minste nee, meeste ja, meeste misschien, voorkeursmaand, vroegste | midden | open |
| AAN-07 | Wat de groep ziet na vrijgave | Flow | `src/server/acties/overzicht.js` (`overzichtScherm`) | aantallen zonder namen, bandbreedte van budget en reistijd; vrije tekst en allergieën met namen alleen voor de organisator | midden | open |
| AAN-08 | Stemmen op accommodaties | Regel | | één favoriet per persoon, aantallen zichtbaar, wijzigen mag | laag | open |
| AAN-09 | Verdeling per bedrag moet sluiten | Regel | `src/shared/verdeling.js` (`verdelingFout`) | opslaan pas bij verschil nul | laag | open |
| AAN-10 | Restcent als de betaler niet meedeelt | Regel | `src/shared/verdeling.js` (`restNaar`) | eerste deelnemer in de verdeling op voornaam | laag | open |
| AAN-11 | Claims van wie afhaakt | Regel | | vervallen, item staat weer open | laag | open |
| AAN-12 | Bereikbaarheid onderdelen | Flow | | voor Accommodatie alleen formulier, voortgang, archief; daarna alles via het menu | laag | open |
| AAN-13 | Bron van schoolvakanties | Regel | `scripts/vakanties.mjs` | `data/vakanties.json` uit de open data van de Rijksoverheid, bijgewerkt met `npm run vakanties` | laag | open |
| AAN-14 | Verouderd script per groep | Flow | `src/web/api.js` (`VEROUDERD_TEKST`) | API-versiecontrole met instructie voor de eigenaar | midden | open |
| AAN-15 | Kalendervenster | Instelling | `src/shared/datums.js` (`standaardPeriode`) | kalenderjaar van de editie: 1 januari tot en met 31 december van `jaar` (was: twaalf maanden vanaf aanmaken) | laag | bevestigd 9 nov 2026 |
| AAN-16 | Categorieën van posten | Regel | `src/shared/geld.js` (`CATEGORIEEN`) | Verblijf, Eten en drinken, Boodschappen, Activiteit, Vervoer, Overig | laag | open |
| AAN-17 | Volgorde bij tikken in de kalender | Regel | `src/shared/beschikbaarheid.js` (`volgendeWaarde`) | leeg, ja, misschien, nee, leeg | laag | open |
| AAN-18 | Standaardmaaltijden | Instelling | | vr diner; za ontbijt, lunch, diner; zo ontbijt, lunch | laag | open |
| AAN-19 | Categorie "Overig" en categorievoorstel | Regel | | 13e categorie Overig; voorstel uit een vaste woordenlijst | laag | open |
| AAN-20 | Groepsgrootte | Regel | `src/server/acties/opzet.js` (`MIN_LEDEN`, `MAX_LEDEN`) | 2 tot en met 20 | laag | open |
| AAN-21 | Eten en drinken, activiteiten en programma standaard aan | Instelling | | aan, uit te zetten door de organisator | laag | open |
| AAN-22 | Geen rekeningnummer in betaalverzoek | Regel | `src/shared/whatsapp.js` (`betaalverzoekTekst`) | tekst zonder IBAN of betaallink | laag | open |
| AAN-23 | Kamers | Flow | | organisator maakt kamers met slaapplaatsen en deelt in; niet voller dan slaapplaatsen | laag | open |
| AAN-24 | Carpool | Flow | | bestuurder biedt rit aan, meerijder kiest zelf, organisator kan indelen | laag | open |
| AAN-25 | Programma vullen | Regel | | alleen de organisator | laag | open |
| AAN-26 | Items verwijderen | Regel | | eigen item tot definitief; organisator elk item | laag | open |
| AAN-27 | Afvinken bij boodschappen | Regel | | iedereen, gedeeld | laag | open |
| AAN-28 | Setupcode | Regel | `src/server/acties/opzet.js` (`setupcodeMaken`) | acht tekens, eenmalig, 30 minuten geldig | laag | open |
| AAN-29 | Na Afgerond | Regel | `src/server/rechten.js` (`reden`) | editie alleen-lezen | laag | open |
| AAN-30 | Wie het archief ziet | Flow | | iedere deelnemer met een geldige link van een editie van de groep | laag | open |
| AAN-31 | Links per editie | Flow | | nieuwe link en pincode per editie; oude links alleen-lezen na Afgerond | midden | open |
| AAN-32 | Hashen | Regel | `src/server/crypto.js` (`ITERATIES`) | tokens SHA-256 zonder salt; pincode en wachtwoord iteratieve SHA-256 met salt, aantal iteraties zo dat een login in Apps Script onder 1 seconde blijft (meten in fase 20) | laag | open |
| AAN-33 | Ingevuld-status | Regel | `src/shared/antwoorden.js` (`ontbreekt`) | minstens één weekend, beide budgetten en reistijd gekozen | laag | open |
| AAN-34 | Wat koks zien | Flow | | aantallen per eetwens en vrije tekst zonder namen; allergieën met namen alleen voor de organisator (volgt B-28; zonder deze regel kan ieder lid zich kok maken en alle allergieën met namen zien) | midden | open |
| AAN-35 | Afrekening goed genoeg in plaats van minimaal | Regel | `src/shared/afrekening.js` (`afrekening`) | eerst gelijke bedragen koppelen, daarna grootste schuldenaar naar grootste schuldeiser | laag | open |
| AAN-36 | Wie de pincode kiest | Regel | `src/server/crypto.js` (`maakPincode`) | het script kiest willekeurig zes cijfers; de organisator verstuurt hem alleen (F-38 zei "de organisator voegt een wachtwoordje toe") | laag | open |
| AAN-37 | Navigatielijst voor vaste externe links | Regel | `scripts/check-bronregels.mjs` (`NAVIGATIELIJST`) | de enige plek in `src/web` waar `wa.me` en `maps.google.com` mogen staan is `src/web/navigatie.js` (spec noemt de lijst, niet de bestandsnaam) | laag | open |
| AAN-38 | Rechten voor acties die §6 niet letterlijk noemt | Regel | `src/server/rechten.js` (`SCHERMEN`) | eigen antwoorden en de andere schermen lezen mag elk lid van de editie, ook na de deadline; een bestaand item of een bestaande post wijzigen volgt de regel voor verwijderen; `deelnemersBeheren` en `vragenBeheren` vallen onder de rij Editie; `betalingTerugdraaien` volgt "Betaling markeren" | laag | open |
| AAN-39 | Eigen antwoorden en stem van de organisator | Regel | `src/server/rechten.js` (`eigenAntwoorden`) | de beheersessie werkt voor de deelnemersrij van het eigen lid in die editie; deadline en stap Invullen gelden ook voor de organisator (§7.2.3 "niemand") | laag | open |
| AAN-40 | Voorbeeldeditie in de schil | Regel | `src/web/app.js` (`VOORBEELD`) | tot de login er is (fase 3) toont de schil een voorbeeldeditie; de stap komt uit `#/start?stap=...`, een onbekende stap valt terug op Invullen | laag | open |
| AAN-41 | Beheerlink voor de beheerlogin bestaat | Flow | `src/web/screens/pincode.js` (`bijBeheerlink`) | een geplakte beheerlink wordt herkend en leidt naar de beheerlogin; de tijdelijke melding uit fase 3 is vervallen met fase 4 | laag | vervallen |
| AAN-42 | Uitloggen zonder verbinding | Flow | `src/web/app.js` (`uitloggen`) | de knop wist altijd de sessie op het apparaat; lukt het script niet (offline of fout), dan blijft de sessie in de Sheet tot ze verloopt | laag | open |
| AAN-43 | Eigenaar is na opzetten ingelogd | Flow | `src/server/acties/opzet.js` (`groepOpzetten`) | `groepOpzetten` geeft naast de beheerlink een beheersessie van 12 uur terug, zodat "Naar beheren" geen tweede wachtwoordinvoer vraagt | laag | open |
| AAN-44 | Blokkade bij foute beheerwachtwoorden | Regel | `src/server/acties/beheertoegang.js` (`inloggenBeheer`) | vijf fouten geven 15 minuten blokkade (zelfde teller als de pincode), zonder blijvende blokkade; een reset via het Sheet-menu zet de teller op nul | laag | open |
| AAN-45 | Beheerlink uit het Sheet-menu | Flow | `src/server/gas/menu.js` (`scriptId`) | het script kent de Pages-URL niet; het menu toont `#b=<scriptId>&beheer=<token>` om achter het adres van de app te zetten | laag | open |
| AAN-46 | Maker van een editie | Regel | `src/server/acties/editie.js` (`editieAanmaken`) | wie een editie maakt is er altijd deelnemer en organisator van (anders kan hij haar niet beheren); een editie heeft minstens twee deelnemers, net als een groep | laag | open |
| AAN-47 | Links maken voor wie nog geen link heeft | Regel | `src/server/acties/editie.js` (`linksMaken`) | `linksMaken` maakt alleen voor deelnemers zonder link; wie er al een heeft houdt die, vernieuwen gaat via `linkVernieuwen` en `pincodeVernieuwen` | laag | open |
| AAN-48 | Tijdstip van de deadline | Regel | `src/shared/editie.js` (`deadlineIso`) | de organisator kiest een dag; de deadline eindigt om 23:59 Amsterdamse tijd (zomer- of wintertijd) | laag | open |
| AAN-49 | Grenzen van een schooljaar | Regel | `src/shared/vakanties.js` (`schooljaarBekend`) | een schooljaar "2026-2027" geldt van 1 september 2026 tot en met 31 augustus 2027; daarbuiten toont de kalender "Schoolvakanties nog niet bekend" | laag | open |
| AAN-50 | Kalender als eigen scherm tot fase 7 | Flow | `src/web/app.js` (route `kalender`) | de kalender staat voorlopig op `#/kalender` met voorbeeldperiode 2027 en bewaart niets; fase 7 hangt hem in het formulier | laag | vervallen |
| AAN-51 | Keuze weghalen in de drieknop | Flow | `src/web/components/drieknop.js` | nogmaals tikken op de gekozen knop haalt de keuze weg; een ontbrekende sleutel betekent niet ingevuld (§5.2) en zo is een verblijfswens ook weer leeg te maken | laag | open |
| AAN-52 | Namen van de verblijfswensen | Regel | `src/shared/antwoorden.js` (`VERBLIJF_WENSEN`) | de spec geeft de acht sleutels maar geen teksten; de labels zijn Eigen kamer, Eigen badkamer, Sauna, Bubbelbad, Barbecue, Buitenruimte, Schoonmaak inbegrepen, Linnengoed inbegrepen, met de opties Ja, Nee, Maakt niet uit (eigen kamer: Ja, Liever wel, Maakt niet uit) | laag | open |
| AAN-53 | Inhoud van de startlijsten | Regel | `src/shared/lijsten.js` (`LIJSTEN_STANDAARD`) | een nieuwe editie krijgt in `Edities.lijsten` startlijsten voor activiteiten, programma en eten en drinken (acht, zeven en acht onderdelen) en de startlijsten keuken en spullen uit §7.7.2; een oudere editie zonder lijst valt terug op dezelfde startlijst | laag | open |
| AAN-54 | Vorm van een antwoord op een eigen vraag | Regel | `src/shared/lijsten.js` (`antwoordGeldig`) | het antwoord is een tekst: ja of nee, de sleutel van de gekozen optie, bij meerkeuze de sleutels met komma's, een cijfer 1 tot 5, of de vrije tekst; een vraag heeft hooguit 20 stuks, een keuzevraag 2 tot 10 opties; opslaan laat antwoorden op verwijderde vragen weg | laag | open |
| AAN-55 | Blokken en lijsten ook vast na Invullen | Regel | `src/server/acties/vragen.js` (`alleenInvullen`) | zoals EDI-3 voor vragen zegt, kan de organisator ook de blokken en lijsten (EDI-2) alleen aanpassen zolang de editie in de stap Invullen staat | laag | open |
| AAN-56 | Eigen vragen in het overzicht | Regel | `src/server/acties/overzicht.js` (`TELBARE_VRAGEN`) | §7.5.3 noemt "per eigen keuzevraag het aantal per optie"; deelnemers zien dat voor ja/nee, keuze, meerkeuze en schaal (aantal per cijfer); tekstvragen zien alleen de organisator, met naam | laag | open |
| AAN-57 | Deadline verlengen | Regel | `src/server/acties/stappen.js` (`stapWijzigingen`) | verlengen kan alleen naar een latere deadline dan de huidige, zolang de stap Invullen is; de verwachte datum van Invullen schuift mee, Overzicht en Accommodatie blijven staan | laag | open |
| AAN-58 | Teksten per stap | Regel | `src/shared/whatsapp.js` (`STAP_VERWACHT`) | de spec zegt wat een stapbericht bevat, niet de woorden; per stap één zin over wat er nu verwacht wordt, plus "<volgende stap> volgt rond <datum>" of "volgt later" als die datum leeg is | laag | open |
| AAN-59 | Grenzen van een post | Regel | `src/shared/geld.js` (`POST_GRENZEN`) | de spec zegt alleen bedrag groter dan 0; een post is 1 cent tot € 100.000 met een omschrijving van 1 tot 80 tekens, de betaler en iedereen in de verdeling zijn deelnemers van de editie (afgehaakt mag) | laag | open |
| AAN-60 | Totalen en jouw deel netto | Regel | `src/shared/saldo.js` (`totalen`) | GELD-6 noemt totalen per categorie; een ontvangst gaat van de uitgaven in zijn categorie af, het totaal bovenaan is netto en "jouw deel" is je aandeel in uitgaven min je aandeel in ontvangsten | laag | open |
| AAN-61 | Knop "Iedereen" | Regel | `src/shared/verdeling.js` (`iedereen`) | "Iedereen" vinkt net als de standaardverdeling (§7.13.5) alle niet-afgehaakte deelnemers aan; een afgehaakte komt er alleen bij met een eigen vinkje (§7.13.9) | laag | open |
| AAN-62 | Welke betaling je als betaald markeert | Regel | `src/server/acties/afrekening.js` (`betalingMarkeren`) | alleen een betaling die op dat moment open staat in de afrekening (zelfde van, naar en bedrag); is de afrekening intussen veranderd, dan krijg je "gewijzigd" en laad je opnieuw. Een los bedrag buiten de afrekening om kan niet | laag | open |

## Volgorde voor het gesprek

Eerst de flow-aannames: AAN-34, AAN-03, AAN-04, AAN-07, AAN-14, AAN-31, daarna AAN-12, AAN-23,
AAN-24, AAN-30. Dan de regel met impact midden: AAN-06.

## Log

- 2026-11-08: register aangemaakt uit het interview.
- 2026-11-08: AAN-34 t/m AAN-36 toegevoegd en AAN-03, AAN-07, AAN-21, AAN-32 aangepast na de spec-review.
- 2026-11-09: AAN-38 en AAN-39 toegevoegd in fase 1 (rechten).
- 2026-11-09: AAN-40 toegevoegd in fase 2 (schil).
- 2026-11-09: AAN-41 en AAN-42 toegevoegd in fase 3 (inloggen).
- 2026-11-09: AAN-43 t/m AAN-45 toegevoegd in fase 4 (groep opzetten); AAN-41 vervallen.
- 2026-11-09: AAN-46 t/m AAN-48 toegevoegd in fase 5 (editie aanmaken en uitnodigen).
- 2026-11-09: AAN-49 en AAN-50 toegevoegd in fase 6 (kalender); AAN-13, AAN-15 en AAN-17 kregen hun codeplek.
- 2026-11-09: AAN-51 en AAN-52 toegevoegd in fase 7 (invulformulier); AAN-50 vervallen; AAN-33 kreeg zijn codeplek.
- 2026-11-09: AAN-53 t/m AAN-55 toegevoegd in fase 8 (wensblokken en eigen vragen); AAN-21 kreeg zijn codeplek.
- 2026-11-09: AAN-56 t/m AAN-58 toegevoegd in fase 9 (voortgang, overzicht en stappen); AAN-04 t/m AAN-07 kregen hun codeplek.
- 2026-11-09: AAN-59 t/m AAN-61 toegevoegd in fase 10 (posten en verdeling); AAN-09, AAN-10 en AAN-16 kregen hun codeplek.
- 2026-11-09: AAN-62 toegevoegd in fase 11 (afrekenen en afhaken); AAN-22 en AAN-35 kregen hun codeplek.
