# Bouwspecificatie Weekendje weg

Versie 0.11, 11 november 2026: feedbackronde 2 na de test van 11 november, BV-01 t/m BV-36 (§6, §7.2.2, §7.2.7, §7.6.6, §7.6.8, §7.7.4, §7.12, §7.14, §7.17, TOE-13, GRP-5, EDI-7, EDI-11, STA-4, STA-9, ACC-7, ACC-9, ACC-10, MEE-10, GELD-9, GELD-12, SYNC-5, SYNC-8, NAV-2, NAV-10, NAV-12 t/m NAV-15, NFR-21, NFR-22).
Versie 0.10, 11 november 2026: uitleg van de stappen, feedbackronde fase 28 (UIT-1 t/m UIT-4, NAV-7).
Versie 0.9, 11 november 2026: accommodatie verrassing of samen kiezen, feedbackronde fase 27 (§5.1, §5.3, §7.6, §11, ACC-3 t/m ACC-5 vervangen door ACC-8 t/m ACC-14).
Versie 0.8, 10 november 2026: synchronisatielaag met wachtrij, feedbackronde fase 26 (§5.3, §7.4.8, §7.4.9, §7.16.5, SYNC-1 t/m SYNC-8, FRM-8, FRM-10, NFR-8, NFR-12).
Versie 0.7, 10 november 2026: één vastgelegd weekend met uitweg, feedbackronde fase 25 (§5.3, ACC-6, ACC-7).
Versie 0.6, 10 november 2026: onderdelen uit en invullen vrijer, feedbackronde fase 24 (§7.2.3, §7.2.4, §7.2.6, §7.4.8, OND-1, OND-2, OND-3, FRM-8, FRM-9, FRM-11, DDL-1, OVZ-1, STA-1, EDI-7, EDI-8, EDI-10).
Versie 0.5, 10 november 2026: stappenbalk met één bron en menu in stapvolgorde, feedbackronde fase 23 (§7.2.1, §7.2.6, §7.14, STA-1, STA-6, STA-8, NAV-1, NAV-9, NAV-10, NAV-11).
Versie 0.4, 10 november 2026: groep opzetten met één opzetlink uit het Sheet-menu, op verzoek van David (§7.1.9, §7.1.10, §7.18, GRP-1, GRP-6, GRP-7, GRP-8, RON-5).
Versie 0.3, 9 november 2026: kalendervenster en kalenderweergave bijgewerkt na het ontwerp (AAN-15, §7.3, §9).
Versie 0.2, 8 november 2026, na review door Opus. Bron: `00-bron.md` en `00-bron-2.md`, interview: `01-interview.md`.

Deze spec is de bron van waarheid voor Claude Code. Alles wat hier niet staat, wordt niet
gebouwd. Twijfel tijdens de bouw wordt een aanname in `04-aannames.md`.

## 1. Productdoel

Weekendje weg is een installeerbare webapp waarmee een vaste vriendengroep elk jaar één
weekend weg plant, voorbereidt en afrekent. Deelnemers vullen los van elkaar hun
beschikbaarheid en wensen in; de organisator ziet alles samengevoegd, legt datum en
accommodatie vast en de groep regelt daarna boodschappen, programma en wie betaalt wat in
dezelfde app. Het is af als een groep van zes een volledige editie kan doorlopen, van
uitnodiging tot laatste betaling, zonder WhatsApp-lijstjes of een aparte verrekenapp.

## 2. Randvoorwaarden

- **Draait:** voorkant als statische site op GitHub Pages; gegevens in één Google Sheet per
  groep, op het Google-account van de eigenaar; een Apps Script in die Sheet als enige
  doorgeefluik. Geen eigen server, geen andere database, geen diensten van derden.
- **Gebruikers:** groepen van 2 tot 20 personen (AAN-20). De eerste groep telt zes,
  ICT-onderlegd en kritisch op dataveiligheid.
- **Apparaten:** actuele Safari op iOS, Chrome op Android, Chrome, Edge, Firefox en Safari op
  Windows en macOS. Installeerbaar als PWA waar de browser dat ondersteunt.
- **Taal:** UI volledig Nederlands, code en commentaar in het Engels.
- **Privacy:** alleen voornaam en woonplaats als persoonsgegevens. Geen e-mail, telefoon,
  rekeningnummers of adressen van deelnemers.
- **Kosten:** nul euro per maand.
- **Live:** alles in één keer; de groep krijgt pas een link als alle bouwfasen groen zijn en
  de eindtest is gedaan.

## 3. Stack

| Onderdeel | Keuze | Reden |
|---|---|---|
| Voorkant | Vanilla JavaScript (ES-modules), HTML, CSS, geen framework | Lichtgewicht, geen afhankelijkheden die de CSP of de laadtijd raken |
| Bundelen | esbuild | Eén snelle devDependency; bouwt de voorkant en het Apps Script uit dezelfde bronmodules |
| Doorgeefluik | Google Apps Script (V8), webapp "uitvoeren als eigenaar", toegang "iedereen" | Data blijft in de Sheet van de groep (route 2) |
| Opslag | Google Sheets via `SpreadsheetApp`, `LockService`, `PropertiesService` | Geen eigen database |
| Uitrol script | clasp | Code vanaf de pc naar het Apps Script van de sjabloon-Sheet |
| Uitrol voorkant | GitHub Pages vanuit `dist/web` via een GitHub Action | Gratis, https, geen server |
| Unit- en integratietests | `node --test` | Geen extra testframework |
| Eind-tot-eindtests | Playwright (Chromium en WebKit, mobiel en desktop) tegen een lokale nepbackend | De hele app is te testen zonder Google-login |
| Lint | geen aparte linter; `scripts/check-bronregels.mjs` bewaakt de harde regels (NFR-3) | Minder afhankelijkheden |

**Eén logica, twee adapters.** Alle bedrijfslogica van het doorgeefluik staat in
`src/server/` als pure modules tegen een `Store`-interface. `src/server/gas/` is de adapter
voor Google Sheets; `test/mock-backend/` is een Node-adapter met opslag in het geheugen. De
eind-tot-eindtests praten met de nepbackend over hetzelfde HTTP-contract (§5.3).

**HTTP-contract met Apps Script.** De voorkant stuurt elk verzoek als `POST` met
`Content-Type: text/plain` en een JSON-body naar de `/exec`-URL van het script, zodat er geen
CORS-preflight nodig is. Apps Script antwoordt via een doorverwijzing naar
`script.googleusercontent.com`; `fetch` volgt die. `doPost` staat volledig in een try/catch
en geeft altijd JSON via `ContentService` terug, ook bij een onverwachte fout (code `fout`);
anders ziet de voorkant alleen een netwerkfout. `doGet` geeft alleen `status`. Er zijn geen
andere `GET`-acties.

**Apps Script-bundel.** Apps Script kent geen ES-modules en roept `doPost`, `doGet`, `onOpen`
en menufuncties als globale functies op naam aan. `scripts/build.mjs` bouwt `dist/gas` als
IIFE met `globalName: 'WW'` en een vaste footer met top-level stubs
(`function doPost(e){return WW.doPost(e)}` en zo verder voor elke ingang). Een unittest
controleert dat al deze namen in de bundel staan.

**`appsscript.json`.** `runtimeVersion: "V8"`, `timeZone: "Europe/Amsterdam"`,
`webapp: { executeAs: "USER_DEPLOYING", access: "ANYONE_ANONYMOUS" }`, en alleen de scope
voor de eigen spreadsheet (`spreadsheets.currentonly`) plus `script.container.ui` voor het menu.

**Implementaties.** Elke nieuwe implementatie krijgt een nieuw deployment-ID en maakt alle
links van een groep ongeldig. Een update gaat daarom altijd als nieuwe versie op de bestaande
implementatie ("Implementaties beheren → bewerken → nieuwe versie", of `clasp deploy -i <id>`).
De README en de melding bij `api_versie` zeggen dat expliciet. Google Workspace-accounts
kunnen "Iedereen" blokkeren; de README noemt dat.

## 4. Mappenstructuur

```
src/
  shared/        pure logica voor voorkant én script: datums, feestdagen, rangorde, geld, verdeling, afrekening
  server/        API-acties, rechten, validatie, Store-interface
  server/gas/    Apps Script-ingang (doPost), SheetStore, Sheet-menu, LockService
  web/           voorkant: index.html, app.js, router, schermen, componenten, css
  web/screens/   één bestand per scherm
  web/components/ stappenbalk, kalender, schuif, vinkjeslijst, verdeelinvoer
data/
  vakanties.json schoolvakanties per schooljaar en regio (AAN-13)
scripts/
  build.mjs      esbuild naar dist/web en dist/gas
  check.mjs      alle checks achter elkaar, één groene of rode regel
  check-bronregels.mjs
  vakanties.mjs  haalt de open data op en schrijft data/vakanties.json
test/
  unit/          node --test per module
  mock-backend/  Node-server met MemoryStore op hetzelfde contract
  e2e/           Playwright-scenario's
  fixtures/      demodata (§11)
docs/            bron, interview, spec, fasen, aannames, glossary, designbrief, design/, overdracht/
.claude/         settings.json met allow-lijst
.github/workflows/pages.yml
appsscript.json, .clasp.json.voorbeeld
```

## 5. Datamodel

Elke Sheet-tab is een tabel met een kopregel. Elke rij heeft `id` (willekeurige 16 tekens,
base64url) en, waar genoemd, `versie` (geheel getal, +1 bij elke wijziging) en
`bijgewerkt` (ISO-tijd UTC). Geld staat in **centen** (geheel getal). Datums zijn
`JJJJ-MM-DD`. Een weekend wordt aangeduid met de datum van de **vrijdag**. Lijsten en
antwoorden die nooit los worden opgevraagd staan als JSON in één cel. Geheimen staan alleen
als hash (§10 NFR-1).

**Celopslag.** Sheets zet tekst als `2027-04-09`, `09:30` of `1/2` om in datums en getallen,
en tekst die met `=`, `+`, `-` of `@` begint kan een formule worden (bijvoorbeeld
`=IMPORTXML(…)`, dat gegevens naar buiten kan lekken). Daarom: alle datakolommen in de
sjabloon hebben tekstopmaak `@`, `SheetStore` zet vóór elke `setValues` het bereik op
`setNumberFormat('@')`, en schrijft elke waarde als string. Getallen en booleans worden bij
lezen door de Store teruggezet naar hun type. De deadline en alle tijden staan als ISO met
offset (`2027-03-01T23:59:00+01:00`); de tijdzone van script en Sheet is Europe/Amsterdam.

### 5.1 Tabs

| Tab | Velden | Bron |
|---|---|---|
| `Groep` (één rij) | `naam`, `apiVersie`, `opgezet` (bool), `aangemaakt` | F-22 |
| `Leden` | `id`, `voornaam`, `woonplaats`, `actief` | F-11, F-22, F-27 |
| `Edities` | `id`, `jaar`, `titel`, `stap` (enum §7.2), `stapData` (JSON, vervallen: wordt niet meer gelezen of geschreven, DDL-1), `periodeVan`, `periodeTot`, `voorkeursmaanden` (JSON, maandnummers), `deadline` (datum+tijd), `blokken` (JSON, aan/uit per blok), `lijsten` (JSON: activiteiten, programma, eten en drinken), `vastgelegdWeekend`, `deelvorm` (`verrassing`, `samen`; oude waarden `info`, `stemmen` en `geboekt` lezen als `samen`, AAN-86), `geboektAccommodatieId` (leeg: nog geen accommodatie gekozen), `boodschappenDefinitief` (bool), `versie`, `bijgewerkt`, `onthuld` (bool, alleen bij `verrassing`) | F-08, F-20, F-30, F-32, F-36, F-43, F-45 |
| `Deelnemers` | `id`, `editieId`, `lidId`, `tokenHash`, `pinHash`, `pinSalt`, `rol` (`deelnemer`, `organisator`), `afgehaakt` (bool), `ingevuld` (bool), `ingevuldOp` | F-21, F-29, F-38, F-47 |
| `Beheerlinks` | `id`, `lidId`, `tokenHash`, `wachtwoordHash` (leeg tot eerste gebruik), `wachtwoordSalt`, `actief` (bool), `gemaakt`. Een beheerlink hoort bij een lid en geeft beheer over de edities waarin dat lid organisator is, plus het aanmaken van nieuwe edities | F-38 |
| `Antwoorden` | `id`, `editieId`, `deelnemerId`, `data` (JSON §5.2), `versie`, `bijgewerkt` | F-02 t/m F-15, F-24 t/m F-28, F-33, F-36, F-37, F-41 |
| `Vragen` | `id`, `editieId`, `volgorde`, `type` (`janee`, `keuze`, `meerkeuze`, `schaal`, `tekst`), `tekst`, `opties` (JSON) | F-15, F-33 |
| `Accommodaties` | `id`, `editieId`, `naam`, `plaats`, `link`, `prijsTotaal` (centen), `notitie`, `versie`, `bedden` (geheel getal, optioneel), `eigenKamers` (geheel getal, optioneel: kamers voor één persoon) | F-32 |
| `Stemmen` | `id`, `editieId`, `deelnemerId`, `accommodatieId`, `rang` (1 t/m 3; leeg in een oude Sheet telt als 1, AAN-86). Eén rij per keuze van de top 3 | F-32 |

