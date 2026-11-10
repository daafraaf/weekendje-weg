# Opdracht feedbackronde (David, 10 november 2026)

Brontekst van de feedbackronde, ongewijzigd. Het plan staat in `docs/plan-feedbackronde.md`,
de uitwerking per sessie in `docs/fasen/fase-23.md` t/m `fase-28.md`. Bij verschil wint deze tekst,
behalve waar het plan een besluit van David noteert.

---

Je werkt in de repo van de Weekendje weg app. David heeft de app doorgeklikt als organisator en als deelnemer en heeft een lijst wijzigingen. Hieronder staat per onderwerp wat hij wil, wat het gedrag moet worden en wanneer het af is.

## Werkwijze

1. Lees eerst `CLAUDE.md`, `MEMORY.md` en de docs (bouwspec, aannames, fasen). Kijk hoe stappen, menu, accommodatie (ACC-1 t/m ACC-5, AAN-08, AAN-65) en het wegschrijven naar de Google Sheet nu gebouwd zijn.
2. Schrijf voordat je code aanraakt een kort plan: welke bestanden je wijzigt, welke eis-ID's je toevoegt of aanpast en in welke volgorde je de onderdelen hieronder oppakt. Leg het plan aan David voor en wacht op akkoord.
3. Geef nieuwe of gewijzigde eisen een ID in het bestaande domein (bijvoorbeeld ACC-6, STAP-x, SYNC-x) en werk de bouwspec en het aannameregister in de repo bij. Nieuwe aannames krijgen een AAN-nummer, staan op één plek in de code en hebben een test.
4. Werk per onderdeel: checks groen, commit met de eis-ID's in de boodschap, regel in het sessielog.
5. Twijfel je over de bedoeling, vraag het dan met een meerkeuzevraag, één onderwerp tegelijk. Gok niet bij keuzes die het datamodel in de Sheet raken.

Houd de bestaande vormgeving aan (luchtig, Liquid Glass, palet Zee en duin). Nieuwe schermen moeten eruitzien alsof ze er altijd bij hoorden.

## 1. Menu in de volgorde van de stappen

Het menu loopt nu niet gelijk met de stappen die een editie doorloopt. Nieuwe volgorde en namen:

1. Start
2. Invullen
3. Voortgang
4. Weekendje prikker (dit is het huidige Overzicht, hernoemd)
5. Accommodatie
6. Meenemen
7. Afrekening

Het stuk geld (wie betaalt wat) valt onder Afrekening, samen met de eindafrekening. Beheerfuncties voor de organisator blijven bereikbaar, maar geef ze een plek die de volgorde hierboven niet doorbreekt. Laat de namen van de stappen in de stappenbalk zo veel mogelijk aansluiten op de menunamen, zodat menu en stappenbalk hetzelfde verhaal vertellen. Stel een koppeling tussen stappen en menu-items voor in je plan.

Af als: het menu deze zeven items in deze volgorde toont, "Overzicht" nergens meer als label voorkomt en stappenbalk en menu dezelfde namen gebruiken.

## 2. Tijdelijk uit: boodschappen, kookbeurten, programma, kamerindeling, carpool

Deze onderdelen zijn voor nu te veel. Zet ze uit met een feature flag per onderdeel op één centrale plek. Code en data blijven bestaan, zodat ze later weer aan kunnen. In het menu verdwijnen ze of staan ze grijs met "later beschikbaar"; kies wat het rustigst oogt en leg het uit in je plan.

Wat wel blijft: deelnemers kunnen bij het invullen hun voorkeuren opgeven voor eten en voor wat ze willen doen. Dat zijn vrije tekstvelden, optioneel. De organisator ziet deze voorkeuren terug, bijvoorbeeld in Weekendje prikker of Voortgang.

De kern waar de aandacht naartoe gaat: data prikken, voortgangsbewaking, het overzicht, wie betaalt wat, de afrekening, accommodatie en wat ieder zelf meeneemt.

Af als: de vijf onderdelen met één vlag per onderdeel aan en uit kunnen, uit staan, en de voorkeuren voor eten en activiteiten bij Invullen staan en terugkomen bij de organisator.

## 3. Invullen minder rigide

De invulstap vraagt nu te veel verplichte gegevens. Maak het vrijer: alleen wat strikt nodig is om data te kunnen prikken blijft verplicht (de beschikbaarheid), de rest wordt optioneel. Iemand moet ook gedeeltelijk kunnen invullen, opslaan en later verder kunnen.

