# Interview Weekendje weg, 2026-11-08

Gevoerd als voicegesprek na de analyse (`00-analyse.md`). Bronnen: `00-bron.md` (F-01 t/m
F-19) en `00-bron-2.md` (F-20 t/m F-57).

## Beslissingen

### Doel en gebruikers
- B-01 De app heet Weekendje weg. Eén editie per jaar voor een vaste vriendengroep; de eerste groep telt zes personen. (F-01, F-11)
- B-02 De app is bruikbaar voor andere groepen. Groepsgrootte is instelbaar; elke groep heeft een eigen Google Sheet. (F-22)
- B-03 De organisator rouleert per editie. Meestal één, soms twee organisatoren met gelijke rechten. De organisator is ook deelnemer. (F-21)
- B-04 Alles moet in één keer functioneel live. De groep krijgt pas een link als de hele app af en getest is. (F-44)
- B-05 De app is Nederlandstalig. (F-34)

### Techniek
- B-06 Route 2: de voorkant is een statische, installeerbare webapp op GitHub Pages; de gegevens staan in de Google Sheet van de groep; een Apps Script in die Sheet is het enige doorgeefluik. Werkt in de browser op Android, iOS, Windows en macOS. (F-18, F-19, F-31, F-52)
- B-07 Eén voorkant voor alle groepen. Een update van de voorkant geldt meteen voor iedereen. (Volgt uit B-02 en B-06)
- B-08 De code staat openbaar op GitHub en bevat geen geheimen. Tweestapsverificatie op het GitHub-account is verplicht. (F-53)
- B-09 Geen pushmeldingen. Bij elke nieuwe stap maakt de app voor de organisator een kant-en-klaar WhatsApp-bericht met een deelknop. (F-55)
- B-10 De app is op het beginscherm te zetten (PWA) op Android, iOS en desktop. (F-35, F-52)

### Toegang en beveiliging
- B-11 Elke deelnemer krijgt een persoonlijke link en een verplichte pincode van zes cijfers. De organisator stuurt link en pincode in aparte berichten. (F-29, F-38, F-53)
- B-12 Zonder geldige link en pincode toont de app niets, ook geen namen of voortgang. De controle zit in het Apps Script, niet alleen op het scherm. (F-38)
- B-13 Na een aantal foute pincodes volgt een tijdelijke blokkering. (F-53)
- B-14 De organisator heeft een eigen beheerlink met een wachtwoord dat hij zelf kiest. Herstel gaat via de Google Sheet, die op het account van de eigenaar staat. (F-38)

### Stappen en startscherm
- B-15 Een editie doorloopt vaste stappen: Invullen, Overzicht, Accommodatie, Voorbereiding, Weekend, Afrekenen. De organisator zet de editie met de hand een stap verder. (F-45)
- B-16 Bovenin staat een stappenbalk: huidige stap uitgelicht, afgeronde stappen met vinkje, latere stappen grijs, elk met een verwachte datum die de organisator kan aanpassen. (F-45)
- B-17 Het startscherm beweegt mee met de stap; de rest is bereikbaar via het menu. De organisator heeft een eigen startscherm met de voortgang en zijn eerstvolgende actie. (F-46)
- B-18 Een aftelteller op het startscherm zodra de datum vastligt. (F-40)

