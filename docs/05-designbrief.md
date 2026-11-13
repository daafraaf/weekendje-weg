# Designbrief Weekendje weg

Versie 0.4, 13 november 2026 (ontwerp bijgewerkt dezelfde dag, zie §9). Achteraf bijgewerkt naar de code van 11 november (fase 20 t/m 33,
spec 0.11, aannames 0.28), plus één nieuwe wens: op mobiel swipe je door de maanden van de
kalender (§5.1). Het ontwerp in Claude Design (https://claude.ai/artifact/VUKgkd2jpwbnuTNf8LY7hr
en `design/`) is op 13 november bijgewerkt naar de app en §5.1.

Bij strijd geldt de code: `src/web/css/tokens.css` voor de tokens, de spec voor gedrag.

Na het ontwerp besloten: de kalender is een jaarkalender (maandbladen, weekend als balk over
vr, za en zo) over het kalenderjaar van de editie, en de schoolvakanties van alle regio's
staan zonder regiokeuze in beeld (spec §7.3, AAN-15).

## 1. Context

Een installeerbare webapp voor een vriendengroep die één weekend per jaar weggaat. Een
editie loopt van invullen tot afrekenen in zeven stappen. De meeste mensen gebruiken hem op
de telefoon (iPhone en Android), de organisator ook op de laptop. Het publiek is
ICT-onderlegd en kritisch: geen speelgoed, wel prettig.

## 2. Ontwerpprincipes

1. **Luchtig en strak.** Veel ruimte, weinig lijnen, één duidelijke actie per scherm.
2. **Invullen gaat voor sfeer.** Formulieren staan op een stevige, rustige ondergrond en zijn
   met één duim te bedienen.
3. **Je weet altijd waar je bent.** De stappenbalk is het anker van elk scherm.
4. **Glas waar het richting geeft.** Liquid Glass alleen op lagen die boven de inhoud
   zweven.
5. **Privacy zichtbaar maken.** Waar iets alleen voor de organisator is, staat dat er rustig
   bij.

## 3. Merk en visuele taal

- **Stijl:** in de geest van Apple Liquid Glass. Doorschijnende, matglazen panelen met
  achtergrondvervaging (`backdrop-filter`), zachte lichtrand, ronde hoeken en subtiele diepte,
  boven een rustige achtergrond die door het glas schemert.
- **Glas op:** stappenbalk, menu en navigatie, kaarten (startscherm, accommodaties, posten),
  toasts en de knop "Uitgave toevoegen".
- **Geen glas op:** formuliervelden en lange lijsten; die krijgen een stevige, bijna
  ondoorzichtige achtergrond. Tekst op glas houdt minimaal AA-contrast, ook boven de
  drukste plek van de achtergrond.
- **Licht en donker:** volgt het apparaat (`prefers-color-scheme`), beide even verzorgd.
- **Palet:** Zee en duin. Fris blauw met zand, accent in de lijn van Apple-blauw.
- **Achtergrond:** een effen verloop van lucht (boven) naar zand (onder), vast over de hele
  app. Geen vlekken, illustraties of foto's. Het glas leunt dus op vervaging, lichtrand en
  schaduw; de vulling mag daardoor iets zichtbaarder zijn dan bij een drukke achtergrond.