Deadlines: alleen de stap Invullen krijgt een deadline. Die is informatief. De organisator stelt hem in, deelnemers zien hem bij het invullen ("graag ingevuld voor vrijdag 21 november"). Er gebeurt niets technisch als de deadline verstrijkt: geen blokkade, geen automatische herinnering, geen statuswissel. Het herinneren van mensen die nog niet hebben ingevuld doet de organisator zelf, buiten de app. Haal deadlines bij de andere stappen (Weekendje prikker, accommodatie, voorbereiding, weekend, afrekenen, afgerond) weg uit de schermen en uit de logica. Bestaande deadlinewaarden in de Sheet mogen blijven staan maar worden genegeerd.

Af als: een deelnemer met alleen beschikbaarheid kan opslaan, de deadline alleen bij Invullen zichtbaar is en het verstrijken ervan niets blokkeert.

## 4. Stappenbalk klopt bij elke rol

Als de organisator vanuit beheer een stap verder zet en daarna een deelnemer bekijkt, toont de stappenbalk bovenin bij de deelnemer een andere stap dan waar de editie werkelijk in zit. De huidige stap van een editie moet één bron hebben (de editie in de Sheet) en elke weergave, voor organisator en deelnemer, leest die bron. Geen eigen tussenstand per scherm of per rol.

Af als: na het verzetten van de stap in beheer elke rol en elk scherm na verversen dezelfde stap toont, met een test die dit controleert.

## 5. Uitleg van de stappen

Organisatoren en deelnemers moeten snel snappen welke stappen er zijn, wat er in elke stap gebeurt en wat het doel is. Maak dit op twee plekken:

* Op de startpagina bij het eerste bezoek een korte, vrolijke uitleg van de route van het weekend (bijvoorbeeld als kaartjes of een kleine tijdlijn). Per stap: naam, één zin wat er gebeurt, wat het oplevert en wat er van jou verwacht wordt, apart voor organisator en deelnemer waar dat verschilt. Te sluiten, en daarna niet opnieuw opgedrongen.
* Altijd terug te vinden in de app, bijvoorbeeld via een "Hoe werkt het" op Start en een klein info-icoon bij de stappenbalk dat de uitleg van de huidige stap toont.

Houd de teksten kort, in gewoon Nederlands, met een knipoog. De uitgezette onderdelen uit punt 2 komen niet in de uitleg voor.

Af als: een nieuwe gebruiker bij het eerste bezoek de uitleg ziet, die kan sluiten, en de uitleg daarna vanaf Start en vanaf de stappenbalk terug kan halen.

## 6. Weekend vastleggen

Nadat de organisator een weekend heeft vastgelegd, kan hij nu nog steeds andere weekenden vastleggen. Nieuw gedrag:

* Na vastleggen blijft het gekozen weekend duidelijk gemarkeerd. De vastlegknoppen bij de andere weekenden worden grijs en zijn niet te gebruiken.
* Er komt een duidelijke uitweg: "Ander weekend kiezen". Die vraagt om bevestiging, maakt het vastgelegde weekend weer los en zet de andere opties weer open. Daarna kan de organisator opnieuw vastleggen.
* Kijk wat er afhangt van het vastgelegde weekend (bijvoorbeeld accommodatie) en laat in de bevestiging zien wat de wijziging raakt.

Af als: er na vastleggen maar één weekend vast kan staan, de andere opties uitgeschakeld zijn en wijzigen alleen via de uitweg met bevestiging gaat.

## 7. Accommodatie: verrassing of samen kiezen

De huidige deelvormen (info, stemmen, geboekt) maken plaats voor een eenvoudiger keuze die de organisator per editie maakt, nadat hij zelf heeft gezocht op basis van wat de deelnemers hebben ingevuld:

* Verrassing. De organisator kiest en boekt zelf. Deelnemers zien alleen dat de accommodatie geregeld is ("Het wordt een verrassing"), zonder naam, adres of link. De organisator kan de verrassing op een moment naar keuze onthullen; daarna zien deelnemers de gegevens.
* Samen kiezen. De organisator voert een paar opties in die hij heeft gevonden (naam, link, prijs, korte notitie). Elke deelnemer geeft een top 3 op (of minder als er minder opties zijn). De app telt dat op met 3, 2 en 1 punt en toont de organisator een ranglijst met per optie de punten en hoeveel mensen hun voorkeur hebben gegeven. Deelnemers zien de stand zonder namen. Opnieuw opgeven vervangt de eerdere keuze. De organisator legt daarna de gekozen accommodatie vast als geboekt.