**Nieuwe kolommen.** Kolommen die later zijn bijgekomen (`Edities.onthuld`, `Stemmen.rang`, `Accommodaties.bedden` en `eigenKamers`) staan achteraan. Mist een kolom in een bestaande Sheet, dan leest de Store een lege cel en zet hij de kolom achteraan de kop bij de eerste schrijfactie op die tab (AAN-84).
| `Items` | `id`, `editieId`, `soort` (`spullen`, `keuken`, `boodschap`), `naam`, `categorie` (§7.9), `maaltijdId` (optioneel), `toegevoegdDoor`, `afgevinkt` (bool), `versie` | F-40, F-42, F-43 |
| `Claims` | `id`, `itemId`, `deelnemerId`, `gemaakt` | F-51 |
| `Maaltijden` | `id`, `editieId`, `dag` (`vr`, `za`, `zo`), `soort` (`ontbijt`, `lunch`, `diner`), `omschrijving` | F-40 |
| `Koks` | `id`, `maaltijdId`, `deelnemerId` | F-40 |
| `Programma` | `id`, `editieId`, `dag`, `begin` (UU:MM), `eind` (optioneel), `titel`, `adres`, `link`, `notitie` | F-40 |
| `Kamers` | `id`, `editieId`, `naam`, `slaapplaatsen` | F-40 |
| `Kamerindeling` | `id`, `kamerId`, `deelnemerId` | F-40 |
| `Ritten` | `id`, `editieId`, `bestuurderId`, `vertrekplaats`, `vrijePlaatsen` | F-40 |
| `Meerijders` | `id`, `ritId`, `deelnemerId` | F-40 |
| `Posten` | `id`, `editieId`, `soort` (`uitgave`, `ontvangst`), `omschrijving`, `bedrag` (centen, >0), `betalerId` (bij ontvangst: ontvanger), `datum`, `categorie` (AAN-16), `verdeling` (JSON §5.2), `aangemaaktDoor`, `aangepastDoorOrganisator` (bool), `versie`, `bijgewerkt` | F-39 |
| `Betalingen` | `id`, `editieId`, `vanId`, `naarId`, `bedrag` (centen), `betaaldOp` | F-39 |
| `Sessies` | `id`, `tokenHash`, `soort` (`deelnemer`, `beheer`), `subjectId`, `verloopt` | [aanvulling] NFR-1 |
| `Pogingen` | `sleutel` (tokenHash), `fout` (aantal), `geblokkeerdTot`, `blokkades` | F-53 |
| `Log` | `tijd`, `actie`, `wie`, `editieId`, `detail` (zonder geheimen) | [aanvulling] |

### 5.2 JSON-velden

**`Antwoorden.data`**
```json
{
  "beschikbaarheid": { "2027-04-09": "ja", "2027-04-16": "misschien", "2027-05-07": "nee" },
  "budgetVerblijf": 15000,
  "budgetWeekend": 40000,
  "woonplaats": "Utrecht",
  "maxReistijdUur": 2,
  "verblijf": { "eigenKamer": "lieverWel", "eigenBadkamer": "maaktNietUit", "sauna": "ja", "bubbelbad": "nee", "barbecue": "ja", "buitenruimte": "ja", "schoonmaak": "ja", "linnengoed": "ja" },
  "activiteiten": ["escaperoom", "smeden"], "activiteitenEigen": ["kanoën"],
  "programma": ["uitslapen", "bordspellen"], "programmaEigen": [],
  "etenDrinken": ["ipa", "nulbier", "vegetarisch"], "etenDrinkenEigen": ["notenallergie"],
  "samenwerken": "ja",
  "eigenVragen": { "<vraagId>": "antwoord" }
}
```
Waarden voor `eigenKamer`: `ja`, `lieverWel`, `maaktNietUit`. Overige verblijfswensen: `ja`,
`nee`, `maaktNietUit`. Een ontbrekende sleutel betekent niet ingevuld. Budgetten zijn de
**bovengrens** van de gekozen schijf in centen (schijf €100 tot €150 wordt 15000).

**`Posten.verdeling`**
```json
{ "wijze": "gelijk",  "deelnemers": ["d1", "d2", "d3"] }
{ "wijze": "aandeel", "aandelen": { "d1": 1, "d2": 2, "d3": 1 } }
{ "wijze": "bedrag",  "bedragen": { "d1": 2500, "d2": 4000 } }
```

**`Edities.lijsten`**: per blok een lijst `{ "sleutel": "escaperoom", "label": "Escape room" }`
in weergavevolgorde; de organisator kan labels toevoegen, hernoemen en verwijderen.

### 5.3 API-acties

Elk verzoek: `{ "actie": "...", "sessie": "...", "editieId": "...", "data": {...}, "apiVersie": 1 }`.
Elk antwoord: `{ "ok": true, "data": {...} }` of `{ "ok": false, "fout": "<code>", "melding": "<Nederlandse tekst>" }`.
Foutcodes: `geen_toegang`, `geblokkeerd`, `verlopen`, `gewijzigd` (versieconflict),
`ongeldig`, `gesloten` (stap of definitief staat het niet toe), `druk` (slot niet gekregen,
opnieuw proberen zinvol), `api_versie`, `fout` (onverwacht).

**Leesacties per scherm.** Elk scherm haalt zijn gegevens met precies één leesactie op
(NFR-8). `scherm` met parameter `naam` levert wat dat scherm toont, gefilterd op de rol:

| `naam` | Levert |
|---|---|
| `start` | editie, stap, eigen status, en per stap wat §7.14 bovenaan toont |
| `formulier` | editie-instellingen, lijsten, vragen, mijn antwoorden met versie |
| `voortgang` | per deelnemer voornaam, ingevuld ja/nee, deadline |
| `overzicht` | §7.5.3 voor deelnemers, §7.5.4 voor beheer |
| `accommodaties` | deelvorm, geboekt, onthuld, opties met punten en aantal mensen (zonder namen), mijn top 3, hoeveel een top 3 gaven, vastgelegd weekend; bij een niet-onthulde verrassing voor een deelnemer geen enkele optie (ACC-9) |
| `meenemen` | items met claims, definitief-status, tellingen eten en drinken |
| `kookbeurten` | maaltijden met koks en ingrediënten, wensen volgens §7.10.4 |
| `programma` | programmapunten |
| `kamers` | kamers met indeling, eigen-kamerwens per deelnemer (alleen beheer) |
| `carpool` | ritten met meerijders, woonplaatsen, wie nog geen rit heeft |
| `posten` | posten met verdeling, saldi |
| `afrekening` | voorgestelde betalingen, betaalde betalingen |
| `archief` | §7.15 |
| `beheer` | leden, deelnemers met status, beheerlinks (zonder geheimen), editie-instellingen |

| Groep | Schrijfacties |
|---|---|
| Toegang | `inloggenDeelnemer` (token, pin), `inloggenBeheer` (token, wachtwoord), `wachtwoordInstellen` (beheertoken, nieuw, alleen als nog leeg), `uitloggen` |
| Opzet | `status` (zonder sessie: alleen `apiVersie` en `opgezet`), `groepOpzetten` (setupcode, groepsnaam, leden, lid van de eigenaar, beheerwachtwoord) |
| Leden | `ledenBeheren` (toevoegen, woonplaats wijzigen, inactief) |
| Editie | `editieAanmaken`, `editieBijwerken`, `deelnemersBeheren`, `linksMaken` (geeft eenmalig links en pincodes terug), `linkVernieuwen`, `pincodeVernieuwen`, `beheerlinkMaken` (voor een lid), `stapZetten`, `afhakenMarkeren`, `vragenBeheren` |
| Invullen | `antwoordenOpslaan` (met versie), `antwoordZetten` (één veld van `Antwoorden.data`, `waarde: null` haalt het weg, zonder versie, AAN-83) |
| Wachtrij | `bundel` (lijst van hooguit 25 `{ actie, data }` uit `claimen`, `claimIntrekken`, `afvinken`, `antwoordZetten`, `top3Opgeven`; antwoord `{ uitslagen: [{ ok, data } of { ok: false, fout, melding }] }`, §7.16.5) |
| Accommodatie | `weekendVastleggen`, `weekendLosmaken`, `accommodatieOpslaan` (met optioneel `bedden` en `eigenKamers`), `accommodatieVerwijderen`, `deelvormZetten` (`verrassing` of `samen`), `accommodatieBoeken`, `verrassingOnthullen`, `top3Opgeven` (`keuzes`: hooguit drie `{ accommodatieId, rang }`, vervangt de vorige top 3, via de wachtrij) |
| Voorbereiding | `itemOpslaan`, `itemVerwijderen`, `claimen`, `claimIntrekken` (eigen, of als organisator die van een ander), `afvinken`, `boodschappenDefinitief`, `maaltijdOpslaan`, `kokWorden`, `kokStoppen`, `programmaOpslaan`, `programmaVerwijderen`, `kamersOpslaan`, `kamerIndelen`, `ritOpslaan`, `meerijden`, `meerijdenStoppen` |
| Geld | `postOpslaan`, `postVerwijderen`, `betalingMarkeren`, `betalingTerugdraaien` |

Inloggen en uitloggen zijn schrijfacties (ze schrijven `Pogingen` en `Sessies`).

## 6. Rollen en rechten

Eén plek in de code beslist: `src/server/rechten.js`, functie `mag(rol, actie, context)`.
Elke actie loopt daar doorheen voordat de Store wordt aangeraakt.

| Actie | Zonder sessie | Deelnemer | Organisator (beheersessie) | Eigenaar (Sheet-menu) |
|---|---|---|---|---|
| `status` | ja (alleen versie en opgezet ja/nee) | ja | ja | |
| Groep opzetten | alleen met geldige setupcode | | | setupcode tonen |
| Eigen antwoorden lezen en wijzigen | | ja, tot de deadline en zolang de stap Invullen is | ja (eigen deelnemerslink) | |
| Voortgang (wie heeft ingevuld) | | ja | ja | |
| Overlapoverzicht | | vanaf stap Overzicht | altijd | |
| Detailoverzicht per persoon | | nee | ja | |
| Editie, blokken, vragen, deadline, stappen | | nee | ja | |
| Leden beheren | | nee | ja | |
| Links en pincodes maken of vernieuwen | | nee | ja | |
| Beheerlink maken voor een lid | | nee | ja | ja (lid kiezen) |
| Wachtwoord van een beheerlink resetten | | nee | nee | ja (beheerlink kiezen) |
| Accommodaties beheren, datum vastleggen | | nee | ja | |
| Stemmen | | als deelvorm `stemmen` | ja (eigen deelnemerslink) | |
| Item toevoegen | | ja, tot definitief | ja | |
| Item verwijderen | | eigen item, tot definitief | elk item | |
| Claimen, eigen claim intrekken | | ja | ja | |
| Item toewijzen aan een deelnemer (claim op diens naam) | | nee | ja | |
| Afvinken | | ja | ja | |
| Boodschappen definitief zetten of terugzetten | | nee | ja | |
| Kok worden of stoppen | | ja | ja | |
| Maaltijden, programma, kamers beheren | | nee | ja | |
| Rit aanbieden, meerijden | | ja (eigen) | ja (iedereen indelen) | |
| Post toevoegen | | ja, betaler kiesbaar | ja | |
| Post wijzigen of verwijderen | | eigen post (`aangemaaktDoor`) | elke post, met aantekening | |
| Betaling markeren | | als `van` of `naar` | ja | |
| Afhaken markeren | | nee | ja | |
| Archief lezen | | ja | ja | |

