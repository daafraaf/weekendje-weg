# Designbrief Weekendje weg

Versie 0.3, 9 november 2026, bij bouwspec versie 0.3. Palet gekozen: Zee en duin, met een
effen verloop als achtergrond. Het ontwerp staat in Claude Design:
https://claude.ai/artifact/VUKgkd2jpwbnuTNf8LY7hr, en als bestanden in `design/`.

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
- **Kleuren:** startwaarden hieronder. Claude Design mag ze verfijnen, mits de contrasten in
  de rechterkolom blijven staan. Gemeten op glas boven het lichtste en donkerste punt van het
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
  | `--accent` | #1F6FB8 | #5AA3E6 | als tekst 4,9 / 5,2 |
  | `--on-accent` | #FFFFFF | #0F1620 | 5,2 / 6,8 |

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

- **Mobiel (360 tot 767 pixels):** stappenbalk bovenaan als compacte glasstrook (huidige stap
  met vorige en volgende, uitklapbaar), inhoud in één kolom, menu als glazen balk onderaan.
- **Desktop (vanaf 768 pixels):** stappenbalk volledig bovenaan, menu links als glazen kolom,
  inhoud maximaal 960 pixels breed.
- Tikdoelen minimaal 44 × 44 pixels. Veilige zones van iOS (`env(safe-area-inset-*)`) in de
  standalone-modus.

## 5. Schermen

Toestanden per scherm: leeg, laden, fout (inclusief "druk" en "geen verbinding"), vol,
alleen-lezen.

| Scherm | Doel | Eis-ID's |
|---|---|---|
| Link plakken en pincode | Binnenkomen met link en zes cijfers, blokkade tonen | TOE-1 t/m 4, TOE-11 |
| Beheerlogin | Wachtwoord kiezen of invoeren | TOE-5 |
| Rondleiding | Vijf schermen met installatie per apparaat | RON-1 t/m 4 |
| Opzetwizard | Eigenaar zet de groep op | GRP-2, GRP-4, RON-5 |
| Startscherm deelnemer | Meebewegen met de stap, aftelteller | STA-3, STA-5 |
| Startscherm organisator | Voortgang en eerstvolgende actie | STA-4 |
| Formulier | Kalender en alle blokken | FRM, KAL |
| Kalender (component) | Weekenden met drie waarden, voorkeursmaand, vakanties | KAL-1 t/m 7 |
| Voortgang | Wie heeft ingevuld, herinnering | OVZ-1, OVZ-2 |
| Overlapoverzicht | Heatmap, top 5, bandbreedtes | OVZ-3 t/m 5 |
| Detailoverzicht | Alles per persoon voor de organisator | OVZ-6 |
| Editie nieuw en uitnodigen | Wizard en links met pincodes | EDI-1, EDI-4 |
| Accommodaties | Info, stemmen of geboekt | ACC |
| Wie neemt wat mee | Drie secties met namen | MEE-1 t/m 4 |
| Boodschappenlijst | Supermarktvolgorde, afvinken, kopiëren | MEE-5 t/m 9 |
| Kookbeurten | Maaltijden, koks, ingrediënten | KOK |
| Programma | Tijdlijn per dag | PRG |
| Kamers en carpool | Indeling en ritten | KMR, CAR |
| Posten en verdeling | Uitgave toevoegen met drie verdeelwijzen | GELD-1 t/m 7 |
| Afrekening | Betalingen, afvinken, betaalverzoek | GELD-8 t/m 10 |
| Archief | Edities door de jaren | ARC |

## 6. Voorbeelddata

De demodata uit spec §11: groep "Studievrienden" met Anne, Bas, Daan, Eva, Joris en Sanne,
editie 2027 in elke stap.

## 7. Toegankelijkheid

WCAG 2.1 AA. Toetsenbord voor alle bediening, zichtbare focus (ook op glas), labels bij elk
veld, ja/misschien/nee nooit alleen met kleur, contrast getest in licht en donker.

## 8. Wat we terug willen

Tokens als CSS-variabelen (licht en donker, inclusief glas: vulling, vervaging, rand,
schaduw), componentnamen die aansluiten op `src/web/components/` (stappenbalk, kalender,
schuif, drieknop, vinkjeslijst, verdeelinvoer, kaart, toast, menu), en alle schermen uit §5
in licht en donker, mobiel en desktop. Plus een app-icoon voor het manifest (192, 512 en
maskable): een afgerond kalenderblaadje met een vinkje, in accentblauw op het lucht-zand-verloop
van de achtergrond. Het vinkje blijft herkenbaar op 48 pixels en binnen de veilige zone van
het maskable-formaat.