Wat blijft: de organisator kan accommodaties toevoegen, bewerken en verwijderen. Een verwijderde optie neemt zijn voorkeuren mee. Was het de geboekte, dan valt de editie terug naar de stand "nog geen accommodatie gekozen" (pas AAN-65 daarop aan). Wisselen tussen verrassing en samen kiezen mag zolang er niets geboekt is; ingevoerde voorkeuren blijven dan bewaard.

Bestaande data: zet de oude deelvormen om naar de nieuwe (info en stemmen worden samen kiezen, geboekt blijft geboekt) en beschrijf de omzetting in je plan. De schermen voor accommodatie zijn nooit ontworpen; ontwerp ze nu in de stijl van de rest van de app en laat David een schets of screenshot zien voordat je ze afbouwt.

Af als: de organisator per editie kan kiezen tussen verrassing en samen kiezen, deelnemers bij verrassing geen details zien tot de onthulling, de top 3 correct punten telt en verwijderen en wisselen zich gedragen zoals hierboven.

## 8. Snelle bediening zonder wachten op de Sheet

Bij grote formulieren zoals Meenemen voelt elke klik traag, omdat de app wacht tot de Google Sheet het wegschrijven bevestigt. Pas dit aan volgens het volgende principe.

Laden van een pagina mag een laadindicator tonen. Dan is er nog niets om naar te kijken, dus wachten is acceptabel.

Kleine handelingen (iets aanvinken bij Meenemen, een tag toevoegen of weghalen, een voorkeur kiezen, een stem of top 3 opgeven) werken optimistisch:

* De wijziging staat direct in beeld en in de lokale stand. Geen blokkerende spinner, geen uitgeschakelde knoppen.
* Wijzigingen gaan in een wachtrij die op de achtergrond naar de Sheet schrijft. Bundel snelle opeenvolgende wijzigingen (korte debounce, bijvoorbeeld 800 ms tot 1,5 s) tot één aanroep, zodat de Sheet niet per klik wordt aangesproken.
* Bewaar de wachtrij in localStorage (met try/catch), zodat niets verloren gaat bij een slechte verbinding of het per ongeluk sluiten van het tabblad. Bij de volgende keer openen wordt de wachtrij alsnog verstuurd.
* Toon één rustige synchronisatie-indicator op een vaste plek: "Opslaan…", "Opgeslagen", of bij problemen "Niet opgeslagen, opnieuw proberen". Geen meldingen per klik.
* Bij een fout: automatisch opnieuw proberen met oplopende wachttijd. Lukt het definitief niet, draai de wijziging terug in beeld en laat een korte melding zien met de mogelijkheid het opnieuw te doen.
* Waarschuw bij het verlaten van de pagina als er nog wijzigingen onderweg zijn.
* Twee mensen die tegelijk iets wijzigen: per regel of cel wint de laatste schrijfactie. Schrijf per item, niet hele lijsten in één keer over, zodat iemand anders zijn vinkje niet kwijtraakt. Gebruikt de backend Apps Script, zet dan een lock om het schrijven.

Grote, bewuste acties (een weekend vastleggen, accommodatie boeken, de stap van de editie verzetten, de afrekening afsluiten) blijven wachten op bevestiging van de Sheet, met een duidelijke bezig-status op de knop. Daar wil je zeker weten dat het gelukt is.

Bouw dit als één gedeelde laag (een kleine store plus schrijfwachtrij) die alle schermen gebruiken, en zet Meenemen er als eerste op. Leg in je plan uit welke handelingen optimistisch worden en welke blijven wachten.

Af als: aanvinken bij Meenemen direct reageert zonder spinner, een reeks snelle klikken in een paar aanroepen naar de Sheet gaat, na verversen alles is opgeslagen, en een gesimuleerde netwerkfout netjes opnieuw wordt geprobeerd en zichtbaar wordt gemeld.

## Volgorde

Voorstel, pas aan als de code daar aanleiding toe geeft:

1. Stappenbalk één bron (4) en menu (1), omdat de rest daarop leunt.
2. Onderdelen uitzetten (2) en invullen vrijer (3).
3. Weekend vastleggen (6).
4. Synchronisatielaag (8).
5. Accommodatie (7), met schets vooraf.
6. Uitleg van de stappen (5), als laatste, zodat de teksten kloppen met wat er dan staat.

Sluit af met een korte lijst voor David: wat is gewijzigd per eis-ID, welke aannames nieuw zijn en wat hij zelf moet testen op telefoon en laptop.