- **Kleuren:** zoals ze nu in de code staan. Het accent is in de bouw donkerder gezet dan in
  het ontwerp (was #1F6FB8 en #5AA3E6) voor meer contrast op glas. Nieuw zijn zand voor
  schoolvakanties, paars voor feestdagen en lange weekenden, en de heatmapreeks `--h0` t/m
  `--h6` in zeegroen. Gemeten op glas boven het lichtste en donkerste punt van het
  verloop.

  | Token | Licht | Donker | Contrast |
  |---|---|---|---|
  | `--bg-top` (lucht) | #EAF2FA | #0F1620 | |
  | `--bg-bottom` (zand) | #F5ECDD | #1C1A16 | |
  | `--glass-fill` | wit 55% | wit 8% | |
  | `--glass-border` | wit 70% | wit 16% | |
  | `--glass-blur` | 20px | 20px | |
  | `--glass-shadow` | 0 8px 24px #13202D 8% | 0 8px 24px zwart 30% | |
  | `--surface-solid` (velden, lijsten) | wit 92% | #161E28 92% | |
  | `--text-primary` | #13202D | #E8EEF5 | 15,3 / 11,9 |
  | `--text-secondary` | #4E5C6A | #A6B3C1 | 6,4 / 6,5 |
  | `--accent` | #175891 | #7AB8EE | als tekst 6,9 / 6,6 |
  | `--on-accent` | #FFFFFF | #0F1620 | 7,4 / 8,6 |
  | `--zand` (schoolvakantie) | #EBDDBF | #3A3326 | |
  | `--feest` (feestdag, lang weekend) | #6F5496 | #B79CE0 | 5,3 / 7,3 op zand |

- **Statuskleuren:** Zee en duin-tinten, altijd met symbool. In licht zijn zeegroen en koraal
  iets donkerder gezet dan de eerste keuze (#1F8A7A en #D2604F), zodat een wit symbool erop
  AA haalt.

  | Status | Symbool | Licht (symbool) | Donker (symbool) |
  |---|---|---|---|
  | Ja (zeegroen) | ✓ | #18766A (wit, 5,5) | #3FB3A1 (#0F1620, 7,1) |
  | Misschien (zand) | ~ | #D9A441 (#13202D, 7,3) | #E6B95C (#0F1620, 9,9) |
  | Nee (koraal) | ✕ | #B94A3B (wit, 5,1) | #E57C6B (#0F1620, 6,4) |
  | Niet ingevuld | stippelrand | rand #7A8591 (3,2 op zand) | rand #6B7682 (3,5) |

  In de heatmap loopt de dichtheid van weinig naar veel overlap in sterktes van zeegroen; de
  getallen staan er altijd bij.
- **Typografie:** systeemlettertype (`-apple-system`, `Segoe UI`, `Roboto`); geen externe
  fonts (CSP).
- **Beweging:** kort en zacht, respecteert `prefers-reduced-motion`.
- **Fallback:** waar `backdrop-filter` ontbreekt een effen, half-doorzichtige vulling.

## 4. Layout

- **Kopregel:** links de editienaam (op desktop), rechts de synchronisatie-indicator ("Opslaan…",
  "Opgeslagen", "Niet opgeslagen, opnieuw proberen") en de profielknop. Het profielmenu toont naam
  en rol ("David · organisator"), Uitleg, Installeren en Uitloggen (NAV-2, SYNC-4).
- **Stappenbalk:** zeven stappen Invullen, Weekendje prikker, Accommodatie, Meenemen, Weekend,
  Afrekening en Afgerond, zonder datums. Met een info-icoon dat de uitleg van de huidige stap
  opent (UIT-4). De titel van de editie staat één keer bovenaan (NAV-15).
- **Menu:** altijd Start, Invullen, Voortgang, Weekendje prikker, Accommodatie, Meenemen en
  Afrekening, met een stip bij de huidige stap. Beheren staat los daaronder (NAV-9, NAV-10).
  Een scherm dat nog niet aan de beurt is, zegt rustig "Komt in stap …".
- **Mobiel (360 tot 767 pixels):** stappenbalk bovenaan als compacte glasstrook (huidige stap
  met vorige en volgende, uitklapbaar), inhoud in één kolom, menu als glazen balk onderaan met
  alleen iconen; het actieve item toont ook zijn label en Beheren is het achtste icoon. Past
  vanaf 360 pixels zonder horizontaal scrollen. Accommodatie heeft een bed, Start een huisje
  (NAV-12).
- **Desktop:** menu links als glazen kolom, uitgelijnd met de stappenbalk; inhoud tot ongeveer
  900 pixels breed; stapnamen voluit zolang er ruimte is (NAV-14). Open punt uit de bouw: de
  desktopindeling begint nu bij 768 pixels in plaats van 1024, en tussen 768 en 1199 pixels
  worden stapnamen nog afgekort.
- Tikdoelen minimaal 44 × 44 pixels (`--tap-min`). Veilige zones van iOS
  (`env(safe-area-inset-*)`) in de standalone-modus.

## 5. Schermen

Toestanden per scherm: leeg, laden, fout (inclusief "druk" en "geen verbinding"), vol,
alleen-lezen. Kleine handelingen (afvinken, claimen, formuliervelden, tags, top 3) staan meteen
in beeld zonder lader; grote acties krijgen een bezig-status in hun eigen knop (SYNC-1, SYNC-8).

| Scherm | Doel | Eis-ID's |
|---|---|---|
| Link plakken en pincode | Binnenkomen met link en zes cijfers, blokkade tonen | TOE-1 t/m 4, TOE-11, TOE-13 |
| Beheerlogin | Wachtwoord kiezen of invoeren | TOE-5 |
| Rondleiding | Vijf schermen met installatie per apparaat, via Uitleg in het profielmenu | RON-1 t/m 4, NAV-6 |
| Opzetwizard | Eigenaar zet de groep op met een opzetlink | GRP-1, GRP-2, GRP-4, GRP-6 t/m 8, RON-5 |
| Start deelnemer en organisator | Kaart "Zo gaat het weekend" bij eerste bezoek, eerstvolgende actie, aftelteller, Afgelopen weekenden | STA-3 t/m 5, STA-9, UIT-1 t/m 3, NAV-4 |
| Invullen | Kalender (§5.1) en wensblokken, alles behalve één weekend optioneel, deadline informatief | FRM, KAL, TAG, DDL-1, OND-3 |
| Voortgang | Wie heeft ingevuld, herinnering | OVZ-1, OVZ-2 |
| Weekendje prikker | Heatmap, top 5, bandbreedtes, Leg vast en Ander weekend kiezen | OVZ-3 t/m 5, ACC-1, ACC-6, ACC-7 |
| Per persoon | Alles per persoon voor de organisator, met tags | OVZ-6, TAG-9 |
| Accommodatie | Verrassing ("✓ Geregeld" tot onthullen) of Samen kiezen met top 3 en ranglijst | ACC-8 t/m 14 |
| Meenemen | Twee tabs: Wie neemt wat mee (claimen en toewijzen) en Boodschappen | MEE-1 t/m 4, MEE-10, MEE-11 |
| Boodschappen | Wensen op de lijst zetten met naam en categorie, open vanaf een vastgelegd weekend tot de organisator hem definitief maakt | MEE-5 t/m 9, MEE-12, MEE-13 |
| Afrekening | Twee tabs: Wie betaalt wat (posten, uitgave toevoegen) en Eindafrekening | GELD, NAV-11 |
| Beheren | Overzicht met Leden, Nieuwe editie, Uitnodigen, Lijsten, Vragen, Per persoon, Stappen, Accommodaties beheren | NAV-9, EDI, GRP-5 |
| Archief | Edities door de jaren | ARC |

Uitgezet en dus niet in beeld (OND-1, AAN-80): Kookbeurten, Programma, Kamers en Carpool.
Boodschappen staat sinds 13 november weer aan, als tab onder Meenemen (spec §7.8.9 t/m 11). Hun ontwerpen blijven bewaard voor als een onderdeel weer aangaat.

### 5.1 Kalender op mobiel: swipen door de maanden

Nieuw na de bouw. Opgenomen in spec 0.12 (§7.3.7, KAL-8 t/m KAL-12) en aannames 0.29 (AAN-91 en
AAN-92), te bouwen in fase 34.

- **KAL-8 Eén maand per keer.** Onder 768 pixels staan de maandbladen naast elkaar in een
  horizontale strook, één maand per schermbreedte. Van rechts naar links swipen gaat naar de
  volgende maand, andersom naar de vorige. Gebouwd met gewone scroll-snap
  (`scroll-snap-type: x mandatory`, `overscroll-behavior-x: contain`), zonder eigen
  veegbibliotheek, zodat verticaal scrollen van de pagina gewoon blijft werken. Vanaf 768 pixels
  verandert er niets.
- **Het maandblad zelf blijft gelijk.** Tikken op een weekend wisselt leeg, ja, misschien, nee;
  Hele maand, de voorkeursmaand met ster, schoolvakanties, feestdagen en de notities onder de
  maand werken zoals nu. Een veeg wisselt nooit een weekend.
- **KAL-9 Pijltjes en jaarstrook.** De maandkop krijgt links en rechts een pijl (44 × 44,
  `aria-label` "Vorige maand: januari", "Volgende maand: maart"); op de eerste en laatste maand
  valt de pijl aan die kant weg. De jaarstrook boven de kalender wordt tikbaar: een tik op een
  maandkolom springt naar die maand, en de maand die in beeld is, heeft in de strook een rand in
  accentblauw.
- **KAL-10 Startmaand (AAN-91).** De kalender opent op de eerste maand met een leeg weekend.
  Is alles ingevuld of is de kalender alleen-lezen, dan op de eerste maand van de periode.
- **KAL-11 Een animatie laat zien dat swipen kan (AAN-92).** De eerste keer dat de kalender op
  een apparaat in beeld komt, schuift het maandblad na ongeveer een halve seconde zo'n 48 pixels
  naar links, zodat het begin van de volgende maand even te zien is, en veert dan zacht terug
  (samen ongeveer 0,8 seconde). Dat gebeurt één keer; de vlag `ww-swipe-gezien` in localStorage
  (altijd in try/catch) gaat ook aan na de eerste eigen veeg of pijltik. Er staat geen vast
  randje van de volgende maand. Met `prefers-reduced-motion` beweegt er niets en staat onder de
  maandkop de tekst "Veeg naar links voor de volgende maand" tot de eerste wissel.
- **KAL-12 Toetsenbord en schermlezer.** Met Tab door de weekenden schuift de maand van het
  gefocuste weekend vanzelf in beeld. Bij elke wissel meldt een `aria-live`-regel de maand
  ("Februari 2027, 4 weekenden, 2 leeg"). De teller en de jaarstrook blijven over het hele jaar
  tellen.
- **Hoogte.** Elk blad reserveert zes weekrijen, zodat de rest van het formulier niet springt
  bij een wissel. Alleen de notities onder de maand verschillen in hoogte.
- **Bereik.** Geldt voor de invulkalender (component `kalender`). De heatmap in Weekendje
  prikker blijft zoals hij is.

## 6. Voorbeelddata

De demodata uit spec §11: groep "Studievrienden" met Anne, Bas, Daan, Eva, Joris en Sanne,
editie 2027 in elke stap.

## 7. Toegankelijkheid

WCAG 2.1 AA. Toetsenbord voor alle bediening, zichtbare focus (ook op glas), labels bij elk
veld, ja/misschien/nee nooit alleen met kleur, contrast getest in licht en donker.

## 8. Wat we terug willen

Tokens als CSS-variabelen (licht en donker, inclusief glas: vulling, vervaging, rand,
schaduw), componentnamen die aansluiten op `src/web/components/` (stappenbalk, kalender, schuif, drieknop,
vinkjeslijst, verdeelinvoer, menu, en sinds de bouw ook tagveld, hint, profielmenu, sync,
tabs, weekendkeuze, startblokken, route, komtin en vraag), en alle schermen uit §5
in licht en donker, mobiel en desktop. Plus een app-icoon voor het manifest (192, 512 en
maskable): een afgerond kalenderblaadje met een vinkje, in accentblauw op het lucht-zand-verloop
van de achtergrond. Het vinkje blijft herkenbaar op 48 pixels en binnen de veilige zone van
het maskable-formaat.

## 9. Verschil met het ontwerp van 9 november

Bijgewerkt op 13 november: het canvas en `design/` lopen weer gelijk met de app op alle punten
hieronder, inclusief de swipe-kalender van §5.1 (`Formulier.dc.html`, interactief). Zie
`design/README.md` voor wat er per artboard veranderd is.

Wat in Claude Design opnieuw moest om weer gelijk te lopen met de app:

- **Tokens** (`Tokens.dc.html`, `tokens.css`): accent #175891 en #7AB8EE, plus zand, feest en
  de heatmapreeks.
- **Navigatie en kopregel** (`Main`, alle schermen): zeven vaste menu-items met de nieuwe
  namen, Beheren apart, mobiel alleen iconen met het actieve label, bed voor Accommodatie,
  profielknop en synchronisatie-indicator rechtsboven, info-icoon bij de stappenbalk.
- **Start** (`StartOrganisator`, `D-StartOrganisator`): kaart "Zo gaat het weekend", link
  "Hoe werkt het?", Afgelopen weekenden uitklapbaar, geen ingelogd-regel.
- **Formulier** (`Formulier`, `D-Formulier`): kalender volgens §5.1, tagvelden, alles optioneel
  behalve één weekend, deadline als "Graag ingevuld vóór …".
- **Overlap** wordt Weekendje prikker (`Overlap`, `D-Overlap`), met Leg vast en Ander weekend
  kiezen.
- **Accommodaties**: twee vormen, Verrassing en Samen kiezen met top 3, ranglijst en bedden.
- **Afrekening en Posten**: één scherm met twee tabs.
- **Nieuw te tekenen:** Beheren-overzicht, Stappen met bevestiging bij een stap vooruit,
  profielmenu, synchronisatie-indicator in drie toestanden.
- **Op de plank:** Boodschappen, Kookbeurten, Programma en KamersCarpool hoeven niet bij.