Na de stap Afgerond is alles alleen-lezen, behalve het archief, onthullen (AAN-87) en betaling
markeren of terugdraaien (AAN-29), zodat open betalingen na Afgerond nog af te vinken zijn.

## 7. Bedrijfsregels

### 7.1 Toegang
1. Een persoonlijke link is `https://<pages-url>/#b=<scriptId>&t=<token>`. `scriptId` is het
   deployment-ID van het Apps Script, `token` 22 tekens base64url (128 bits). Alles staat na
   het `#`, zodat het nooit in een serverlog of bij GitHub belandt.
2. De voorkant accepteert alleen een `scriptId` van de vorm `[A-Za-z0-9_-]{20,120}` en bouwt
   zelf de URL `https://script.google.com/macros/s/<scriptId>/exec`. Een andere host is
   onmogelijk.
3. Willekeur: Apps Script heeft geen `crypto.getRandomValues`. `src/server/gas/random.js`
   maakt bytes als SHA-256 over meerdere `Utilities.getUuid()`-waarden plus een teller;
   tokens zijn de eerste 16 bytes. Pincode: zes cijfers uit die bytes met rejection sampling
   (geen modulo-bias), gekozen door het script, nooit door de organisator getypt (AAN-36).
   De nepbackend gebruikt `crypto.getRandomValues` achter dezelfde interface.
4. Hashen: tokens (128 bits) staan als SHA-256 zonder salt, zodat ze op te zoeken zijn.
   Pincodes en wachtwoorden staan als iteratieve SHA-256 met een salt per rij; het aantal
   iteraties is een constante die in Apps Script onder 1 seconde blijft, gemeten in fase 20
   (AAN-32). Een vaste testvector geeft in Node en Apps Script dezelfde hash; let op dat
   `Utilities.computeDigest` signed bytes teruggeeft.
5. Blokkering: na 5 foute pogingen voor een token 15 minuten geblokkeerd. Na 3 blokkades is
   de pincode ongeldig tot de organisator een nieuwe maakt (AAN-01). `pincodeVernieuwen` en
   `linkVernieuwen` zetten de pogingen en blokkades van die deelnemer op nul.
6. Na een geslaagde login krijgt het apparaat een sessietoken (128 bits). `scriptId` en
   sessie staan samen in `localStorage`. Geldig 60 dagen voor deelnemers, 12 uur voor beheer
   (AAN-02), tenzij de browser de opslag eerder wist. Het script slaat alleen de hash op en
   ruimt bij elke login verlopen sessies op.
7. Link en pincode worden alleen bij `linksMaken`, `linkVernieuwen` en `pincodeVernieuwen`
   één keer in klare tekst teruggegeven. Daarna kan niemand ze opvragen, ook de organisator
   niet. Pincode kwijt: `pincodeVernieuwen`, de link blijft gelijk. Link kwijt:
   `linkVernieuwen` maakt een nieuw token en een nieuwe pincode en trekt de sessies van die
   deelnemer in.
8. **Link plakken.** Een geïnstalleerde webapp op iOS deelt zijn opslag niet met Safari en
   het manifest kan geen fragment meedragen. Daarom heeft het startscherm zonder sessie een
   veld "Plak je persoonlijke link"; de app haalt `b` en `t` (of `beheer`) uit de geplakte
   tekst met dezelfde regels als 7.1.2. De rondleiding op iOS zegt: eerst op het
   beginscherm zetten, dan in de app de link plakken en de pincode invoeren.
9. Setupcode: acht tekens, gemaakt via het Sheet-menu "Weekendje weg → Groep opzetten" (§7.18),
   eenmalig en 30 minuten geldig (AAN-28), opgeslagen in `PropertiesService`.
   `groepOpzetten` werkt alleen als de groep nog niet is opgezet en maakt de eerste
   beheerlink voor het lid van de eigenaar met het gekozen wachtwoord.
10. Beheerlink: `#b=<scriptId>&beheer=<token>`, gekoppeld aan een lid. Bij eerste gebruik
    kiest dat lid een wachtwoord van minimaal 10 tekens; daarna wordt het bij elke login
    gevraagd. Een beheersessie mag beheren in edities waarin het lid organisator is en mag
    nieuwe edities aanmaken (AAN-03). Het Sheet-menu heeft "Beheerlink maken" (lid kiezen)
    en "Wachtwoord resetten" (beheerlink kiezen; het wachtwoordveld wordt leeg). Is
    `APP_ADRES` ingevuld (§7.18.1), dan toont "Beheerlink maken" de volledige link
    `<APP_ADRES>#b=<scriptId>&beheer=<token>` (GRP-8, AAN-45).
11. Persoonlijke links horen bij één editie. Na de stap Afgerond blijven ze werken,
    alleen-lezen (AAN-31).

### 7.2 Stappen van een editie
1. Volgorde: `invullen` → `overzicht` → `accommodatie` → `voorbereiding` → `weekend` →
   `afrekenen` → `afgerond`. Dit zijn de waarden in de Sheet. De app toont ze overal met dezelfde
   namen (`STAPNAMEN` in `src/shared/stappen.js`): Invullen, Weekendje prikker, Accommodatie,
   Meenemen, Weekend, Afrekening, Afgerond.
2. Alleen de organisator zet de stap, één stap vooruit of één stap terug, ook van `afgerond`
   terug naar `afrekenen`. Terug naar `invullen` kan niet meer vanaf `accommodatie` (AAN-05).
3. Naar `overzicht` gaan sluit het invullen, ook voor de deadline (AAN-04). De deadline zelf is
   informatief en blokkeert niets: opslaan lukt ook erna zolang de stap `invullen` is (DDL-1).
   De organisator kan de deadline verlengen zolang de stap `invullen` is.
4. De stappen hebben geen verwachte datums. De enige datum is de deadline van Invullen; die staat
   bij het formulier ("Graag ingevuld vóór vrijdag 21 november") en in Voortgang, niet in de
   stappenbalk of het stappenbeheer. De kolom `stapData` blijft in de Sheet en wordt genegeerd
   (niet gelezen, niet geschreven).
5. Elke stapwijziging maakt een WhatsApp-tekst voor de organisator (§7.12).
6. De stap heeft één bron: de editie in de Sheet. De schil houdt één stand (stap, titel,
   vastgelegd weekend) uit het scherm `start` en tekent stappenbalk en menu daaruit, voor elke
   rol. Ze haalt die stand op bij openen, bij elke navigatie, als de app weer zichtbaar wordt en na
   een stapwijziging in beheer. Een deelnemer ziet zijn editie, een beheersessie de nieuwste eigen
   editie (AAN-71). Er is geen stap in het adres en geen voorbeeldeditie meer.
7. **Bevestiging bij een stap vooruit** (AAN-88). Stappen vraagt een korte bevestiging vóór:
   - Naar Weekendje prikker als niet iedereen heeft ingevuld: "Robin heeft nog niet ingevuld. Toch
     door?" (bij meer namen "Robin en Sam hebben ..." of "3 mensen hebben ...").
   - Naar Weekend, Afrekening of Afgerond als het vastgelegde weekend meer dan 7 dagen weg is:
     "Het weekend is pas over 576 dagen. Toch door?".
   - Naar Afgerond als er betalingen open staan: "Er staan nog 3 betalingen open. Die kun je na
     Afgerond nog afvinken. Toch afronden?".
   Staan er meer redenen, dan noemt één bevestiging ze allemaal. Een stap terug vraagt niets extra.

### 7.3 Kalender
1. De kalender toont alle weekenden waarvan de vrijdag tussen `periodeVan` en `periodeTot`
   valt. Standaard: het kalenderjaar van de editie, dus de vrijdagen van 1 januari tot en met
   31 december van `jaar` (AAN-15). De organisator kan het venster aanpassen.
   Weergave: per maand een maandblad (ma tot en met zo) met elk weekend als één tikbare balk
   over vrijdag, zaterdag en zondag. Een weekend hoort bij de maand van de vrijdag. Desktop
   toont de maanden in een raster, mobiel onder elkaar met bovenaan een jaarstrook die per
   maand de status van elk weekend laat zien. Bovenaan staat hoeveel weekenden zijn ingevuld.
2. Tikken op een weekend wisselt: leeg → ja → misschien → nee → leeg (AAN-17). Ook met het
   toetsenbord (spatie of enter).
3. Een weekend in een voorkeursmaand (maand van de vrijdag) krijgt een eigen markering.
4. Per weekend toont de kalender kenmerken: schoolvakantie per regio (N, M, Z) als een dag
   van vrijdag tot en met zondag in een vakantie valt; feestdag als vrijdag, zaterdag,
   zondag of de maandag erna een feestdag is; "lang weekend" als de vrijdag of de maandag een
   feestdag is. Alle drie de regio's staan tegelijk in beeld; er is geen regiokeuze. Een dag
   met vakantie in minstens één regio krijgt een eigen tint, en onder elke maand staat per
   vakantie welke regio's en welke data.
5. Feestdagen (berekend, `src/shared/feestdagen.js`): Nieuwjaarsdag, Goede Vrijdag, eerste en
   tweede Paasdag, Koningsdag (27 april, of 26 april als 27 april op zondag valt),
   Bevrijdingsdag (5 mei), Hemelvaartsdag, eerste en tweede Pinksterdag, eerste en tweede
   Kerstdag. Pasen volgens het algoritme van Meeus/Jones/Butcher.
6. Schoolvakanties komen uit `data/vakanties.json` (AAN-13). Valt een deel van het venster
   buiten de bekende schooljaren, dan toont de kalender daar "vakanties nog niet bekend".

### 7.4 Formulier
1. Blokken en volgorde: Kalender, Budget, Reistijd, Verblijf, Activiteiten, Programma en
   sfeer, Eten en drinken, Samenwerken op vrijdag, Eigen vragen.
2. Altijd aan: Kalender, Budget, Reistijd, Verblijf. Standaard aan maar uit te zetten: Eten
   en drinken, Activiteiten, Programma en sfeer (AAN-21). Standaard uit: Samenwerken op
   vrijdag. Eigen vragen verschijnen alleen als er vragen zijn.
3. Budget verblijf: schijven van €50, keuzes "tot €50", "€50 tot €100", …, "€950 tot €1000".
   Budget weekend: schijven van €100, "tot €100", …, "€900 tot €1000". Opgeslagen als
   bovengrens in centen (§5.2).
4. Reistijd: geheel getal 1 tot en met 12 uur. Woonplaats: vrije tekst, 2 tot 60 tekens,
   standaard ingevuld met de woonplaats van het lid.
5. Boven het blok Verblijf staat: "Je geeft hier je voorkeuren op. Dat is geen garantie: de
   organisator zoekt wat het best past bij de hele groep."
6. Samenwerken op vrijdag vraagt: "Wil je vrijdag overdag op de locatie werken? Dan kom je
   's ochtends al aan." met ja, misschien, nee.
7. Eigen vragen van het type tekst: maximaal 500 tekens. De drie velden `...Eigen` zijn taginvoer
   (TAG-1 t/m TAG-10): een lijst van hooguit 20 tags van hooguit 40 tekens, dubbel op kleine letters,
   zonder accenten, spaties en leestekens (AAN-74). Oude tekst wordt bij lezen gesplitst (AAN-76).
8. Elk veld slaat zichzelf op via de wachtrij (`antwoordZetten`, besluit K4); er is geen knop Opslaan. Zo wordt ook een half formulier bewaard (FRM-11); een deelnemer telt als **ingevuld** zodra
   minstens één weekend een waarde heeft (AAN-33). Alleen de kalender is verplicht; Budget, Reistijd
   en Verblijf zijn optioneel en dragen "(optioneel)" in de kop. Het formulier toont wat nog ontbreekt.
   De voorkeuren voor eten en doen (vinkjes uit de editielijsten plus tags, alles optioneel) blijven
   bij Invullen en komen terug bij de organisator in Weekendje prikker (OND-3).
9. Per veld wint de laatste schrijfactie, zonder versiecheck (AAN-83). Een tweede apparaat van dezelfde
   persoon overschrijft alleen de velden die het zelf wijzigt; bij terugkeren naar het tabblad laadt het
   formulier de nieuwste antwoorden. `antwoordenOpslaan` met versie blijft bestaan voor het API-contract.

### 7.5 Overzicht en voorkeursdatum
1. Per weekend telt het overzicht ja, misschien, nee en niet ingevuld, over deelnemers die
   niet afgehaakt zijn.
