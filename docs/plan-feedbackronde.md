# Plan feedbackronde (november 2026)

Status: klaar om te bouwen. Opdracht: `docs/feedbackronde-opdracht.md`. Uitwerking per sessie:
`docs/fasen/fase-23.md` t/m `fase-28.md` (één fase per sessie). Per fase: `npm run check` groen,
commit met eis-ID's, overdracht, regel in het sessielog. Spec (§5, §7, §8) en aannameregister gaan
mee in dezelfde commit.

## Fasen

| Fase | Onderdeel | Opdracht |
|---|---|---|
| 23 | Stappenbalk één bron en menu | 4, 1 |
| 24 | Onderdelen uit en invullen vrijer | 2, 3 |
| 25 | Weekend vastleggen | 6 |
| 26 | Synchronisatielaag | 8 |
| 27 | Accommodatie (schets eerst, dan stoppen tot David akkoord geeft) | 7 |
| 28 | Uitleg van de stappen | 5 |

## Keuzes van David (bevestigd 10 november 2026)

Alle vier volgens de aanbeveling (1a, 2a, 3a, 4a). Deze besluiten gaan voor op de opdracht.

| # | Keuze | Besluit | Fase |
|---|---|---|---|
| K1 | Opslag top 3 en onthulling | rij per keuze in `Stemmen` met kolom `rang`, kolom `Edities.onthuld`; Store voegt ontbrekende kolommen toe | 27 |
| K2 | Voorkeuren eten en doen | vinkjes uit de editielijsten plus tags, alles optioneel; geen vrije tekstvelden (wijkt bewust af van de opdracht); organisator houdt tellingen en per persoon | 24 |
| K3 | Ander weekend kiezen met een boeking | boeking blijft staan, bevestiging waarschuwt dat hij bij de oude datum hoort | 25 |
| K4 | Formulier opslaan | autosave per veld via de wachtrij (fase 26); fase 24 houdt de knop Opslaan met de ruimere regels | 24, 26 |

## Wat de code nu doet (relevant)

- Stappenbalk: `toonBalk` in `src/web/app.js` tekent nog de voorbeeldeditie van AAN-40. De stap komt
  uit `#/start?stap=…` en valt anders terug op Invullen. Daarom ziet een deelnemer een andere stap
  dan de editie. Het menu haalt de stap wel echt op (`haalMenuStap`), de balk niet.
- Menu: `MENU_VANAF` en `inMenu` in `src/shared/start.js`, volgorde = registratievolgorde in de router.
- Deadline blokkeert opslaan (`rechten.js`, §7.2.3); `stapData` geeft elke stap een datum in de balk.
- Ingevuld = weekend + beide budgetten + reistijd (AAN-33, `shared/antwoorden.js`).
- Weekend vastleggen mag steeds opnieuw (AAN-63). Deelvormen `info`/`stemmen`/`geboekt` (AAN-08, AAN-65).
- Elke klik bij Meenemen: schrijfactie, wachten, daarna het hele scherm opnieuw laden (2 aanroepen),
  met de schil-lader die verdere klikken tegenhoudt. Elke schrijfactie draait al onder `LockService`.
- De Store gooit een fout als een kolom in een bestaande Sheet ontbreekt.

## 1. Stappenbalk één bron en menu (STA-1, STA-6, NAV-1 aangepast; STA-8, NAV-10, NAV-11 nieuw)

- Balk leest de editie uit hetzelfde `scherm start`-antwoord als het menu; één gedeelde `editieStand`
  in de schil. Na `stapZetten` en bij elke navigatie/`visibilitychange` opnieuw. Ook in een
  beheersessie een balk (nieuwste eigen editie, zoals AAN-71). AAN-40 vervalt.
- Koppeling stap ↔ menu (enum in de Sheet blijft gelijk, alleen labels):

  | stap (Sheet) | balk | menu-item |
  |---|---|---|
  | invullen | Invullen | Invullen, Voortgang |
  | overzicht | Weekendje prikker | Weekendje prikker |
  | accommodatie | Accommodatie | Accommodatie |
  | voorbereiding | Meenemen | Meenemen |
  | weekend | Weekend | Start (toont het weekend) |
  | afrekenen | Afrekening | Afrekening |
  | afgerond | Afgerond | Start |

- Menu: altijd de zeven items Start, Invullen, Voortgang, Weekendje prikker, Accommodatie,
  Meenemen, Afrekening. Beheren staat los eronder, na een scheidingslijn (zijbalk) of als achtste
  icoon achteraan (mobiel), zodat de route niet onderbroken wordt.
- NAV-11: Afrekening krijgt twee delen: "Wie betaalt wat" (de huidige posten) en "Eindafrekening".
- "Overzicht" verdwijnt als label overal (UI, hints, WhatsApp-teksten, eersteActie).
- Test: e2e met twee contexten; organisator zet de stap, deelnemer ververst; balk, menu en start
  tonen dezelfde stap op elk scherm.

## 2. Onderdelen uit (OND-1 t/m OND-3, AAN-80) en invullen vrijer (FRM-8, FRM-9, STA-1 aangepast; FRM-11, DDL-1 nieuw)