### Invullen
- B-19 Iedereen krijgt een blanco kalender. Per weekend kies je ja, misschien of nee; wat leeg blijft telt als niet ingevuld. Een weekend loopt van vrijdag tot en met zondag. (F-24)
- B-20 Het hele jaar is te selecteren. Voorkeursmaanden worden uitgelicht; standaard april, mei, september en oktober, per editie aan te passen door de organisator. (F-08, F-20)
- B-21 De kalender toont schoolvakanties voor Noord, Midden en Zuid en de feestdagen. (F-09)
- B-22 Budget per persoon in twee vragen: verblijf in schijven van €50 en het hele weekend (maximaal kwijt) in schijven van €100, beide tot €1000. Op de telefoon als schuifje. (F-03, F-12, F-26)
- B-23 Reistijd: woonplaats plus maximale reistijd met de auto, als geheel getal in uren. Geen vervoersvraag; iedereen heeft een auto of regelt het zelf. (F-07, F-14, F-27)
- B-24 Verblijfswensen: eigen kamer (ja, liever wel, maakt niet uit); eigen badkamer, sauna, bubbelbad, barbecue, buitenruimte, schoonmaak inbegrepen en linnengoed aanwezig (elk ja, nee of maakt niet uit). Een eigen badkamer in plaats van een aantal badkamers. (F-13, F-28)
- B-25 Boven de verblijfswensen staat dat je voorkeuren opgeeft en dat die niet gegarandeerd zijn. (F-28)
- B-26 Blok activiteiten: vooraf ingevulde lijst (escape room, wijnproeverij, whiskyproeverij, barbecuecursus, smeden, paintballen) met vinkjes plus een veld voor eigen ideeën. De organisator past de lijst per editie aan. (F-36)
- B-27 Blok programma en sfeer: vooraf ingevulde lijst met vinkjes (uitslapen, bordspellen, sportief bezig zijn, rustig aan doen, samen op stap, samen thuis koken, samen netjes opruimen aan het eind) plus een veld voor eigen wensen. (F-37)
- B-28 Blok eten en drinken, standaard aan: vinkjes voor drinken (gewoon bier, 0,0 bier, IPA of speciaalbier, rode wijn, witte wijn, fris, koffie, thee) en eten (vegetarisch, veganistisch, glutenvrij, lactosevrij), plus een vrij veld voor allergieën en wensen. Allergieën zijn alleen zichtbaar voor de organisator. (F-33, F-41)
- B-29 Blok samenwerken op vrijdag: optioneel, de organisator zet het aan. Vraagt of je vrijdag overdag op de locatie wilt werken en dus eerder aankomt; de organisator ziet dan dat wifi en werkplekken nodig zijn. (F-25)
- B-30 De organisator kan eigen vragen toevoegen. (F-15, F-33)
- B-31 Er is een deadline voor het invullen. Tot de deadline kan iedereen zijn antwoorden aanpassen. (F-30)

### Overzicht en kiezen
- B-32 Iedereen ziet wie al heeft ingevuld. (F-06, F-16, F-23)
- B-33 Het overlapoverzicht zonder namen, met daaruit een voorkeursdatum, verschijnt pas als de organisator het met de hand vrijgeeft. Eigen antwoorden blijven privé; de organisator ziet de details per persoon. (F-04, F-05, F-23)
- B-34 Budget ziet de groep alleen als bandbreedte. (Advies analyse, bevestigd)
- B-35 De organisator legt de datum vast en kan accommodaties in de app zetten. Per editie kiest hij de deelvorm: ter informatie, met stemronde of als "geboekt". (F-32)
- B-36 Een archief per editie: jaar, datum, accommodatie, organisator(en) en deelnemers. Geen foto of "beste moment". (F-40)

### Voorbereiding
- B-37 Wie neemt wat mee: gedeelde lijst met spullen (spellen, speaker en dergelijke) en een deel "Uit eigen keuken" dat al is ingevuld met olijfolie, zout en peper, kruiden, mayonaise, pindakaas, ketchup, suiker, koffie en thee. Iedereen kan items toevoegen. (F-40, F-42)
- B-38 Elke claim is een eigen regel. Bij één item kunnen meerdere namen staan ("Jan, Klaas"), ook bij gelijktijdig tikken. Dubbel meenemen is toegestaan. Iedereen kan zijn eigen naam weer weghalen. (F-51)
- B-39 Een product telt als geregeld zodra er minstens één naam achter staat; het valt dan van de te kopen boodschappen af. (F-42, F-51)
- B-40 De lijsten verversen bij elke keer dat je de app opent of terugkomt in het scherm. (F-51)
- B-41 Kookbeurten: wie kookt welke maaltijd, met de ingrediënten op de boodschappenlijst. De kok ziet de wensen voor eten en drinken. (F-40)
- B-42 De boodschappenlijst heeft geen deadline. De organisator zet hem op definitief; daarna kan er niets meer bij. (F-43)
- B-43 De boodschappenlijst is ingedeeld op de looproute van een Nederlandse supermarkt: groente en fruit, brood, vlees vis en vega, kaas en vleeswaren, zuivel en eieren, ontbijt en beleg, pasta rijst en wereldkeuken, conserven en sauzen, koek snoep en chips, frisdrank bier en wijn, diepvries, huishouden. (F-43)
- B-44 Tijdens het boodschappen doen vink je producten af. Met een knop kopieer je de hele lijst als tekst, bijvoorbeeld voor een online bestelling. (F-43)
- B-45 Weekendprogramma: een tijdlijn van vrijdag tot en met zondag die de organisator vult, met tijd, adres en link. (F-40)
- B-46 Kamerindeling: de organisator verdeelt wie waar slaapt en ziet daarbij de wens voor een eigen kamer. (F-40)
- B-47 Carpoolen: wie rijdt en wie met wie meerijdt, met de woonplaatsen erbij. (F-40)