2. Rangorde (AAN-06): minste nee, dan meeste ja, dan meeste misschien, dan in een
   voorkeursmaand, dan het vroegste weekend. De bovenste is de **voorkeursdatum**; de
   overzichtspagina toont de top 5.
3. Deelnemers zien: de heatmap met aantallen zonder namen, de top 5, de bandbreedte van
   beide budgetten (laagste en hoogste schijf), de bandbreedte van de maximale reistijd
   (kortste en langste), per
   vinkje in activiteiten, programma en eten en drinken het aantal, per eigen keuzevraag het
   aantal per optie (AAN-07).
4. De organisator ziet daarnaast alles per persoon, inclusief vrije tekst, allergieën,
   woonplaatsen en het blok samenwerken.
5. Koks zien de aantallen per eetwens en het vrije veld eten en drinken zonder namen
   (§7.10.4, AAN-34). Alleen de organisator ziet allergieën met namen.
6. Het script stuurt deelnemers, ook koks, nooit antwoorden van anderen met naam of
   deelnemer-ID. Dat wordt getest.

### 7.6 Accommodatie en datum
1. De organisator legt één weekend vast; dat zet de aftelteller aan en is de basis voor
   programma en maaltijden.
2. Accommodaties zijn zichtbaar voor deelnemers vanaf de stap Accommodatie, in de gekozen
   vorm. De organisator kiest per editie, nadat hij zelf heeft gezocht:
   - **Samen kiezen** (`samen`, de standaard): de organisator zet een paar opties neer; elke
     deelnemer geeft een top 3 (minder bij minder opties). Rang 1, 2 en 3 geven 3, 2 en 1 punt.
     Opnieuw opgeven vervangt de eerdere top 3; de top 3 gaat via de wachtrij (§7.16.5). De
     organisator ziet een ranglijst met per optie punten en aantal mensen; deelnemers zien
     dezelfde stand zonder namen (AAN-08).
   - **Verrassing** (`verrassing`): de organisator kiest en boekt zelf. Een deelnemer krijgt van
     de server nergens naam, plaats, link, bedden of eigen kamers, ook niet via het startscherm,
     het archief of een ander leesscherm; alleen dat de accommodatie geregeld is. De organisator
     (met beheerlink of eigen deelnemerslink) ziet alles. In Wie betaalt wat krijgt de organisator
     een waarschuwing dat een omschrijving met de naam van het huis de verrassing kan verraden.