- `src/shared/onderdelen.js`: `ONDERDELEN = { boodschappen, kookbeurten, programma, kamers, carpool }`,
  alle `false`. Uit = route niet geregistreerd, niet in menu, niet op Start, niet in eersteActie of
  uitleg. Ik kies verdwijnen: grijze items met "later beschikbaar" maken het menu langer en roepen
  vragen op. Code, acties en tabs blijven. Meenemen toont de sectie Boodschappen niet zolang
  boodschappen uit staat.
- Voorkeuren eten en activiteiten blijven in het formulier, optioneel; de organisator ziet ze
  in Weekendje prikker (detail per persoon) en als telling. Zie vraag over de vorm.
- AAN-33 wordt: ingevuld = minstens één weekend met een waarde. Budget, reistijd, verblijf optioneel.
- DDL-1: alleen Invullen heeft een deadline, informatief ("Graag ingevuld vóór vrijdag 21 november").
  Geen blokkade, geen statuswissel. Naar Weekendje prikker gaan sluit het invullen wel (AAN-04 blijft).
  `stapData` verdwijnt uit balk, stappenbeheer en logica; de kolom blijft en wordt genegeerd.

## 3. Weekend vastleggen (ACC-1 aangepast; ACC-6, ACC-7 nieuw; AAN-63 aangepast, AAN-81)

- Na vastleggen: dat weekend gemarkeerd, de andere knoppen `disabled`. Server weigert een tweede
  vastlegging met `gesloten`.
- Nieuwe actie `weekendLosmaken` achter "Ander weekend kiezen" met een bevestiging die toont wat
  het raakt: de aftelteller, een geboekte accommodatie (die geldt voor de oude datum). Losmaken kan
  in de stappen Weekendje prikker en Accommodatie (AAN-81).

## 4. Synchronisatielaag (SYNC-1 t/m SYNC-8, AAN-82, AAN-83)

- `src/web/stand.js` (kleine store per scherm) en `src/web/wachtrij.js` (wachtrij met debounce 1 s,
  localStorage met try/catch per sessie, opnieuw proberen na 2, 4, 8, 16 en 30 s, daarna terugdraaien
  met melding en knop "Opnieuw"), `beforeunload`-waarschuwing, één indicator in de kopregel.
- Server: nieuwe actie `bundel` met hooguit 25 kleine acties onder één slot, uitslag per actie. Elke
  kleine actie is idempotent en schrijft één rij of veld: claimen (bestaat al per rij),
  claimIntrekken, afvinken (zet een waarde, laatste wint, zonder versiecheck), top 3, en het
  formulier als patch per veld (laatste wint per veld, dus gedeeltelijk invullen werkt vanzelf).
- Optimistisch: Ik neem mee / intrekken, afvinken, formuliervelden en tags, top 3.
  Blijft wachten (bezig-status op de knop): weekend vastleggen of losmaken, accommodatie boeken,
  onthullen, deelvorm, stap zetten, post opslaan, betaling markeren, alle beheeracties, item
  toevoegen of verwijderen.
- Meenemen eerst, daarna formulier. Test met tellende nepserver (aantal aanroepen) en een
  gesimuleerde netwerkfout.

## 5. Accommodatie (ACC-3 t/m ACC-5 vervangen door ACC-8 t/m ACC-13; AAN-08, AAN-65 aangepast; AAN-84)

- Deelvorm `verrassing` of `samen`; geboekt is los: `geboektAccommodatieId` gevuld. Nieuwe kolommen
  `Edities.onthuld` (bool) en `Stemmen.rang` (1 t/m 3). De Store voegt ontbrekende kolommen achteraan
  de kop toe (AAN-84), zodat bestaande Sheets blijven werken.
- Omzetting bij lezen, Sheet ongewijzigd tot de volgende schrijfactie: `info` en `stemmen` worden
  `samen`, een oude stem wordt rang 1, `geboekt` wordt `samen` met de geboekte accommodatie.
- Top 3: 3, 2, 1 punt; organisator ziet ranglijst met punten en aantal mensen; deelnemers dezelfde
  stand zonder namen. Opnieuw opgeven vervangt. Verwijderen neemt voorkeuren mee; was het de
  geboekte, dan geen geboekte meer. Wisselen mag zolang er niets geboekt is; voorkeuren blijven.
- Eerst een schets van drie schermen (organisator, deelnemer samen kiezen, deelnemer verrassing)
  als artifact voor David, dan pas bouwen.

## 6. Uitleg van de stappen (UIT-1 t/m UIT-4, NAV-7 aangepast, AAN-85)

- Start: bij eerste bezoek een kaart "Zo gaat het weekend" met een kleine tijdlijn van de zes
  stappen, per stap naam, wat er gebeurt, wat het oplevert, wat jij doet (tekst per rol).
  Sluiten zet `ww-route-gezien` in localStorage (AAN-85). Daarna een link "Hoe werkt het".
- Info-icoon in de stappenbalk opent de uitleg van de huidige stap (bestaand hint-patroon).
- Teksten in `src/web/uitleg.js`; uitgezette onderdelen komen er niet in.

## Afsluiting

Lijst voor David per eis-ID, nieuwe aannames en een testlijst voor telefoon en laptop.