### Wie betaalt wat
- B-48 Iedere deelnemer voert uitgaven in, voor, tijdens en na het weekend. Alleen bedragen, geen bonnetjes. (F-39)
- B-49 Verdeling per uitgave: in één druk iedereen gelijk, een tellertje per persoon voor het aandeel (1, 2, 3), of een bedrag per persoon. Een bedrag per persoon moet optellen tot het totaal; zo niet, dan toont de app het verschil. (F-39)
- B-50 Ook ontvangen geld is in te voeren, zoals geld uit de pot of teruggekregen borg. (F-39)
- B-51 Elke uitgave krijgt een categorie. (F-39)
- B-52 De eindafrekening gebruikt zo min mogelijk overschrijvingen. Betalingen markeer je als betaald; afrekenen kan in meerdere rondes. Per betaling een betaalverzoek als WhatsApp-tekst. (F-39)
- B-53 De restcent gaat naar de betaler. (F-39, F-49)
- B-54 Iedereen voegt uitgaven toe en wijzigt alleen zijn eigen uitgaven. De organisator kan alles wijzigen als noodgreep; zo'n wijziging krijgt de aantekening "aangepast door de organisator". (F-39)
- B-55 Wie afhaakt, blijft meebetalen aan de uitgaven die al met hem zijn gedeeld. Nieuwe uitgaven worden standaard niet meer op hem verdeeld. De organisator markeert iemand als afgehaakt; die valt weg bij kamerindeling, carpoolen en boodschappen. (F-47)
- B-56 Later komen of minder meedoen kent geen aparte regeling; dat regel je per uitgave via de verdeling. (F-48)
- B-57 Geen betalen in de app en geen vreemde valuta. (Advies, bevestigd)

### Eerste gebruik en uitstraling
- B-58 Bij de eerste keer openen volgt een rondleiding met de installatiestappen per apparaat (iPhone, Android, desktop). De organisator krijgt een eigen rondleiding voor het opzetten van de Sheet. (F-54)
- B-59 Strak, luchtig en rustig, met formulieren die makkelijk in te vullen zijn, op mobiel en desktop. Licht of donker volgt de instelling van het apparaat op dat moment. (F-50)
- B-60 Liquid Glass voor stappenbalk, menu en kaarten; formulieren krijgen een stevige achtergrond voor de leesbaarheid. Het kleurenpalet kiezen David en Claude samen in de designfase. (F-57)

### Bouwen
- B-61 Eén bouwer, geen parallelle agents. Elke bouwfase heeft een eigen bestand, draait in een frisse context, eindigt met slagende tests en een kort overdrachtsbestand. De fasen lopen na elkaar in één run; bij rood stopt de run. (F-56)
- B-62 Rechten voor Claude Code vooraf instellen met een allow-lijst in `.claude/settings.json`, niet met het overslaan van alle toestemmingen. (F-56)
- B-63 Davids handwerk zit alleen aan het eind: inloggen bij Google en GitHub, uitrollen en een echte test. (F-56)