3. Prijs wordt getoond als totaal en per persoon (totaal gedeeld door het aantal niet-afgehaakte
   deelnemers, afgerond op hele euro's).
4. **Boeken.** De organisator legt één optie vast als geboekt (`geboektAccommodatieId`); een
   andere boeken vervangt de vorige. Geboekt is genoeg om door te gaan: geen stap hangt af van
   onthullen. Verwijderen neemt de voorkeuren voor die optie mee; was het de geboekte, dan is
   er weer "nog geen accommodatie gekozen" (AAN-65).
5. **Wisselen** tussen Verrassing en Samen kiezen kan zolang er niets geboekt is; ingevoerde
   voorkeuren blijven bewaard.
6. **Onthullen** doet alleen de organisator, op een moment naar keuze en nooit automatisch, ook
   niet na het weekend; de verrassing mag geheim blijven. Onthullen vraagt een bevestiging, is
   definitief en kan vanaf de stap Accommodatie in elke latere stap, ook na Afgerond (AAN-87).
   Daarna zien deelnemers de geboekte accommodatie met naam, plaats, datum, prijs, bedden,
   eigen kamers, notitie en link, en alleen die: de opties die niet geboekt zijn, krijgt een
   deelnemer bij een verrassing ook na onthullen nooit te zien.
7. **Bedden en eigen kamers.** Een optie heeft optioneel het aantal bedden en het aantal eigen
   kamers (kamers voor één persoon, voor sommigen een pre), elk een geheel getal vanaf 0; eigen
   kamers niet meer dan bedden als beide zijn ingevuld (AAN-64). Ze staan bij elke optie, als
   "8 bedden · 3 eigen kamers"; een leeg veld wordt niet getoond.
8. **Vastleggen en losmaken.** De organisator legt het weekend vast en kiest een ander weekend op
   Weekendje prikker én onder Beheren, Accommodaties beheren. Losmaken kan in de stappen Weekendje
   prikker, Accommodatie en Meenemen, met de bevestiging van ACC-7 (AAN-81). Vanaf de stap Weekend
   zegt de app: "Het weekend wijzigen kan tot en met de stap Meenemen. Zet de stap terug onder
   Stappen." met een link naar Stappen.

### 7.7 Wie neemt wat mee
1. Drie soorten items: `spullen` (wordt nooit gekocht), `keuken` (uit eigen keuken, kan ook
   gekocht worden), `boodschap` (wordt gekocht tenzij iemand hem claimt).
2. Startlijst `keuken` bij aanmaken van een editie: olijfolie, zout en peper, kruiden,
   mayonaise, pindakaas, ketchup, suiker, koffie, thee. Startlijst `spullen`: bordspellen,
   speaker, kaartspel. Beide aan te passen.
3. Een claim is een eigen rij. Twee claims van verschillende personen op hetzelfde item
   bestaan naast elkaar; een tweede claim van dezelfde persoon op hetzelfde item wordt
   genegeerd. Het item toont de namen op volgorde van claim.
4. Iedereen trekt alleen zijn eigen claim in. De organisator kan elke claim intrekken en bij elk
   item "Toewijzen aan ..." kiezen: dat maakt een claim op naam van de gekozen deelnemer (niet
   afgehaakt), met dezelfde regels als een eigen claim (MEE-10).
5. Bij afhaken vervallen alle claims van die persoon (AAN-11).

### 7.8 Boodschappenlijst
1. De boodschappenlijst bevat alle items van soort `boodschap` en `keuken` zonder claim.
2. Indeling op deze volgorde: Groente en fruit, Brood, Vlees, vis en vega, Kaas en
   vleeswaren, Zuivel en eieren, Ontbijt en beleg, Pasta, rijst en wereldkeuken, Conserven en
   sauzen, Koek, snoep en chips, Frisdrank, bier en wijn, Diepvries, Huishouden, Overig
   (AAN-19). Binnen een categorie op naam.
3. Wie een item toevoegt kiest een categorie; de app stelt een categorie voor op basis van
   een vaste woordenlijst in `src/shared/categorieen.js` (bijvoorbeeld "tomaat" → Groente en
   fruit), standaard Overig.
4. Zolang niet definitief kan iedereen items toevoegen en zijn eigen items verwijderen.
5. Na "definitief" kan niemand items toevoegen of verwijderen en geen claims meer maken of
   intrekken op `boodschap`- en `keuken`-items; afvinken kan wel. De organisator kan definitief
   terugdraaien.
6. Afvinken is gedeeld: wat de één afvinkt, ziet de ander bij verversen.
7. "Kopieer als tekst" levert per categorie een kop en daaronder de items, zonder
   afgevinkte items, als platte tekst.
8. Bij elke boodschap toont de app de relevante tellingen uit eten en drinken, bijvoorbeeld
   "0,0 bier: 2 personen".

### 7.9 Categorieën van posten
Verblijf, Eten en drinken, Boodschappen, Activiteit, Vervoer, Overig (AAN-16).

### 7.10 Kookbeurten
1. Bij het vastleggen van het weekend maakt de app standaardmaaltijden: vrijdag diner,
   zaterdag ontbijt, lunch en diner, zondag ontbijt en lunch (AAN-18). De organisator past ze aan.
2. Iedereen kan zich als kok bij een maaltijd zetten en weer weghalen; meerdere koks mag.
3. Een kok voegt ingrediënten toe als `boodschap`-items met `maaltijdId`; die staan op de
   boodschappenlijst met de maaltijd erbij.
4. Een kok ziet bij zijn maaltijd de aantallen per eetwens en de teksten uit het vrije veld
   eten en drinken, zonder namen en in willekeurige volgorde (AAN-34).

### 7.11 Programma, kamers en carpool
1. Programma: alleen de organisator voegt punten toe. Weergave per dag, op begintijd (AAN-25).
2. Kamers: de organisator maakt kamers met naam en aantal slaapplaatsen en deelt deelnemers
   in. Bij elke deelnemer staat zijn wens voor een eigen kamer. Een kamer kan niet voller dan
   zijn slaapplaatsen (AAN-23).
3. Carpool: een deelnemer biedt een rit aan met vertrekplaats en vrije plaatsen; een ander
   kiest een rit om mee te rijden. Een rit kan niet voller dan de vrije plaatsen. De
   organisator kan iedereen indelen. Het scherm toont per deelnemer zijn woonplaats en wie
   nog geen rit heeft (AAN-24).
4. Afgehaakte deelnemers verdwijnen uit kamerindeling en ritten.

### 7.12 WhatsApp-teksten
1. De app maakt teksten en deelt ze via `navigator.share` waar beschikbaar, anders via
   `https://wa.me/?text=<tekst>`, en altijd met een kopieerknop.
2. Teksten: uitnodiging per persoon (naam en link, zonder pincode), pincode per persoon
   (alleen de pincode met de naam van de editie), herinnering (wie nog niet heeft ingevuld en
   de deadline), één per stap (wat er nu van iedereen wordt verwacht en welke stap daarna
   volgt, zonder datums), betaalverzoek per betaling ("Wil je €12,40 overmaken voor
   Weekendje weg 2027?").
3. Teksten bevatten nooit een pincode samen met een link en nooit een rekeningnummer (AAN-22).
4. Teksten en bevestigingen noemen alleen onderdelen die aan staan (`ONDERDELEN`, OND-2). Het bericht
   bij Accommodatie vraagt pas om een top 3 als er opties zijn; zonder opties zegt het dat de
   organisator binnenkort opties neerzet, en Stappen waarschuwt de organisator bij nul opties. Het
   bericht bij Afgerond noemt "afgerekend" alleen als er geen betaling meer open staat.

### 7.13 Geld
1. Bedragen in centen, getoond als `€ 1.234,56`.
2. **Gelijk:** bedrag gedeeld door het aantal geselecteerde deelnemers (minstens één), naar
   beneden afgerond op centen; de restcenten gaan naar de betaler als die in de verdeling zit,
   anders naar de eerste deelnemer op voornaam en daarna op `id` (AAN-10). "In de verdeling"
   betekent: geselecteerd, aandeel groter dan 0, of bedrag groter dan 0.
   Voorbeeld: €100,00 over Jan (betaler), Klaas, Piet → Jan 33,34, Klaas 33,33, Piet 33,33.
3. **Aandeel:** bedrag × aandeel / som van aandelen, naar beneden afgerond; restcenten zoals bij
   gelijk. Aandeel is een geheel getal 0 tot en met 20; de som moet groter dan 0 zijn.
   Voorbeeld: €90,00 met Jan 1, Klaas 2 → Jan 30,00, Klaas 60,00.
4. **Bedrag:** som van de bedragen moet gelijk zijn aan het totaal. De app toont tijdens het
   invoeren "nog € x te verdelen" of "€ x te veel" en opslaan kan pas bij nul (AAN-09).
   Elke verdeling telt dus exact op tot het bedrag; dat houdt de saldo-invariant.
5. Standaardverdeling van een nieuwe post: gelijk over alle niet-afgehaakte deelnemers.
6. **Saldo** per deelnemer = wat hij betaalde − zijn aandeel in uitgaven − wat hij ontving +
   zijn aandeel in ontvangsten + betalingen die hij deed − betalingen die hij kreeg. Som van
   alle saldi is altijd nul (invariant, getest).
7. **Afrekening:** eerst worden schuldenaars en schuldeisers met exact hetzelfde bedrag aan
   elkaar gekoppeld. Daarna herhaal tot alle saldi nul zijn: de grootste schuldenaar betaalt
   de grootste schuldeiser het kleinste van beide bedragen. Bij gelijke bedragen beslist de
   voornaam, daarna het `id`. Dit geeft hooguit (aantal saldi ongelijk aan nul) − 1
   betalingen. Dat is niet altijd het wiskundige minimum, maar voor groepen tot twintig
   personen goed genoeg (AAN-35).
8. Een betaling als betaald markeren voegt een rij in `Betalingen` toe; de afrekening wordt
   daarna opnieuw berekend. Zo kan afrekenen in rondes. Terugdraaien verwijdert de rij.
9. Afhaken verandert bestaande posten niet. Nieuwe posten hebben de afgehaakte niet in de
   standaardverdeling; handmatig toevoegen mag.
10. Wijzigt de organisator een post van een ander, dan krijgt die post blijvend de aantekening
    "aangepast door de organisator".

### 7.14 Startscherm per stap
| Stap | Deelnemer ziet bovenaan | Organisator ziet bovenaan |
|---|---|---|
| Invullen | Formulier, of "Klaar, wacht op de rest" met voortgang | Voortgang, herinnering, deadline |
| Weekendje prikker | Overlapoverzicht en voorkeursdatum | Detailoverzicht, knop "Weekend vastleggen" |
| Accommodatie | Accommodaties in de deelvorm, vastgelegd weekend | Accommodaties beheren, deelvorm |
| Voorbereiding | Boodschappenlijst, wie neemt wat mee, kookbeurten, carpool, kamer | Status per onderdeel, "Boodschappen definitief" |
| Weekend | Programma van vandaag, knop "Uitgave toevoegen" | Hetzelfde plus programma beheren |
| Afrekenen | Wat jij moet betalen of krijgt | Openstaande betalingen van iedereen |
| Afgerond | Samenvatting en de sectie Afgelopen weekenden (open) | Samenvatting, "Nieuwe editie", sectie Afgelopen weekenden |

Het menu heeft in elke stap dezelfde zeven items (NAV-10, AAN-12): Start, Invullen, Voortgang,
Weekendje prikker, Accommodatie, Meenemen, Afrekening. Weekendje prikker en Accommodatie tonen vóór
hun stap "Komt in stap ...". Meenemen en Afrekening zijn in elke stap open: wie wat meeneemt en
uitgaven kunnen vroeg beginnen (een voorschot op het huis, een lijstje spullen). De uitleg (UIT-2)
zegt dat ook. Het bovenschrift boven de titel van een scherm toont de schermnaam, niet de stap.
Boodschappen, kookbeurten, programma, kamers en carpool staan niet in
het menu en blijven bereikbaar via het startscherm. De organisator ziet bovenaan altijd zijn
eerstvolgende actie.

### 7.15 Archief
Per editie van de groep: jaar, vastgelegd weekend, geboekte accommodatie (naam, plaats,
link), organisator(en) en deelnemers. Zichtbaar voor iedere deelnemer met een geldige link
van een editie van die groep (AAN-30).

### 7.16 Gelijktijdigheid
1. Elke schrijfactie draait binnen `LockService.getScriptLock()` met 10 seconden wachttijd,
   in deze volgorde: slot pakken, de benodigde tabs lezen, rechten en versie controleren,
   valideren, schrijven, `SpreadsheetApp.flush()`, slot vrijgeven (in `finally`). Lukt het
   slot niet, dan foutcode `druk`; de voorkant probeert één keer automatisch opnieuw en meldt
   daarna "Even druk, probeer het opnieuw".
2. Rijen met `versie` worden alleen gewijzigd als de meegestuurde versie gelijk is; anders
   `gewijzigd`. Leesacties draaien zonder slot; elke schrijfactie is onder het slot atomair.
3. Claims, stemmen, koks, meerijders en betalingen zijn eigen rijen en hebben geen versie.
4. De voorkant haalt de gegevens van het open scherm opnieuw op bij openen van de app, bij
   terugkeren naar het tabblad (`visibilitychange`) en na elke eigen grote actie. Na een kleine handeling
   uit de wachtrij volgt geen herlaadronde.
5. **Wachtrij.** Kleine handelingen (claimen, claim intrekken, afvinken, formuliervelden en tags; vanaf
   fase 27 ook de top 3) staan direct in beeld en gaan via een wachtrij naar het script (AAN-83). Na
   1 seconde stilte stuurt de voorkant één `bundel`; een nieuwere handeling op hetzelfde item of veld
   vervangt de vorige die nog niet onderweg is. De wachtrij staat per sessie-eigenaar
   (`<scriptId>:<soort>:<editieId>`, zonder geheimen) in localStorage, altijd in try/catch, en gaat bij
   het volgende openen alsnog. Het script voert de bundel uit onder één slot met één flush; elke actie
   loopt door haar eigen rechten, validatie en Log en krijgt een eigen uitslag. Bij een netwerkfout
   probeert de voorkant het opnieuw na 2, 4, 8, 16 en 30 seconden (AAN-82); lukt het dan niet, of weigert
   het script een actie, dan gaat de wijziging terug in beeld met een melding en de knop Opnieuw. Grote
   acties (weekend vastleggen of losmaken, boeken, onthullen, deelvorm, stap zetten, item toevoegen of
   verwijderen, post opslaan, betaling markeren en alle beheeracties) gaan niet via de wachtrij.

### 7.17 Versie van het script
De voorkant stuurt `apiVersie` mee. Wijkt die af van het script, dan antwoordt het script met
`api_versie` en toont de voorkant: "Het script van deze groep is verouderd. De eigenaar werkt
het bij via …" met een link naar de uitleg in de README (AAN-14).

`API_VERSIE` staat in `src/server/api.js` en `src/web/api.js` en is vanaf feedbackronde 2 gelijk
aan 2. Elke wijziging van de actielijst (`ACTIES`, nieuwe of vervallen actie) verhoogt hem aan
beide kanten. Een test bewaart een snapshot van de actielijst met de versie erbij en faalt als de
lijst wijzigt zonder versieverhoging (NFR-22). Bij de uitrol gaan voorkant en script kort na
elkaar live.

### 7.18 Opzetlink en uitrolinstellingen
1. **Uitrolinstellingen.** `src/shared/uitrol.js` heeft twee constanten: `APP_ADRES` (het
   adres van de app op Pages, `https://`, eindigt op `/`) en `SJABLOON_KOPIE` (de kopieerlink
   van de sjabloon-Sheet, `https://docs.google.com/spreadsheets/d/<id>/copy`). Het zijn geen
   geheimen; ze staan in de publieke repo. Voorkant en script importeren ze, het script krijgt
   ze mee bij `clasp push` naar de sjabloon en elke kopie erft ze. Leeg mag: dan werkt alles
   zoals in versie 0.3 (het menu toont code en webapp-URL om over te nemen, de rondleiding
   heeft geen knop "Kopie maken"). Een ingevulde waarde met een andere vorm laat
   `npm run check` falen (AAN-77).
2. **Webapp-ID.** Het menu "Groep opzetten" bepaalt het deployment-ID in deze volgorde:
   `ScriptApp.getService().getUrl()` als die eindigt op `/exec`; anders de script-eigenschap
   `webappId`; anders vraagt het menu één keer de webapp-URL, met dezelfde regels als GRP-2
   (een `/dev`-URL wordt geweigerd met uitleg), en bewaart het ID als `webappId`. "Beheerlink
   maken" gebruikt dezelfde volgorde zonder te vragen (AAN-79).
3. **Opzetlink.** `<APP_ADRES>#/opzetten?b=<webappId>&code=<setupcode>`. Alles staat na het
   `#` en komt dus niet in een serverlog of bij GitHub. De setupcode is eenmalig en 30 minuten
   geldig (AAN-28), dus de link geeft geen blijvende toegang. `leesLink` herkent een opzetlink
   nooit als persoonlijke link of beheerlink. De app leest `b` en `code` uit en zet het adres
   meteen terug op `#/opzetten` met `history.replaceState` (AAN-78).
4. **Dialoog.** Het menu toont de opzetlink in een dialoog via `HtmlService` en
   `showModalDialog`: een knop die de link in een nieuw tabblad opent
   (`target="_blank" rel="noopener noreferrer"`), een alleen-lezen veld met de link om te
   kopiëren, en de geldigheid van de code. Alle waarden in de HTML zijn ge-escaped en er staat
   geen ander extern adres in dan `APP_ADRES`. De scopes in `appsscript.json` blijven gelijk
   (`showModalDialog` valt onder `script.container.ui`).
5. **API.** Er komt geen nieuwe API-actie en `API_VERSIE` blijft gelijk, zodat bestaande
   groepen niet "verouderd" melden.

## 8. Functionele eisen en acceptatiecriteria

### Toegang (TOE)
- **TOE-1** Een persoonlijke link zonder geldige pincode toont alleen het pinscherm; geen naam, editie of voortgang.
- **TOE-2** Met juiste link en pincode komt de deelnemer in zijn editie en blijft hij 60 dagen ingelogd op dat apparaat, behalve als de browser de opslag eerder wist.
- **TOE-3** Vijf foute pincodes blokkeren het token 15 minuten; het pinscherm toont tot wanneer.
- **TOE-4** Na drie blokkades werkt de pincode niet meer en meldt de app dat de organisator een nieuwe moet maken; een nieuwe pincode of link zet de teller op nul.
- **TOE-5** Een beheerlink vraagt bij eerste gebruik een wachtwoord van minimaal 10 tekens en daarna bij elke login; een beheersessie verloopt na 12 uur.
- **TOE-6** Elke API-actie met gegevens zonder geldige sessie geeft `geen_toegang`, ook bij rechtstreeks aanroepen van het script.
- **TOE-7** Een deelnemerssessie kan geen beheeractie uitvoeren; elke rij in de rechtentabel §6 heeft een test.
- **TOE-8** Link en pincode zijn alleen direct na maken of vernieuwen in klare tekst zichtbaar.
- **TOE-9** "Uitloggen" verwijdert de sessie op het apparaat en in de Sheet.
- **TOE-10** De voorkant weigert een `scriptId` dat niet aan het patroon in §7.1.2 voldoet.
- **TOE-11** Zonder sessie toont de app een veld "Plak je persoonlijke link"; een geplakte link of beheerlink leidt naar het pin- of wachtwoordscherm (e2e-test met een geïnstalleerde context zonder fragment).
- **TOE-12** De organisator vernieuwt de link van een deelnemer; de oude link en de bestaande sessies van die deelnemer werken direct niet meer.
- **TOE-13** Een wachtwoordmanager breekt inloggen niet: staat er al een link in het fragment, dan toont het pinscherm alleen "Link herkend" zonder plakveld; de pinvakjes zijn `type="text"` met `inputmode="numeric"` en `autocomplete="one-time-code"`, en plakveld en pinvakjes hebben `data-1p-ignore`, `data-lpignore="true"` en `data-bwignore` (BV-06).

### Groep opzetten (GRP)
- **GRP-1** Het Sheet-menu "Weekendje weg" heeft: Groep opzetten, Beheerlink maken, Beheerwachtwoord resetten, Uitleg.
- **GRP-2** De opzetwizard in de app vraagt de script-URL (alleen `/macros/s/<id>/exec`, een `/dev`-URL wordt geweigerd met uitleg), de setupcode, de groepsnaam, de leden (voornaam, woonplaats), welk lid de eigenaar is en een beheerwachtwoord, en zet de groep op.
- **GRP-3** Een tweede `groepOpzetten` op een opgezette groep wordt geweigerd.
- **GRP-4** Na opzetten toont de wizard de beheerlink met een kopieerknop en de uitleg om hem te bewaren.
- **GRP-5** De organisator kan leden toevoegen, hun woonplaats wijzigen en ze inactief maken; leden worden nooit verwijderd. Zichzelf inactief maken kan niet (geen knop, de server weigert). Een nieuw lid met dezelfde voornaam als een bestaand lid geeft een waarschuwing (BV-15, AAN-90).
- **GRP-6** "Groep opzetten" in het Sheet-menu bepaalt het webapp-ID (§7.18.2), maakt een setupcode en toont de opzetlink in de dialoog uit §7.18.4. Is de groep al opgezet, dan zegt het menu dat en maakt het geen code. Is `APP_ADRES` leeg, dan toont de dialoog de setupcode en de webapp-URL om in de wizard te plakken.
- **GRP-7** Een opzetlink opent de wizard bij stap 1 met script-URL en setupcode ingevuld, een korte regel dat de Sheet gekoppeld is, en de focus op de groepsnaam. In de adresbalk en de geschiedenis staat daarna alleen `#/opzetten`. Een opzetlink met een ongeldige `b` of `code` opent stap 0 met de melding "Deze opzetlink klopt niet. Kies in de Sheet opnieuw Weekendje weg en Groep opzetten."
- **GRP-8** Met `APP_ADRES` ingevuld toont "Beheerlink maken" de volledige beheerlink in dezelfde dialoog als GRP-6, met kopieerveld.

### Editie (EDI)
- **EDI-1** Een organisator maakt een editie met titel, jaar, periode, voorkeursmaanden (standaard 4, 5, 9, 10), deadline, deelnemers, organisator(en) en aan/uit per optioneel blok.
- **EDI-2** De organisator past de lijsten van activiteiten, programma en sfeer, eten en drinken en de startlijsten van wie neemt wat mee aan.
- **EDI-3** De organisator voegt eigen vragen toe, wijzigt en verwijdert ze, van de types ja/nee, keuze, meerkeuze, schaal 1-5 en tekst, tot de stap Overzicht; zodra een vraag een antwoord heeft, zijn alleen de tekst en het verwijderen nog mogelijk, en antwoorden op verwijderde vragen tellen niet mee.
- **EDI-4** "Links maken" toont per deelnemer zijn link en pincode met de twee WhatsApp-teksten en kopieerknoppen.
- **EDI-5** De organisator vernieuwt de pincode van één deelnemer; de oude werkt direct niet meer.
- **EDI-6** De organisator maakt een beheerlink voor een lid, zoals een tweede organisator of de organisator van een nieuwe editie; dat lid kiest bij eerste gebruik zijn eigen wachtwoord.
- **EDI-7** De organisator zet de stap volgens §7.2, met de bevestigingen van §7.2.7; elke wijziging toont daarna de WhatsApp-tekst van de nieuwe stap volgens §7.12.4, zonder datums van latere stappen. Van Afgerond kan hij terug naar Afrekening.
- **EDI-8** Vervallen (fase 24): de stappen hebben geen verwachte datums meer, zie §7.2.4.
- **EDI-9** De organisator markeert een deelnemer als afgehaakt en kan dat terugdraaien; de gevolgen volgen §7.7.5, §7.11.4 en §7.13.9.
- **EDI-10** De organisator verlengt de deadline zolang de stap Invullen is; stappenbeheer stelt alleen de deadline in. Teksten bij de deadline zeggen "Graag ingevuld vóór ...", nooit dat de deadline het invullen afsluit (DDL-1, BV-10).
- **EDI-11** "Nieuwe editie" stelt voor: jaar = het eerste jaar vanaf het huidige zonder editie van de groep, titel "Weekendje weg <jaar>", periode het kalenderjaar (AAN-15); blokken, lijsten en leden komen van de vorige editie (ARC-2, AAN-89, BV-11).
- **EDI-12** Een eigen vraag van type Eén keuze of Meerkeuze vraagt minstens twee opties ("Geef minstens twee antwoordopties."); een nieuwe poging wist de vorige melding (BV-12).

### Stappenbalk en startscherm (STA)
- **STA-1** Bovenaan elk scherm staat de stappenbalk met zeven stappen met de namen uit §7.2.1: afgerond met vinkje, huidige uitgelicht, later grijs, zonder datums.
- **STA-2** Op mobiel toont de stappenbalk de huidige stap met de vorige en volgende; tikken klapt alle stappen uit.
- **STA-3** Het startscherm van deelnemer en organisator volgt de tabel in §7.14.
- **STA-4** Het startscherm van de organisator toont zijn eerstvolgende actie als knop, met één kop. In de stap Invullen is dat "Iedereen uitnodigen" (naar Uitnodigen) zolang niet elke deelnemer een link heeft, daarna "Herinnering sturen" (BV-08, BV-33).
- **STA-9** Start toont geen tekst `null`, geen regel "Je bent ingelogd." met Uitloggen (dat staat in het profielmenu), de editietitel één keer, "Hoe werkt het?" als kleine tekstlink, geen aftelteller na Afgerond, en Afgelopen weekenden met een klapicoon en bij leeg "Nog geen afgelopen weekenden" (BV-02, BV-20 t/m BV-23, BV-33).
- **STA-5** Zodra het weekend vastligt, toont het startscherm een aftelteller in dagen tot de vrijdag, op de dag zelf "Vandaag!".
- **STA-6** Het hoofdmenu hangt niet meer af van de stap: het heeft altijd de items van NAV-10. Archief en Uitleg staan er niet in (NAV-1).
- **STA-8** De stap van een editie heeft één bron, de editie in de Sheet (§7.2.6). Na een stapwijziging in beheer tonen stappenbalk, menu en startscherm bij elke rol en op elk scherm na verversen dezelfde stap; een test met twee contexten bewijst dit.

### Uitleg van de stappen (UIT)
- **UIT-1** Bij het eerste bezoek aan Start op een apparaat staat bovenaan de kaart "Zo gaat het weekend": een kleine tijdlijn van de zes stappen tot en met Afrekening. De kaart is te sluiten; daarna blijft hij weg (vlag `ww-route-gezien` in localStorage, AAN-85).
- **UIT-2** Per stap staan de naam (uit STAPNAMEN), wat er gebeurt, wat het oplevert en wat jij doet, met een eigen tekst voor deelnemer en organisator. De teksten staan in `src/web/uitleg.js`, noemen geen uitgezette onderdelen (OND-1) en noemen de deadline alleen bij Invullen.
- **UIT-3** Op Start haalt de knop "Hoe werkt het?" de route terug.
- **UIT-4** Bij de stappenbalk staat een info-icoon dat de uitleg van de huidige stap opent (NAV-7).

### Kalender (KAL)
- **KAL-1** De kalender toont alle weekenden in de periode per maand, blanco bij de start.
- **KAL-2** Tikken of toetsenbord wisselt een weekend volgens §7.3.2, met kleur én symbool per waarde.
- **KAL-3** Weekenden in een voorkeursmaand zijn gemarkeerd; een legenda legt dit uit.
- **KAL-4** Per weekend zijn schoolvakanties per regio, feestdagen en lange weekenden zichtbaar volgens §7.3.4.
- **KAL-5** De feestdagen voor 2026 tot en met 2030 kloppen met een vaste testtabel.
- **KAL-6** `npm run vakanties` schrijft `data/vakanties.json` uit de open data van de Rijksoverheid; buiten de bekende schooljaren toont de kalender "vakanties nog niet bekend".
- **KAL-7** Een knop "Hele maand" zet alle lege weekenden van een maand in één keer op een gekozen waarde.

### Formulier (FRM)
- **FRM-1** Het formulier toont de blokken volgens §7.4.1 en §7.4.2 en de blokinstellingen van de editie.
- **FRM-2** Budget verblijf en budget weekend zijn schuifjes met de schijven uit §7.4.3, met het gekozen bereik als tekst erbij.
- **FRM-3** Reistijd en woonplaats volgen §7.4.4.
- **FRM-4** Het blok Verblijf heeft de acht wensen uit §5.2 met de toelichting uit §7.4.5.
- **FRM-5** Activiteiten, programma en sfeer en eten en drinken zijn vinkjeslijsten uit de editielijsten, elk met een taginvoer voor wat de lijst niet noemt.
- **FRM-6** Het blok Samenwerken op vrijdag verschijnt alleen als de organisator het aanzet.
- **FRM-7** Eigen vragen worden getoond met het invoerelement dat bij hun type hoort.
- **FRM-8** Elk veld slaat zichzelf op via de wachtrij (K4), ook in een half formulier; de indicator toont "Opgeslagen" en het formulier de status ingevuld volgens §7.4.8.
- **FRM-9** Vanaf de stap Overzicht is het formulier alleen-lezen met de reden erbij; de deadline sluit het niet (DDL-1).
- **FRM-10** Per veld wint de laatste schrijfactie (AAN-83); twee apparaten die verschillende velden wijzigen, houden allebei hun wijziging, en terug op het tabblad laadt het formulier de nieuwste antwoorden.
- **FRM-11** Gedeeltelijk opslaan: alleen de kalender is verplicht, budgetten, reistijd en verblijf zijn optioneel met "(optioneel)" in de kop; een deelnemer met alleen beschikbaarheid telt als ingevuld.

### Onderdelen en deadline (OND, DDL)
- **OND-1** Boodschappen, kookbeurten, programma, kamerindeling en carpool hebben elk één vlag in `src/shared/onderdelen.js`; alle vijf staan uit (AAN-80).
- **OND-2** Een onderdeel dat uitstaat is weg uit menu, start, eerstvolgende actie, status per onderdeel en uitleg; zijn route bestaat niet. Acties en tabs in de Sheet blijven ongemoeid.
- **OND-3** De voorkeuren voor eten en doen blijven bij Invullen (vinkjes uit de editielijsten plus tags, alles optioneel) en komen terug bij de organisator.
- **DDL-1** De deadline staat alleen bij Invullen en in Voortgang en is informatief: hij blokkeert opslaan niet.

### Voortgang en overzicht (OVZ)
- **OVZ-1** Iedereen ziet per deelnemer een vinkje voor ingevuld of nog niet, plus de deadline (informatief, DDL-1).
- **OVZ-2** De organisator ziet een herinneringsknop die de WhatsApp-tekst met de namen van wie nog niet heeft ingevuld maakt.
- **OVZ-3** Vanaf de stap Overzicht zien deelnemers het overlapoverzicht volgens §7.5.3; daarvoor ziet een deelnemer alleen "Het overzicht verschijnt als de organisator het vrijgeeft".
- **OVZ-4** De heatmap toont per weekend de aantallen ja, misschien en nee, de voorkeursmaand en de vakantiekenmerken.
- **OVZ-5** De top 5 volgt de rangorde van §7.5.2; de bovenste is als voorkeursdatum gemarkeerd.
- **OVZ-6** De organisator ziet het detailoverzicht per persoon en per blok volgens §7.5.4.
- **OVZ-7** Een test bewijst dat het overzicht voor een deelnemer geen antwoorden per persoon bevat.

### Accommodatie (ACC)
- **ACC-1** De organisator legt het weekend vast vanuit de top 5 of uit de kalender.
- **ACC-6** Er staat maar één weekend vast. Daarna is het gekozen weekend gemarkeerd, zijn de andere vastlegknoppen uitgeschakeld en weigert de server een tweede vastlegging met `gesloten`.
- **ACC-7** "Ander weekend kiezen" maakt het weekend los (`weekendLosmaken`, stappen Weekendje prikker, Accommodatie en Meenemen) na een bevestiging die toont wat het raakt: de aftelteller en een geboekte accommodatie, die bij de oude datum blijft horen (AAN-81). Vastleggen en Ander weekend kiezen staan voor de organisator op Weekendje prikker en onder Accommodaties beheren; vanaf Weekend staat de melding met link naar Stappen uit §7.6.8 (BV-01).
- **ACC-2** De organisator voegt accommodaties toe, wijzigt en verwijdert ze (naam, plaats, link, totaalprijs, notitie).
- ~~ACC-3, ACC-4, ACC-5~~ Vervallen in fase 27, vervangen door ACC-8 t/m ACC-14.
- **ACC-8** De organisator kiest per editie Verrassing of Samen kiezen (§7.6.2); een nieuwe editie begint met Samen kiezen.
- **ACC-9** Bij een verrassing die niet onthuld is, ontvangt een deelnemer uit geen enkele leesactie naam, plaats, link, bedden of eigen kamers, alleen dat het geregeld is ("✓ Geregeld"); de organisator ziet alles en krijgt in Wie betaalt wat een waarschuwing. De WhatsApp-tekst van de stap Accommodatie noemt dan geen opties.
- **ACC-10** Alleen de organisator onthult, na een bevestiging, op elk moment vanaf de stap Accommodatie en ook na Afgerond; nooit automatisch en definitief. Geboekt is genoeg voor de volgende stap. Na onthullen van een verrassing krijgt een deelnemer alleen de geboekte accommodatie, nooit de andere opties (BV-29).
- **ACC-11** Bij Samen kiezen geeft elke deelnemer een top 3 (minder bij minder opties) met 3, 2 en 1 punt; opnieuw opgeven vervangt de eerdere keuze. Kan vanaf de stap Accommodatie tot er geboekt is, via de wachtrij.
- **ACC-12** De organisator ziet een ranglijst met per optie punten, een balk en het aantal mensen, en hoeveel deelnemers een top 3 gaven; deelnemers zien de stand zonder namen.
- **ACC-13** De organisator boekt een optie, wijzigt en verwijdert opties en wisselt van vorm zolang er niets geboekt is; verwijderen neemt de voorkeuren mee en van de geboekte geeft "nog geen accommodatie gekozen".
- **ACC-14** Een optie heeft optioneel bedden en eigen kamers (hele getallen vanaf 0, eigen kamers niet meer dan bedden), getoond als "8 bedden · 3 eigen kamers" bij elke optie in de lijsten en na onthullen.

### Wie neemt wat mee en boodschappen (MEE)
- **MEE-1** De lijst toont drie secties: Spullen, Uit eigen keuken, Boodschappen, met per item de namen van wie het meeneemt.
- **MEE-2** Tikken op "Ik neem mee" voegt een claim toe; tikken op je eigen naam trekt hem in.
- **MEE-3** Twee gelijktijdige claims op hetzelfde item leveren beide namen op (test met twee parallelle verzoeken).
- **MEE-4** Iedereen voegt items toe met naam, soort en categorie; de categorie wordt voorgesteld volgens §7.8.3.
- **MEE-5** De boodschappenlijst toont ongeclaimde items van soort boodschap en keuken in de categorievolgorde van §7.8.2.
- **MEE-6** Na "definitief" gelden de beperkingen van §7.8.5 en toont de lijst "Definitief".
- **MEE-7** Afvinken werkt voor iedereen en is gedeeld; afgevinkte items staan doorgestreept onderaan hun categorie.
- **MEE-8** "Kopieer als tekst" levert de tekst volgens §7.8.7.
- **MEE-9** Bij boodschappen staan relevante tellingen uit eten en drinken volgens §7.8.8.
- **MEE-10** De organisator kiest bij een item "Toewijzen aan ..." en een deelnemer; dat maakt een claim op naam van die deelnemer (§7.7.4). Een deelnemerssessie die dit probeert, krijgt `geen_toegang` (TOE-7). Het invoerveld onder Uit eigen keuken toont geen categorie zolang Boodschappen uit staat (OND-2, BV-30, BV-31).

### Kookbeurten (KOK)
- **KOK-1** Bij het vastleggen van het weekend verschijnen de standaardmaaltijden; de organisator past ze aan.
- **KOK-2** Iedereen meldt zich aan of af als kok; meerdere koks per maaltijd kan.
- **KOK-3** Een kok voegt ingrediënten toe die met de naam van de maaltijd op de boodschappenlijst komen.
- **KOK-4** Een kok ziet bij zijn maaltijd de eetwensen volgens §7.10.4, zonder namen; een test bewijst dat het antwoord geen deelnemer-ID's bevat.

### Programma (PRG)
- **PRG-1** De organisator voegt programmapunten toe, wijzigt en verwijdert ze (dag, begin, eind, titel, adres, link, notitie).
- **PRG-2** Iedereen ziet het programma per dag op tijd; een adres opent als kaartlink (`https://maps.google.com/?q=`).
- **PRG-3** In de stap Weekend toont het startscherm het programma van vandaag met het volgende punt uitgelicht.

### Kamers en carpool (KMR, CAR)
- **KMR-1** De organisator maakt kamers en deelt deelnemers in volgens §7.11.2; deelnemers zien de indeling.
- **CAR-1** Een deelnemer biedt een rit aan of rijdt mee volgens §7.11.3; iedereen ziet de ritten en wie nog geen rit heeft.
- **CAR-2** De organisator kan iedere deelnemer bij een rit in- of uitdelen.

### Geld (GELD)
- **GELD-1** Iedere deelnemer voegt een uitgave of ontvangst toe met omschrijving, bedrag, betaler, datum, categorie en verdeling.
- **GELD-2** De verdeling kent drie wijzen: gelijk met een knop "Iedereen", aandeel met een teller per persoon, bedrag per persoon.
- **GELD-3** Bij bedrag per persoon toont de app het verschil met het totaal en kan opslaan pas bij nul.
- **GELD-4** Afronden en restcenten volgen §7.13.2 en §7.13.3, met de voorbeelden als test.
- **GELD-5** Een deelnemer wijzigt en verwijdert alleen eigen posten; de organisator alle posten, met de aantekening uit §7.13.10.
- **GELD-6** De lijst van posten toont per post betaler, bedrag, categorie en jouw aandeel, plus totalen per categorie.
- **GELD-7** Het saldo per deelnemer volgt §7.13.6; de som is altijd nul (eigenschapstest met willekeurige posten).
- **GELD-8** De afrekening volgt §7.13.7 en heeft nooit meer betalingen dan het aantal saldi ongelijk aan nul min één.
- **GELD-9** Een betaling markeren als betaald of terugdraaien werkt de afrekening direct bij, ook na Afgerond (AAN-29, BV-25).
- **GELD-10** Bij elke openstaande betaling maakt de ontvanger met één knop een betaalverzoek als WhatsApp-tekst.
- **GELD-11** Afhaken volgt §7.13.9.
- **GELD-12** Wie van Gelijk of Aandeel naar Bedrag per persoon wisselt, krijgt de velden voorgevuld met de bedragen van de vorige verdeling; er staat dan "nog € 0,00 te verdelen" (BV-34).

### Archief (ARC)
- **ARC-1** De sectie "Afgelopen weekenden" op de startpagina toont de afgeronde edities van de groep volgens §7.15, nieuwste bovenaan, elk met een link "Bekijk" (NAV-4). Het scherm `#/archief` blijft bestaan voor bestaande links en toont alle edities.
- **ARC-2** Vanuit een afgeronde editie maakt de organisator een nieuwe editie die leden, lijsten en blokinstellingen overneemt.

### Rondleiding en installatie (RON)
- **RON-1** Bij eerste gebruik op een apparaat volgt een rondleiding van hooguit vijf schermen: welkom, pincode bewaren, op het beginscherm zetten, de stappenbalk, waar je begint.
- **RON-2** De installatie-uitleg herkent iOS Safari, iOS met een andere browser, Android Chrome en desktop Chrome of Edge, en toont de passende stappen; op iOS met de volgorde uit §7.1.8 en een knop "Kopieer mijn link"; andere browsers krijgen "Zet een bladwijzer".
- **RON-3** Op Android en desktop Chromium toont de app een knop "Installeren" via `beforeinstallprompt`.
- **RON-4** De rondleiding is later terug te vinden in het profielmenu onder "Uitleg".
- **RON-5** De opzetwizard (GRP-2) begint met een rondleiding voor de eigenaar in drie stappen: een kopie van de sjabloon maken (knop "Kopie maken" naar `SJABLOON_KOPIE`, als die is ingevuld), het script implementeren en toestemming geven (met de uitleg dat je bij "Google heeft deze app niet geverifieerd" via Geavanceerd verder gaat), en in de Sheet Weekendje weg en Groep opzetten kiezen en op de link klikken. Een knop "Ik heb de URL en de setupcode al" leidt naar de handmatige route van stap 1.
- **RON-6** De app is installeerbaar: manifest met naam, iconen 192 en 512 pixels en maskable, `display: standalone`, en een service worker die alleen de app-schil cachet.

### Taginvoer (TAG)
- **TAG-1** De velden `activiteitenEigen`, `programmaEigen` en `etenDrinkenEigen` zijn taginvoer.
- **TAG-2** Toevoegen met Enter, komma of de knop Toevoegen; het veld verlaten voegt de typende tekst toe; Tab maakt geen tag.
- **TAG-3** Elke tag heeft een kruisje; Backspace in een leeg veld verwijdert de laatste.
- **TAG-4** Plakken splitst op komma, puntkomma en regeleinde.
- **TAG-5** Trimmen, ontdubbelen op genormaliseerde waarde, 40 tekens, 20 tags; in het veld en in het script.
- **TAG-6** Suggesties uit de niet aangevinkte vinkjes; een term gelijk aan een vinkje zet dat vinkje aan.
- **TAG-7** Opslag als lijst per veld onder dezelfde sleutels.
- **TAG-8** Oude tekst wordt bij lezen als lijst gelezen zonder verlies van inhoud.
- **TAG-9** Organisator-detail en koks tonen de losse tags; KOK-4 blijft anoniem.
- **TAG-10** De opties van een eigen vraag worden taginvoer.

### Synchronisatie (SYNC)
- **SYNC-1** Een kleine handeling (§7.16.5) staat direct in beeld en in de lokale stand van het scherm, zonder blokkerende lader en zonder uitgeschakelde knoppen.
- **SYNC-2** Na 1 seconde zonder nieuwe handeling gaan alle wachtende handelingen in één aanroep `bundel` naar het script; tien snelle klikken leveren hooguit drie aanroepen.
- **SYNC-3** De wachtrij staat in localStorage (altijd in try/catch) en wordt bij het volgende openen van de app alsnog verstuurd.
- **SYNC-4** Eén indicator op een vaste plek in de kopregel toont "Opslaan…", "Opgeslagen" of "Niet opgeslagen, opnieuw proberen"; er is geen melding per klik.
- **SYNC-5** Bij een fout probeert de voorkant het opnieuw met oplopende wachttijd (AAN-82); lukt het definitief niet, of weigert het script de actie, dan gaat de wijziging terug in beeld met een korte melding in gewone taal (NFR-21) en de knop Opnieuw. Na herladen staat er geen melding "Niet opgeslagen" meer als er niets terug te zetten is (BV-24).
- **SYNC-6** Zolang er handelingen in de wachtrij staan, waarschuwt de browser bij het verlaten van de pagina.
- **SYNC-7** Elke kleine handeling schrijft één rij of één veld, is idempotent en de laatste schrijfactie wint (AAN-83); de bundel draait onder het slot van §7.16.1, zodat twee mensen die tegelijk verschillende items wijzigen allebei hun wijziging houden.
- **SYNC-8** Grote acties wachten op de Sheet: de knop waarmee ze begonnen krijgt een bezig-status (`aria-busy` en een zichtbare tekst als "Opslaan…" in de knop), de schil toont "Opslaan…" en andere schrijfknoppen doen tot het antwoord niets. De bevestiging staat bij het veld of de knop, niet boven de sectie; na succes wordt het invoerveld leeg (BV-13, BV-35).

### Navigatie (NAV)
- **NAV-1** Het hoofdmenu bevat de items van NAV-10, zonder Archief en Uitleg.
- **NAV-2** Een profielknop in de kopregel, rechts, op dezelfde plek op mobiel en desktop, opent een menu met naam en rol ("David · organisator"), Uitleg, Installeren (alleen als de browser dat toestaat) en Uitloggen (BV-36).
- **NAV-3** Het profielmenu sluit met Escape, met een tik buiten het menu en na een keuze; de focus keert terug naar de knop; aanraakdoelen zijn minstens `--tap-min`.
- **NAV-4** De startpagina heeft een uitklapbare sectie "Afgelopen weekenden" met afgeronde edities: dicht bij een lopende editie, open bij een afgeronde.
- **NAV-5** De editiekiezer bevat alleen edities die niet zijn afgerond, plus de gekozen editie.
- **NAV-6** De rondleiding van RON-1 blijft ongewijzigd en opent via Uitleg in het profielmenu.
- **NAV-7** Vraagtekens met hints (hooguit 200 tekens, geen hover) bij Kalender, Budget, de drie tagblokken, Wie neemt wat mee, Boodschappen, Kookbeurten en Uitgaven. De stappenbalk heeft er een (UIT-4).
- **NAV-8** Uitloggen is vanaf elk scherm bereikbaar via het profielmenu.
- **NAV-9** In een beheersessie staan de beheerschermen (Leden, Nieuwe editie, Uitnodigen, Lijsten, Vragen, Per persoon, Stappen, Accommodaties beheren) achter één menu-item Beheren met een overzicht, los van de zeven items na een scheidingslijn; het item is actief op elk beheerscherm.
- **NAV-10** Het hoofdmenu toont altijd Start, Invullen, Voortgang, Weekendje prikker, Accommodatie, Meenemen en Afrekening, in die volgorde en met de namen van de stappenbalk; het item van de huidige stap heeft een stip. Een beheersessie heeft geen Invullen. Een scherm dat nog niet aan de beurt is, toont "Komt in stap ...". Route `#/overzicht` blijft werken.
- **NAV-11** Afrekening heeft twee tabs: Wie betaalt wat (`#/posten`) en Eindafrekening (`#/afrekening`). Het menu-item opent Wie betaalt wat en is actief op beide; de oude adressen blijven werken.
- **NAV-12** Op mobiel (onderste menu) tonen alle zeven items alleen hun icoon; het actieve item toont ook zijn label. `aria-label` blijft de volle naam. Het menu past van 360 pixels breed zonder horizontaal scrollen. Accommodatie heeft een bed-icoon, anders dan het huisje van Start (BV-16, BV-17).
- **NAV-13** Een onbekende route stuurt door naar `#/start` met `history.replaceState`, zodat het foute adres niet in de adresbalk blijft (BV-14).
- **NAV-14** Op desktop (vanaf 1024 pixels) is de inhoud tot ongeveer 900 pixels breed, staat het menu uitgelijnd met de stappenbalk en kort de stappenbalk geen stapnamen af zolang er ruimte is; de kopregel toont de editienaam naast de profielknop (BV-19).
- **NAV-15** De editietitel staat één keer bovenaan: de uitgeklapte stappenbalk herhaalt hem niet als het scherm hem al als kop of bovenschrift toont. Het bovenschrift boven een titel is de schermnaam (BV-18, BV-20).

## 9. Design

Zie `05-designbrief.md`. Het ontwerp staat in Claude Design en als bestanden in
`docs/design/`: `tokens.css` (licht en donker), de iconen en per scherm een artboard
(`*.dc.html`, lees de markup en de klassen; de README daar koppelt artboards aan eisen).
Fase 2 neemt `tokens.css` over als basis. Eerst komen: tokens als CSS-variabelen (licht en donker),
glaspaneel, stappenbalk, kaart, knop, invoerveld, schuif, vinkje, drieknop
(ja/misschien/nee), toast, lege toestand.

## 10. Niet-functionele eisen

- **NFR-1 Geheimen.** Tokens en sessies staan als SHA-256, pincodes en wachtwoorden als gezouten iteratieve hash (§7.1.4). Geen geheim in de code, in de repo of in logregels.
- **NFR-2 Transport.** Alleen https; `fetch` gaat uitsluitend naar `script.google.com` (dat doorverwijst naar `script.googleusercontent.com`).
- **NFR-3 Bronregels.** `scripts/check-bronregels.mjs` faalt bij: een `fetch`-doel buiten `script.google.com`; een vaste link in `src/web` buiten de navigatielijst (`wa.me`, `maps.google.com`); `innerHTML` met variabele inhoud; `eval` of `new Function`; een `<script src>` naar buiten; geheimen-achtige strings. Door gebruikers ingevoerde links (accommodatie, programma) worden alleen getoond als ze met `https://` beginnen, met `rel="noopener noreferrer"`.
- **NFR-4 CSP.** `index.html` heeft een Content-Security-Policy-meta: `default-src 'self'; connect-src https://script.google.com https://script.googleusercontent.com; img-src 'self' data:; style-src 'self'; script-src 'self'; manifest-src 'self'; worker-src 'self'`. Een test leest de meta uit de gebouwde `index.html`.
- **NFR-5 Uitvoer.** Alle gebruikerstekst wordt met `textContent` of veilige DOM-functies getoond; een XSS-test voert `<img src=x onerror=alert(1)>` in elk tekstveld in.
- **NFR-6 Validatie.** Het script valideert elk veld (type, lengte, bereik, enum) en weigert onbekende velden.
- **NFR-7 Minimale gegevens.** Geen e-mail, telefoon, adres of rekeningnummer van deelnemers.
- **NFR-8 Prestaties.** De app-schil is zichtbaar binnen 1 seconde uit de cache (Playwright). Elk scherm doet bij openen precies één leesactie (`scherm`) en toont tot het antwoord een laadtoestand; kleine handelingen tonen geen lader (SYNC-1). Streefwaarde voor gegevens van het echte script: binnen 4 seconden bij een koude start, gemeten in fase 20, geen harde eis.
- **NFR-9 Mobiel en desktop.** Bruikbaar van 360 tot 1440 pixels breed; tikdoelen minimaal 44 × 44 pixels.
- **NFR-10 Thema.** Licht en donker volgen `prefers-color-scheme` en wisselen live mee.
- **NFR-11 Toegankelijkheid.** WCAG 2.1 AA: contrast, focusstijl, toetsenbord voor alle bediening, labels, kleur nooit als enige drager.
- **NFR-12 Offline.** Zonder verbinding toont de app de schil met "Geen verbinding, je gegevens zijn veilig opgeslagen in de Sheet" en blokkeert grote acties; kleine handelingen gaan de wachtrij in en worden verstuurd zodra de verbinding terug is (SYNC-3).
- **NFR-13 Tests.** `npm run check` draait bronregels, unittests, build en Playwright tegen de nepbackend en eindigt met één groene of rode regel.
- **NFR-14 Gelijktijdigheid.** §7.16, getest met parallelle verzoeken op de nepbackend met hetzelfde slotgedrag.
- **NFR-15 Quotas.** Een verzoek leest alleen de tabs die de actie nodig heeft, elk hooguit één keer, met `getDataRange().getValues()`, en cachet ze in het geheugen voor de rest van het verzoek.
- **NFR-16 Logging.** `Log` krijgt elke schrijfactie zonder inhoud van vrije tekst of geheimen; het Sheet-menu kan het log legen.
- **NFR-17 GitHub.** De README eist tweestapsverificatie op het account dat naar de repo pusht en een beschermde `main`-branch.
- **NFR-19 Celinjectie.** `SheetStore` schrijft alle waarden als tekst volgens §5 Celopslag; een test op de SheetStore-adapter (met een nagebootste `Range`) bewijst dat invoer die met `=`, `+`, `-` of `@` begint en waarden als `2027-04-09` en `09:30` ongewijzigd als tekst terugkomen.
- **NFR-20 Bundel.** `dist/gas` bevat de globale functies `doPost`, `doGet`, `onOpen` en alle menufuncties (unittest), en `appsscript.json` volgt §3.
- **NFR-21 Foutteksten.** De gebruiker ziet nooit een veldnaam of technische code ("Veld data.tekst: te kort."). Elke `ongeldig`-melding wordt in de voorkant een Nederlandse zin ("Vul een vraag in."); een onbekende actie wordt "Deze handeling kent het script van de groep nog niet. Vraag de eigenaar het script bij te werken." (BV-05).
- **NFR-22 API-versie.** `API_VERSIE` is 2 aan beide kanten; een snapshot-test van de actielijst faalt als `ACTIES` wijzigt zonder versieverhoging (§7.17, BV-04).
- **NFR-18 Rechten Claude Code.** `.claude/settings.json` bevat een allow-lijst voor `npm`, `node`, `npx playwright`, `npx esbuild`, `git add`, `git commit`, `git status`, `git diff` en lees- en schrijfacties in de repo; geen algemene skip van toestemmingen.

## 11. Demodata

`test/fixtures/demo.json` vult de nepbackend met één groep "Studievrienden" van zes leden
(Anne, Bas, Daan, Eva, Joris, Sanne; woonplaatsen verspreid over Nederland) en twee edities:

- **2026, afgerond:** weekend 2 tot en met 4 oktober 2026, geboekte accommodatie, posten met
  alle drie de verdeelwijzen, een ontvangst, alle betalingen betaald.
- **2027, configureerbaar:** met een schakelaar `stap` die de editie in elke stap zet met
  passende data: vier van zes ingevuld (invullen), alle zes ingevuld met een duidelijke
  voorkeursdatum en een gelijkspel op de tweede plek (overzicht), drie accommodaties met
  een top 3 van vijf van de zes, bedden en eigen kamers (accommodatie), lijsten met claims, dubbele claim, definitieve boodschappen, twee
  kookbeurten, kamers en twee ritten (voorbereiding), programma (weekend), open en betaalde
  betalingen en één afgehaakte deelnemer met gedeelde kosten (afrekenen).

Elke deelnemer heeft in de demo een vaste link en pincode `123456`; de nepbackend toont die
in zijn console. De demodata komt nooit in de echte Sheet.

## 12. Bouwfasen

Zie `03-fasen.md` en de fasebestanden in `docs/fasen/`. Elke fase sluit af met
`npm run check` groen, een commit met de eis-ID's, een overdrachtsbestand in
`docs/overdracht/` en een regel in het sessielog van MEMORY.md.

## 13. Buiten scope

- Pushmeldingen, e-mail en sms.
- Bonnetjesfoto's en andere uploads.
- Betalen in de app, betaallinks, rekeningnummers en vreemde valuta.
- Foto's of een "beste moment" in het archief.
- Reistijden berekenen, kaarten tonen, een vervoersvraag.
- Accommodaties zoeken of boeken vanuit de app.
- Chat of reacties.
- Accounts, e-mailadressen, telefoonnummers.
- Een eigen server of database; Firebase, Supabase of andere diensten.
- Offline invoeren en later synchroniseren.
- Meerdere talen.
- Een beheeromgeving over groepen heen; elke groep staat los.
- Eigenaarschap van een Sheet overdragen aan een ander lid (een nieuwe eigenaar zet een nieuwe groep op).
- Importeren uit WieBetaaltWat of exporteren naar andere apps, behalve tekst kopiëren.
- Een stemronde over datums; de organisator legt de datum vast.

## 14. Definition of done

- Alle acceptatiecriteria aantoonbaar werkend, gedekt door tests.
- Elke aanname staat op één plek in de code met een eigen test.
- `npm run check` groen op een schone clone na `npm ci` en `npx playwright install`.
- De uitrol volgens de README werkt: sjabloon-Sheet, clasp, Pages, en één echte editie met
  twee testpersonen op een iPhone en een Android-telefoon.

## Bijlage A: koppeling bron → spec

| Bron-ID | Eis-ID's | Opmerking |
|---|---|---|
| F-01 | FRM-1, EDI-1 | |
| F-02 | KAL-1, KAL-2 | |
| F-03 | FRM-2 | |
| F-04 | OVZ-3, OVZ-7 | blind invullen |
| F-05 | OVZ-6 | |
| F-06 | OVZ-1 | |
| F-07 | FRM-3 | |
| F-08 | KAL-1, KAL-3, EDI-1 | |
| F-09 | KAL-4, KAL-5, KAL-6 | Midden toegevoegd |
| F-10 | KAL-2, KAL-7 | |
| F-11 | EDI-1, GRP-2 | groepsgrootte instelbaar |
| F-12 | FRM-2 | |
| F-13 | FRM-4 | |
| F-14 | FRM-3 | |
| F-15 | EDI-2, EDI-3, FRM-7 | |
| F-16 | OVZ-1, OVZ-3, STA-1 | |
| F-17 | NFR-8, RON-1 | |
| F-18 | §2, §3 | route 2 |
| F-19 | NFR-9, RON-6 | |
| F-20 | KAL-3, EDI-1 | |
| F-21 | EDI-1, EDI-6 | |
| F-22 | GRP-1 t/m GRP-5 | |
| F-23 | OVZ-1, OVZ-3, OVZ-5 | |
| F-24 | KAL-1, KAL-2 | |
| F-25 | FRM-6 | |
| F-26 | FRM-2 | |
| F-27 | FRM-3 | |
| F-28 | FRM-4 | |
| F-29 | EDI-4, TOE-2 | |
| F-30 | FRM-9, EDI-10 | |
| F-31 | §3, §5 | |
| F-32 | ACC-1 t/m ACC-5 | |
| F-33 | EDI-3, FRM-5 | |
| F-34 | §2 | |
| F-35 | RON-2, RON-3, RON-6 | |
| F-36 | FRM-5, EDI-2 | |
| F-37 | FRM-5, EDI-2 | |
| F-38 | TOE-1 t/m TOE-12 | pincode door het script gekozen (AAN-36) |
| F-39 | GELD-1 t/m GELD-10 | |
| F-40 | STA-5, MEE-1, KOK-1 t/m KOK-4, PRG-1 t/m PRG-3, KMR-1, CAR-1, CAR-2, ARC-1 | |
| F-41 | FRM-5, MEE-9, KOK-4 | |
| F-42 | MEE-1, MEE-5 | |
| F-43 | MEE-5 t/m MEE-8 | |
| F-44 | §2, §14 | |
| F-45 | STA-1, STA-2, EDI-7, EDI-8 | |
| F-46 | STA-3, STA-4, STA-6 | |
| F-47 | EDI-9, GELD-11 | |
| F-48 | GELD-2 | |
| F-49 | GELD-4 | |
| F-50 | NFR-9, NFR-10 | |
| F-51 | MEE-2, MEE-3, NFR-14 | |
| F-52 | §3, RON-6 | |
| F-53 | TOE-3, TOE-4, NFR-1, NFR-17, NFR-19 | |
| F-54 | RON-1 t/m RON-5 | |
| F-55 | EDI-7, OVZ-2, GELD-10 | |
| F-56 | NFR-13, NFR-18, §12 | |
| F-57 | §9 | |

Geen bron-ID zonder eis.
