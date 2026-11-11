# Bevindingen functionele test 11 november 2026

Getest door Claude in Chrome op de live app (https://daafraaf.github.io/weekendje-weg/) als organisator David,
desktop (breed venster). Testeditie: zie per bevinding. Ernst: **B** = blokkeert een use case, **H** = hinderlijk of
klopt niet met de spec, **K** = klein of cosmetisch.

Werkwijze voor Claude Code: per bevinding de eis-ID's in de commit, een test die de fout eerst laat zien.

## Bevindingen

### BV-01 (H) Datum wijzigen: de knop staat ergens anders dan de uitleg zegt, en na Accommodatie kan het niet meer (Opgelost in fase 32)
Gemeld door David, nagespeeld in de testeditie. Drie dingen lopen door elkaar:
1. Vastleggen en Ander weekend kiezen staan alleen onder Beheren, Accommodaties beheren. Het scherm Weekendje prikker
   (menu) heeft voor de organisator geen enkele knop, terwijl de uitleg daar zegt "Kies het beste weekend en leg het
   vast. Bedacht je je? Met Ander weekend kiezen maak je het weer los." en §7.14 op dat scherm "Weekend vastleggen" belooft.
2. Vanaf de stap Meenemen staat er alleen "Het weekend kan alleen worden losgemaakt in de stappen Weekendje prikker en
   Accommodatie." Er staat niet bij dat je daarvoor de stap terug moet zetten (Beheren, Stappen), en ook niet waar.
3. Tot de scriptupdate van vandaag kende het live script `weekendLosmaken` niet (BV-03).
Verwacht: Leg vast en Ander weekend kiezen op Weekendje prikker voor de organisator (Accommodaties beheren mag blijven).
In latere stappen: een knop "Datum wijzigen" die uitlegt dat dit de stap terugzet, met bevestiging, of de melding met
een link naar Stappen. Overweeg losmaken in elke stap tot en met Meenemen toe te staan. Eis: ACC-1, ACC-7, AAN-81, UIT-2, §7.14.

### BV-02 (K) Het woord "null" staat op Start onder de route (Opgelost in fase 30)
Start, organisator, editie met één lopende editie. Onder de kaart "Zo gaat het weekend" staat de tekst `null`.
Oorzaak: `src/web/screens/start.js` regel ~74 `inhoud.replaceChildren(...)` krijgt `null` mee (route dicht,
`editieKeuze` zonder keuze of `aftelBlok` zonder datum). `replaceChildren` zet `null` om in tekst; `h()` filtert dat wel.
Fix: filter de kinderen (`.filter(Boolean)`) of wikkel ze in `h('div', ...)`. Controleer andere `replaceChildren`-aanroepen.
Eis: STA-3.

### BV-03 (B) Het live Apps Script loopt achter op de voorkant: wachtrij, top 3, losmaken en boeken werken niet
Formulier als David (deelnemer), editie "Claude test · Weekendje weg 2028". Tik op een weekend: het weekend springt
op ja, na een seconde terug naar leeg met de melding "Niet opgeslagen. Je wijziging is teruggezet. Veld verzoek.actie:
onbekende keuze." Een directe aanroep van het script laat zien welke acties het niet kent: `bundel`, `antwoordZetten`,
`weekendLosmaken`, `top3Opgeven`, `accommodatieBoeken`, `verrassingOnthullen`. Bekend zijn wel `antwoordenOpslaan`,
`weekendVastleggen`, `deelvormZetten`, `claimen`, `afvinken`, `postOpslaan`. De Sheet draait dus een script van vóór
fase 25, terwijl GitHub Pages fase 28 serveert. Gevolg: invullen, claimen (via de wachtrij), top 3, Ander weekend
kiezen, boeken en onthullen zijn allemaal stuk. Dit verklaart ook BV-01 voor een deel.
Actie (met David, CLAUDE.md): `clasp push` en `clasp deploy -i <id>` op de bestaande implementatie.
Eis: SYNC-2, ACC-7, ACC-10, ACC-11, ACC-13, NFR (uitrol).
Opgelost bij de uitrol van 11 november (script bijgewerkt); geen fase.

### BV-04 (H) API_VERSIE is niet opgehoogd bij nieuwe acties, dus de versiecheck van §7.17 slaat niet aan (Opgelost in fase 29)
`src/server/api.js` en `src/web/api.js` staan allebei op `API_VERSIE = 1`, terwijl fase 25 t/m 27 nieuwe acties
toevoegden. Een verouderd script geeft daardoor geen "Het script van deze groep is verouderd" maar een technische fout
per handeling (BV-03). Fix: verhoog `API_VERSIE` bij elke contractwijziging (nu naar 2) en voeg een check toe die faalt
als `ACTIES` wijzigt zonder versieverhoging (bijvoorbeeld een snapshot van de actielijst in een test). Eis: §7.17, AAN-14.

### BV-05 (H) Technische foutteksten komen bij de gebruiker terecht (Opgelost in fase 29)
"Veld verzoek.actie: onbekende keuze." (wachtrij) en "Veld data.tekst: te kort." (Eigen vragen, lege vraag opslaan)
staan letterlijk in beeld. Verwacht: een Nederlandse zin zonder veldnamen, bijvoorbeeld "Vul een vraag in." of "Deze
handeling kent het script nog niet. Vraag de eigenaar het script bij te werken." Map de `ongeldig`-meldingen in de
voorkant naar gewone taal of laat de validatie leesbare teksten geven. Eis: SYNC-5, EDI-3, NFR-12.

### BV-06 (H) Wachtwoordmanager vult "David" in het linkveld en breekt inloggen via een link (Opgelost in fase 30)
Open een persoonlijke link in Chrome met een wachtwoordmanager. Het pinscherm zet de link in het veld "Plak je
persoonlijke link", maar de wachtwoordmanager overschrijft dat met de gebruikersnaam ("David"). Gevolg: "Dit lijkt geen
persoonlijke link." en Inloggen blijft grijs; wie niet weet wat er gebeurt, komt niet binnen. Oorzaak: de zes
pinvakjes zijn `type="password"`, zodat het formulier als inlogformulier wordt gezien en het tekstveld als
gebruikersnaam. Fix: verberg het plakveld als er al een link in het fragment staat (alleen "Link herkend" tonen), en/of
maak de pinvakjes `type="text"` met `inputmode="numeric"`, `autocomplete="one-time-code"`/`off`, plus
`data-1p-ignore`, `data-lpignore="true"` en `data-bwignore` op beide velden. Eis: TOE-1, TOE-11.

### BV-07 (K) Na inloggen met een beheerlink landt de organisator op Leden (Opgelost in fase 30)
`src/web/app.js` regel ~465 stuurt een beheersessie naar `#/leden`. Verwacht: Start, waar de eerstvolgende actie staat
(STA-4). Eis: STA-3, STA-4.

### BV-08 (H) Eerstvolgende actie bij een nieuwe editie is "Herinnering sturen" terwijl er nog niemand is uitgenodigd (Opgelost in fase 30)
Nieuwe editie, stap Invullen, nog geen links gemaakt. Start toont als eerstvolgende actie "Herinnering sturen".
Verwacht: "Iedereen uitnodigen" (naar Uitnodigen) zolang niet alle deelnemers een link hebben, daarna pas herinnering.
Eis: STA-4, EDI-4.

### BV-09 (K) Beschrijving van Stappen in Beheren noemt nog verwachte datums
Beheren, item Stappen: "Stap, verwachte datums en deadline". Datums per stap zijn vervallen (EDI-8, §7.2.4).
Maak er "Stap en deadline" van.

### BV-10 (K) Teksten rond de deadline zeggen nog dat hij het invullen afsluit
Nieuwe editie: "Iedereen vult in tot de deadline" en "Tot en met deze dag (23:59) vult iedereen beschikbaarheid en
wensen in". Stappen: "Invullen kan nu tot dinsdag 15 december, 23:59". Herinnering: "Invullen kan tot ...". Volgens
DDL-1 is de deadline informatief. Maak er bijvoorbeeld "Graag ingevuld vóór ..." van, zoals op het formulier.

### BV-11 (K) Nieuwe editie neemt titel en periode over van de vorige editie
"Nieuwe editie" opent met de titel "Leid0n Test · Weekendje weg 2027" en jaar 2027 ingevuld, terwijl er al een editie
2027 is. Periode staat op 1 april tot 31 oktober in plaats van het kalenderjaar (§7.3.1, AAN-15). Verwacht: titel leeg
of "Weekendje weg <volgend jaar>", jaar = eerste jaar zonder editie, periode volgens AAN-15 (of pas de spec aan als
april-oktober bewust is). Bij het wisselen van jaar schuift de periode wel netjes mee.

### BV-12 (K) Keuzevraag met één antwoordoptie: niets gebeurt, oude fout blijft staan (Opgelost in fase 29)
Eigen vragen, type Eén keuze, één optie, Toevoegen. De vraag wordt niet toegevoegd, er komt geen nieuwe melding en de
fout van de vorige poging blijft staan. Verwacht: "Geef minstens twee antwoordopties." en de oude melding weg. Eis: EDI-3.

### BV-13 (K) Opslaan van een eigen vraag duurt ongeveer vijf seconden zonder duidelijke bezig-status in de knop (Opgelost in fase 29)
Na Toevoegen gebeurt er zichtbaar een tijd niets; het veld blijft gevuld tot het antwoord er is. Controleer SYNC-8
(`aria-busy` op de knop en "Opslaan…" in de kopregel) op dit scherm.

### BV-14 (K) Onbekende route toont Start maar laat het foute adres staan (Opgelost in fase 29)
`#/vragen` of `#/lijsten` toont Start terwijl de adresbalk het foute adres houdt. Verwacht: doorsturen naar `#/start`
(of een "Pagina niet gevonden"). Eis: NAV.

### BV-15 (K) De organisator kan zichzelf inactief maken
Leden: naast "David (jij)" staat de knop Inactief. Verwacht: niet beschikbaar voor jezelf, of een bevestiging met de
gevolgen. Er staat ook een tweede, inactieve "Rick" met dezelfde naam; overweeg een waarschuwing bij een dubbele naam.
Eis: GRP-5.

## Look and feel en mobiel

Mobiel getest op 390 × 760 (de app in een iframe van die breedte, zelfde sessie), desktop op 2560 × 1270.

### BV-16 (H) Mobiel: Afrekening valt buiten het onderste menu (Opgelost in fase 31)
Het onderste menu heeft zeven items van 60 px in een balk van 351 px. Afrekening staat helemaal buiten beeld, Meenemen
half ("Meenem"), en "Accommodatie" loopt in "Meenemen" over. Je kunt horizontaal scrollen, maar niets laat zien dat er
meer is. Verwacht: alle items zichtbaar. Opties: kortere labels (Prikker, Verblijf, Mee, Geld), alleen iconen met
het label van het actieve item, vijf items plus "Meer", of Voortgang en Invullen samenvoegen. Eis: NAV-10, STA-2.

### BV-17 (K) Start en Accommodatie hebben bijna hetzelfde icoon (een huisje) (Opgelost in fase 31)
In het zijmenu en het onderste menu lijken Start en Accommodatie op elkaar. Kies voor Accommodatie een bed of sleutel.

### BV-18 (H) Meenemen en Afrekening zijn al open in de stap Invullen, Weekendje prikker en Accommodatie niet (Opgelost in fase 31)
Als deelnemer in stap Invullen tonen Weekendje prikker en Accommodatie "Komt in stap ...", maar Meenemen toont de
volledige lijst met "Ik neem mee" en Afrekening de uitgaven. Dat is onlogisch naast de stappenbalk. Kies één lijn:
of elk scherm vóór zijn stap "Komt in stap ..." (eventueel met een voorproefje), of leg in de spec vast dat Meenemen
en Afrekening altijd open zijn en laat de uitleg dat zeggen. Op Meenemen staat bovendien "Invullen" als kopje
boven de titel, omdat de kop de stap toont en niet het scherm. Eis: NAV-10, §7.14.

### BV-19 (K) Desktop: smalle kolom met een los zwevend menu (Opgelost in fase 31)
Op een breed scherm is de inhoud ongeveer 590 px breed in het midden; het menu zweeft linksboven als losse kaart en de
profielknop staat helemaal rechtsboven, ver van de rest. De stappenbalk kort daardoor namen af ("Weekendj…",
"Accommo…"), terwijl er ruimte genoeg is. Voorstel: inhoud tot ±900 px op desktop of de stappenbalk breder dan de
kolom, menu verticaal uitgelijnd met de stappenbalk, en een kopregel met de app- of editienaam naast de profielknop.

### BV-20 (K) De editietitel staat twee keer bovenaan (Opgelost in fase 30)
Mobiel: in de uitgeklapte stappenbalk "Claude test · Weekendje weg 2028" en direct daaronder nog eens als kop (op Start)
of als bovenschrift (formulier). Eén keer is genoeg; laat de stappenbalk de titel weglaten of de kop.

### BV-21 (K) "Hoe werkt het?" is een volle brede knop direct onder de titel (Opgelost in fase 30)
Op Start neemt de knop de hele breedte in, boven de eerstvolgende actie. Hij trekt meer aandacht dan de actie zelf.
Maak er een kleine tekstlink of een (i) naast de titel van.

### BV-22 (K) "Je bent ingelogd." en Uitloggen onderaan Start (Opgelost in fase 30)
Uitloggen staat al in het profielmenu (NAV-8). De losse regel en knop onderaan Start voegen niets toe en ogen als
debugtekst. Weghalen.

### BV-23 (K) "Afgelopen weekenden" is een kale kop zonder inhoud of klapicoon (Opgelost in fase 30)
Bij een groep zonder afgeronde editie staat alleen de kop. Toon een pijltje (uitklapbaar, NAV-4) en bij leeg
"Nog geen afgelopen weekenden", of verberg de sectie als er niets is.

### BV-24 (K) De melding "Niet opgeslagen…" blijft na verversen staan (Opgelost in fase 29)
Na een mislukte wachtrij staat de balk "Niet opgeslagen. Je wijziging is teruggezet." ook na herladen nog onderaan,
op elk scherm. Na herladen is er niets meer terug te zetten; de melding hoort weg te zijn of "Opnieuw" moet echt iets
doen. Eis: SYNC-3, SYNC-5.

## Flow organisator (na de scriptupdate)

Doorlopen in "Claude test · Weekendje weg 2028": invullen (David via de app, vier anderen via de API), voortgang, per
persoon, Weekendje prikker, vastleggen, losmaken, opnieuw vastleggen, Accommodatie met drie opties, top 3 (vier via
de API, David via de app op mobiel), Verrassing, boeken, onthullen, twee posten, betaling markeren, Meenemen, alle
stappen tot Afgerond, Nieuwe editie vanuit Afgerond. Wat werkte: formulier slaat per veld op en blijft na herladen
staan, rangorde top 5 volgens AAN-06, punten 3-2-1, prijs per persoon, geen lek van de verrassing in zes leesschermen,
waarschuwing in Wie betaalt wat, restcent naar de betaler, saldi tellen op tot nul, hooguit n-1 betalingen,
"nog € 30,00 te verdelen" met Opslaan uit, organisator kan claim van een ander weghalen, nieuwe editie neemt leden,
lijsten en blokken over.

### BV-25 (H) Afgerond zonder bevestiging, terwijl er betalingen open staan; daarna kan niemand meer iets afvinken (Opgelost in fase 32)
Stappen, "Naar Afgerond" met 3 van 4 betalingen open: geen waarschuwing, geen bevestiging. Daarna is de afrekening
alleen-lezen en heeft Stappen geen "Terug naar Afrekening", dus open betalingen blijven voor altijd open. Het bericht
voor de groep zegt "is afgerond en afgerekend. Bedankt voor het mooie weekend!" terwijl er nog betaald moet worden en
het weekend nog 576 dagen weg is. Verwacht: bevestiging met het aantal open betalingen, betalingen markeren blijft na
Afgerond mogelijk (of terug naar Afrekening kan, §7.2.2 zegt één stap terug), en een tekst die klopt.
Eis: §7.2.2, GELD-9, EDI-7, AAN-29.

### BV-26 (K) Stappen vooruit zonder controle op de datum of de voortgang (Opgelost in fase 32)
Naar Weekendje prikker met 5 van 6 ingevuld, en naar Weekend en Afrekening ruim een jaar vóór het weekend: geen enkele
vraag. Een korte bevestiging ("Robin heeft nog niet ingevuld. Toch door?", "Het weekend is pas over 576 dagen.")
voorkomt een misklik. Eis: EDI-7.

### BV-27 (H) Groepsberichten en bevestigingen noemen onderdelen die uit staan
- Bericht bij Meenemen: "Kijk in de app wat je meeneemt, wanneer je kookt en met wie je rijdt." Kookbeurten en
  carpool staan uit (AAN-80).
- Bevestiging bij Ander weekend kiezen: "De datums bij de maaltijden en het programma verdwijnen". Maaltijden en
  programma staan uit.
Verwacht: teksten volgen `ONDERDELEN`, net als de uitleg (OND-2, UIT-2). Breid de test die dat voor de uitleg
controleert uit naar `src/shared/whatsapp.js` en de bevestiging in `accommodatie-beheer.js`.

### BV-28 (K) Bericht bij Accommodatie vraagt om een top 3 terwijl er nog geen opties zijn
De stap Accommodatie zetten maakt direct "Kijk in de app naar de opties en geef je top 3", ook met nul opties. Waarschuw
de organisator bij nul opties, of maak de tekst zonder opties anders ("de organisator zet binnenkort opties neer").

### BV-29 (K) Na onthullen ziet de groep ook de opties die niet geboekt zijn
Verrassing met drie opties, één geboekt, onthuld: een deelnemer krijgt alle drie de opties terug. Bij een verrassing
hoort alleen de geboekte te verschijnen (§7.6.6 noemt alleen de geboekte accommodatie). Eis: ACC-9, ACC-10.

### BV-30 (H) De organisator kan geen naam achter een item zetten
De uitleg bij Meenemen zegt voor de organisator: "zet daar desnoods een naam achter". Op het scherm heeft de organisator
alleen "Ik neem mee" en Verwijderen, geen manier om iemand anders in te delen. Bouw "Toewijzen aan…" of pas de uitleg
aan. Eis: UIT-2, MEE-2.

### BV-31 (K) Meenemen: "Uit eigen keuken" vraagt een categorie terwijl Boodschappen uit staat
Het invoerveld onder Uit eigen keuken heeft een keuzelijst met dertien supermarktcategorieën. Die heeft alleen zin met
de boodschappenlijst (uit, AAN-80). Verberg hem zolang het onderdeel uit staat. Eis: OND-2.

### BV-32 (K) Rangorde zet weekenden zonder nee boven weekenden met veel ja
Top 5: plek 5 is 14 tot 16 april met 0 ja en 1 misschien, terwijl 12 mei (3 ja, 1 nee) en 9 juni (3 ja, 1 nee) er niet
in staan. Een weekend dat bijna niemand invulde, wint zo van een weekend waar drie mensen ja zeiden. Dat volgt AAN-06
letterlijk, maar voelt verkeerd. Voorstel ter overweging: tel niet-ingevuld mee als onzeker, of sorteer op (ja − nee),
dan misschien. Beslissing voor David; daarna AAN-06 bijwerken.
Open punt voor David (MEMORY.md); AAN-06 blijft tot dan ongewijzigd.

### BV-33 (K) Eerstvolgende actie bij Afrekening heeft een dubbele kop (Opgelost in fase 30)
Start, stap Afrekening: "Eerstvolgende actie | Openstaande betalingen | Openstaande betalingen". Eén kop is genoeg.
Ook staat bij Afgerond nog "Nog 576 dagen tot het weekend", wat niet past bij een afgeronde editie.

### BV-34 (K) Wisselen naar Bedrag per persoon begint leeg
Een post met Gelijk (33,33 / 33,33 / 33,34), daarna Bedrag: alle velden zijn leeg en er staat "nog € 100,00 te
verdelen". Vul ze voor met de bedragen van de vorige verdeling, dan hoeft alleen het verschil aangepast. Eis: GELD-2.

### BV-35 (K) Trage grote acties zonder zichtbare voortgang bij de knop (Opgelost in fase 29)
Een item toevoegen, een eigen vraag toevoegen of de deelvorm wisselen duurt 5 tot 10 seconden. Alleen bovenaan staat
"Even geduld…"; de tekst blijft in het veld staan en de bevestiging ("Badminton set staat op de lijst.") verschijnt
boven de sectie, ver van het veld. Zet de bezig-status op de knop zelf en toon de bevestiging bij het veld. Eis: SYNC-8.

### BV-36 (K) Profielmenu toont geen naam (Opgelost in fase 30)
Het profielmenu zegt alleen "Organisator (beheer)". Met "David · organisator" weet je op een gedeeld apparaat meteen
wie er ingelogd is. Eis: NAV-2.