## Buiten scope
- Echte pushmeldingen en e-mail.
- Bonnetjesfoto's en andere bestandsuploads.
- Betalen in de app (iDEAL, Tikkie-koppeling) en vreemde valuta.
- Foto's en "beste moment" in het archief.
- Automatische reistijdberekening en kaarten; een vervoersvraag.
- Zoeken of boeken van accommodaties vanuit de app.
- Accounts, e-mailadressen of telefoonnummers van deelnemers.
- Chat in de app.
- Een eigen server of database buiten de Google Sheet.

## Randgevallen
- Iemand vult niet in voor de deadline: de organisator verlengt de deadline of geeft het overzicht toch vrij. Zijn kalender telt dan als "niet ingevuld".
- Geen enkel weekend waarop iedereen kan: het overzicht toont de beste weekenden op volgorde; de organisator beslist.
- Iemand haakt af: zie B-55.
- Iemand komt pas op zaterdag: per uitgave uit de verdeling halen (B-56).
- Twee mensen claimen tegelijk hetzelfde item: beide namen komen erbij (B-38).
- Iemand heeft een verouderd scherm open en slaat op: de app merkt dat de gegevens intussen zijn veranderd en vraagt te verversen.
- Link of pincode kwijt: de organisator kopieert de link opnieuw of maakt een nieuwe pincode.
- Beheerwachtwoord kwijt: herstel via het menu in de Google Sheet.

## Open vragen → aanname
- Hoeveel foute pincodes leiden tot blokkering en hoe lang? Voorstel: 5 pogingen, 15 minuten; na 3 blokkades moet de organisator een nieuwe pincode maken. Impact: laag
- Hoe lang blijf je ingelogd op een apparaat? Voorstel: deelnemer 60 dagen, beheer 12 uur. Impact: laag
- Hoe wordt een editie aangemaakt als de organisator rouleert? Voorstel: elke organisator met een beheerlink kan een nieuwe editie aanmaken en daarvoor beheerlinks maken; de nieuwe organisator kiest bij eerste gebruik zijn eigen wachtwoord. De eigenaar van de Sheet kan via het Sheet-menu altijd een beheerlink maken. Impact: midden
- Sluit het vrijgeven van het overzicht het invullen? Voorstel: ja, door naar de stap Overzicht te gaan sluit het invullen, ook als de deadline nog niet voorbij is. Impact: midden
- Mag de organisator een stap terug? Voorstel: één stap terug mag, behalve terug naar Invullen na de stap Accommodatie. Impact: laag
- Rangorde van de voorkeursdatum. Voorstel: minste "nee", dan meeste "ja", dan meeste "misschien", dan in een voorkeursmaand, dan het vroegste weekend. Impact: midden
- Wat ziet de groep na vrijgave van de andere blokken? Voorstel: aantallen zonder namen per vinkje en bandbreedte voor budget en reistijd; vrije tekst en allergieën alleen voor de organisator, allergieën en eetwensen ook voor de koks. Impact: midden
- Stemmen op accommodaties: één favoriet of een volgorde? Voorstel: één favoriet per persoon, iedereen ziet de aantallen. Impact: laag
- Kan een bedrag-per-persoon-verdeling worden opgeslagen als hij niet sluit? Voorstel: nee, opslaan kan pas als het verschil nul is. Impact: laag
- Waar gaat de restcent heen als de betaler zelf niet meedeelt? Voorstel: naar de eerste deelnemer in de verdeling op alfabet. Impact: laag
- Wat gebeurt er met de claims van iemand die afhaakt? Voorstel: zijn claims vervallen en de items staan weer open. Impact: laag
- Welke stappen tonen welke onderdelen? Voorstel: alle onderdelen zijn vanaf de stap Accommodatie bereikbaar via het menu; het startscherm licht uit wat bij de stap hoort. Impact: laag
- Waar komen de schoolvakanties vandaan? Voorstel: een JSON-bestand in de repo, gemaakt met een script uit de open data van de Rijksoverheid; feestdagen worden berekend. Impact: laag
- Een update van het Apps Script per groep. Voorstel: de voorkant controleert de API-versie van het script en toont de eigenaar een instructie als zijn script moet worden bijgewerkt. Impact: midden
- Startdatum en lengte van het kalendervenster. Voorstel: de organisator kiest van en tot; standaard de komende twaalf maanden vanaf het aanmaken. Impact: laag

### Na de spec-review
- Wat zien koks van eetwensen? Iedereen kan zich kok maken, dus met namen zou ieder lid alle allergieën kunnen zien, wat B-28 tegenspreekt. Voorstel: koks zien aantallen en vrije tekst zonder namen. Impact: midden
- Is de afrekening "goed genoeg" of moet hij wiskundig minimaal zijn? Voorstel: goed genoeg, met eerst gelijke bedragen koppelen. Impact: laag
- Wie kiest de pincode? F-38 zegt "de organisator voegt een wachtwoordje toe". Voorstel: het script kiest willekeurig, de organisator verstuurt hem. Impact: laag

## Feedbackronde 2 (test 11 november)

Bron: `docs/bevindingen-test-2026-11-11.md` (BV-01 t/m BV-36), functionele test op de live app.
Beslissingen van David, vastgelegd op 11 november 2026 voor een onbewaakte run (fase 29 t/m 33).

- **BV-01 Weekend wijzigen.** Leg vast en Ander weekend kiezen staan voor de organisator ook op
  Weekendje prikker; Accommodaties beheren houdt ze. Losmaken mag tot en met de stap Meenemen, met
  de bestaande bevestiging. Vanaf Weekend zegt de melding hoe het wel kan, met een link naar Stappen
  (§7.6.8, ACC-7, AAN-81).
- **BV-16 Mobiel menu.** Alle zeven items tonen alleen hun icoon, het actieve ook zijn label;
  `aria-label` blijft de volle naam. Alles past binnen 360 pixels zonder horizontaal scrollen (NAV-12).
- **BV-17** Accommodatie krijgt een bed-icoon (NAV-12).
- **BV-18** Meenemen en Afrekening zijn in elke stap open, omdat uitgaven en meenemen vroeg kunnen
  beginnen; Weekendje prikker en Accommodatie houden "Komt in stap ...". Vast in §7.14 en de uitleg.
  Het bovenschrift boven een titel toont de schermnaam, niet de stap (NAV-15).
- **BV-25 Afronden.** "Naar Afgerond" vraagt een bevestiging met het aantal open betalingen. Betaling
  markeren en terugdraaien blijven na Afgerond mogelijk (uitzondering op AAN-29). Terug van Afgerond
  naar Afrekening kan, zoals §7.2.2 voor elke stap zegt. Het groepsbericht bij Afgerond noemt
  "afgerekend" alleen als niets meer open staat.
- **BV-26** Een korte bevestiging bij Naar Weekendje prikker als niet iedereen heeft ingevuld, en bij
  Naar Weekend of later als het weekend meer dan 7 dagen weg is (§7.2.7, AAN-88).
- **BV-29** Na onthullen van een verrassing ziet de groep alleen de geboekte accommodatie (ACC-10).
- **BV-30** De organisator kan bij een item "Toewijzen aan ..." kiezen; dat maakt een claim op naam
  van die deelnemer. Nieuwe regel in de rechtentabel §6, met een test in TOE-7 (MEE-10).
- **BV-32** AAN-06 blijft ongewijzigd. De bevinding staat als open punt in MEMORY.md voor David.
- **BV-04** `API_VERSIE` wordt 2 aan beide kanten, plus een test die faalt als `ACTIES` wijzigt zonder
  versieverhoging (§7.17, NFR-22).
- **BV-03** is opgelost (script bijgewerkt bij de uitrol van 11 november) en krijgt geen fase.
- **Overige bevindingen** volgen de verwachting in het bevindingenbestand. Waar die een keuze open
  liet, is er een aanname: AAN-89 (voorstel bij Nieuwe editie, BV-11) en AAN-90 (zelf inactief en
  dubbele naam, BV-15).

Fasen: 29 foutafhandeling en versie, 30 binnenkomen en Start, 31 navigatie en layout, 32 weekend en
stappen (hangt af van 31), 33 teksten, onderdelen en details.
