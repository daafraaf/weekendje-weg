# Bouwspecificatie Weekendje weg

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
docs/            bron, interview, spec, fasen, aannames, glossary, designbrief, overdracht/
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
| `Edities` | `id`, `jaar`, `titel`, `stap` (enum §7.2), `stapData` (JSON: verwachte datum per stap), `periodeVan`, `periodeTot`, `voorkeursmaanden` (JSON, maandnummers), `deadline` (datum+tijd), `blokken` (JSON, aan/uit per blok), `lijsten` (JSON: activiteiten, programma, eten en drinken), `vastgelegdWeekend`, `deelvorm` (`info`, `stemmen`, `geboekt`), `geboektAccommodatieId`, `boodschappenDefinitief` (bool), `versie`, `bijgewerkt` | F-08, F-20, F-30, F-32, F-36, F-43, F-45 |
| `Deelnemers` | `id`, `editieId`, `lidId`, `tokenHash`, `pinHash`, `pinSalt`, `rol` (`deelnemer`, `organisator`), `afgehaakt` (bool), `ingevuld` (bool), `ingevuldOp` | F-21, F-29, F-38, F-47 |
| `Beheerlinks` | `id`, `lidId`, `tokenHash`, `wachtwoordHash` (leeg tot eerste gebruik), `wachtwoordSalt`, `actief` (bool), `gemaakt`. Een beheerlink hoort bij een lid en geeft beheer over de edities waarin dat lid organisator is, plus het aanmaken van nieuwe edities | F-38 |
| `Antwoorden` | `id`, `editieId`, `deelnemerId`, `data` (JSON §5.2), `versie`, `bijgewerkt` | F-02 t/m F-15, F-24 t/m F-28, F-33, F-36, F-37, F-41 |
| `Vragen` | `id`, `editieId`, `volgorde`, `type` (`janee`, `keuze`, `meerkeuze`, `schaal`, `tekst`), `tekst`, `opties` (JSON) | F-15, F-33 |
| `Accommodaties` | `id`, `editieId`, `naam`, `plaats`, `link`, `prijsTotaal` (centen), `notitie`, `versie` | F-32 |
| `Stemmen` | `id`, `editieId`, `deelnemerId`, `accommodatieId` | F-32 |
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
  "activiteiten": ["escaperoom", "smeden"], "activiteitenEigen": "kanoën",
  "programma": ["uitslapen", "bordspellen"], "programmaEigen": "",
  "etenDrinken": ["ipa", "nulbier", "vegetarisch"], "etenDrinkenEigen": "notenallergie",
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
| `accommodaties` | accommodaties, deelvorm, stemaantallen, mijn stem, vastgelegd weekend |
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
| Invullen | `antwoordenOpslaan` (met versie) |
| Accommodatie | `weekendVastleggen`, `accommodatieOpslaan`, `accommodatieVerwijderen`, `deelvormZetten`, `stemmen` |
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

Na de stap Afgerond is alles alleen-lezen, behalve het archief (AAN-29).

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
9. Setupcode: acht tekens, gemaakt via het Sheet-menu "Weekendje weg → Setupcode tonen",
   eenmalig en 30 minuten geldig (AAN-28), opgeslagen in `PropertiesService`.
   `groepOpzetten` werkt alleen als de groep nog niet is opgezet en maakt de eerste
   beheerlink voor het lid van de eigenaar met het gekozen wachtwoord.
10. Beheerlink: `#b=<scriptId>&beheer=<token>`, gekoppeld aan een lid. Bij eerste gebruik
    kiest dat lid een wachtwoord van minimaal 10 tekens; daarna wordt het bij elke login
    gevraagd. Een beheersessie mag beheren in edities waarin het lid organisator is en mag
    nieuwe edities aanmaken (AAN-03). Het Sheet-menu heeft "Beheerlink maken" (lid kiezen)
    en "Wachtwoord resetten" (beheerlink kiezen; het wachtwoordveld wordt leeg).
11. Persoonlijke links horen bij één editie. Na de stap Afgerond blijven ze werken,
    alleen-lezen (AAN-31).

### 7.2 Stappen van een editie
1. Volgorde: `invullen` → `overzicht` → `accommodatie` → `voorbereiding` → `weekend` →
   `afrekenen` → `afgerond`.
2. Alleen de organisator zet de stap, één stap vooruit of één stap terug. Terug naar
   `invullen` kan niet meer vanaf `accommodatie` (AAN-05).
3. Naar `overzicht` gaan sluit het invullen, ook voor de deadline (AAN-04). Na de deadline
   kan niemand meer opslaan; de organisator kan de deadline verlengen zolang de stap
   `invullen` is.
4. Elke stap heeft een verwachte datum in `stapData`, door de organisator aan te passen.
   Bij aanmaken stelt de app voor: Invullen tot de deadline, Overzicht deadline + 2 dagen,
   Accommodatie deadline + 14 dagen. Voorbereiding, Weekend en Afrekenen blijven leeg
   ("volgt") tot het weekend is vastgelegd; dan worden ze vrijdag − 14 dagen, de vrijdag en
   de zondag + 1 dag, tenzij de organisator ze al had ingevuld.
5. Elke stapwijziging maakt een WhatsApp-tekst voor de organisator (§7.12).

### 7.3 Kalender
1. De kalender toont alle weekenden waarvan de vrijdag tussen `periodeVan` en `periodeTot`
   valt. Standaard: de eerste vrijdag na aanmaken tot twaalf maanden later (AAN-15).
2. Tikken op een weekend wisselt: leeg → ja → misschien → nee → leeg (AAN-17). Ook met het
   toetsenbord (spatie of enter).
3. Een weekend in een voorkeursmaand (maand van de vrijdag) krijgt een eigen markering.
4. Per weekend toont de kalender kenmerken: schoolvakantie per regio (N, M, Z) als een dag
   van vrijdag tot en met zondag in een vakantie valt; feestdag als vrijdag, zaterdag,
   zondag of de maandag erna een feestdag is; "lang weekend" als de vrijdag of de maandag een
   feestdag is.
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
7. Elk vrij tekstveld: maximaal 500 tekens.
8. "Opslaan" bewaart alles; een deelnemer telt als **ingevuld** zodra minstens één weekend
   een waarde heeft en beide budgetten en de reistijd gekozen zijn (AAN-33). Het formulier toont wat
   nog ontbreekt.
9. Opslaan geeft `gewijzigd` als de versie niet overeenkomt (bijvoorbeeld een tweede apparaat
   van dezelfde persoon); de app laadt dan de nieuwste versie en meldt dat.

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
   deelvorm: `info` (alleen lijst), `stemmen` (iedereen kiest één favoriet, aantallen voor
   iedereen zichtbaar, wijzigen mag, AAN-08), `geboekt` (één accommodatie met "Geboekt").
3. Prijs wordt getoond als totaal en per persoon (totaal gedeeld door het aantal niet-afgehaakte
   deelnemers, afgerond op hele euro's).

### 7.7 Wie neemt wat mee
1. Drie soorten items: `spullen` (wordt nooit gekocht), `keuken` (uit eigen keuken, kan ook
   gekocht worden), `boodschap` (wordt gekocht tenzij iemand hem claimt).
2. Startlijst `keuken` bij aanmaken van een editie: olijfolie, zout en peper, kruiden,
   mayonaise, pindakaas, ketchup, suiker, koffie, thee. Startlijst `spullen`: bordspellen,
   speaker, kaartspel. Beide aan te passen.
3. Een claim is een eigen rij. Twee claims van verschillende personen op hetzelfde item
   bestaan naast elkaar; een tweede claim van dezelfde persoon op hetzelfde item wordt
   genegeerd. Het item toont de namen op volgorde van claim.
4. Iedereen trekt alleen zijn eigen claim in. De organisator kan elke claim intrekken.
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
   de deadline), één per stap (wat er nu van iedereen wordt verwacht en de verwachte datum
   van de volgende stap), betaalverzoek per betaling ("Wil je €12,40 overmaken voor
   Weekendje weg 2027?").
3. Teksten bevatten nooit een pincode samen met een link en nooit een rekeningnummer (AAN-22).

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
| Overzicht | Overlapoverzicht en voorkeursdatum | Detailoverzicht, knop "Weekend vastleggen" |
| Accommodatie | Accommodaties in de deelvorm, vastgelegd weekend | Accommodaties beheren, deelvorm |
| Voorbereiding | Boodschappenlijst, wie neemt wat mee, kookbeurten, carpool, kamer | Status per onderdeel, "Boodschappen definitief" |
| Weekend | Programma van vandaag, knop "Uitgave toevoegen" | Hetzelfde plus programma beheren |
| Afrekenen | Wat jij moet betalen of krijgt | Openstaande betalingen van iedereen |
| Afgerond | Samenvatting en archief | Samenvatting, "Nieuwe editie" |

Vanaf de stap Accommodatie zijn alle onderdelen bereikbaar via het menu (AAN-12). De
organisator ziet bovenaan altijd zijn eerstvolgende actie.

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
   terugkeren naar het tabblad (`visibilitychange`) en na elke eigen schrijfactie.

### 7.17 Versie van het script
De voorkant stuurt `apiVersie` mee. Wijkt die af van het script, dan antwoordt het script met
`api_versie` en toont de voorkant: "Het script van deze groep is verouderd. De eigenaar werkt
het bij via …" met een link naar de uitleg in de README (AAN-14).

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

### Groep opzetten (GRP)
- **GRP-1** Het Sheet-menu "Weekendje weg" heeft: Setupcode tonen, Beheerlink maken, Beheerwachtwoord resetten, Uitleg.
- **GRP-2** De opzetwizard in de app vraagt de script-URL (alleen `/macros/s/<id>/exec`, een `/dev`-URL wordt geweigerd met uitleg), de setupcode, de groepsnaam, de leden (voornaam, woonplaats), welk lid de eigenaar is en een beheerwachtwoord, en zet de groep op.
- **GRP-3** Een tweede `groepOpzetten` op een opgezette groep wordt geweigerd.
- **GRP-4** Na opzetten toont de wizard de beheerlink met een kopieerknop en de uitleg om hem te bewaren.
- **GRP-5** De organisator kan leden toevoegen, hun woonplaats wijzigen en ze inactief maken; leden worden nooit verwijderd.

### Editie (EDI)
- **EDI-1** Een organisator maakt een editie met titel, jaar, periode, voorkeursmaanden (standaard 4, 5, 9, 10), deadline, deelnemers, organisator(en) en aan/uit per optioneel blok.
- **EDI-2** De organisator past de lijsten van activiteiten, programma en sfeer, eten en drinken en de startlijsten van wie neemt wat mee aan.
- **EDI-3** De organisator voegt eigen vragen toe, wijzigt en verwijdert ze, van de types ja/nee, keuze, meerkeuze, schaal 1-5 en tekst, tot de stap Overzicht; zodra een vraag een antwoord heeft, zijn alleen de tekst en het verwijderen nog mogelijk, en antwoorden op verwijderde vragen tellen niet mee.
- **EDI-4** "Links maken" toont per deelnemer zijn link en pincode met de twee WhatsApp-teksten en kopieerknoppen.
- **EDI-5** De organisator vernieuwt de pincode van één deelnemer; de oude werkt direct niet meer.
- **EDI-6** De organisator maakt een beheerlink voor een lid, zoals een tweede organisator of de organisator van een nieuwe editie; dat lid kiest bij eerste gebruik zijn eigen wachtwoord.
- **EDI-7** De organisator zet de stap volgens §7.2; elke wijziging toont daarna de WhatsApp-tekst van de nieuwe stap.
- **EDI-8** De organisator past de verwachte datum per stap aan; de voorstelwaarden volgen §7.2.4.
- **EDI-9** De organisator markeert een deelnemer als afgehaakt en kan dat terugdraaien; de gevolgen volgen §7.7.5, §7.11.4 en §7.13.9.
- **EDI-10** De organisator verlengt de deadline zolang de stap Invullen is.

### Stappenbalk en startscherm (STA)
- **STA-1** Bovenaan elk scherm staat de stappenbalk met zeven stappen: afgerond met vinkje, huidige uitgelicht, later grijs, elk met de verwachte datum.
- **STA-2** Op mobiel toont de stappenbalk de huidige stap met de vorige en volgende; tikken klapt alle stappen uit.
- **STA-3** Het startscherm van deelnemer en organisator volgt de tabel in §7.14.
- **STA-4** Het startscherm van de organisator toont zijn eerstvolgende actie als knop.
- **STA-5** Zodra het weekend vastligt, toont het startscherm een aftelteller in dagen tot de vrijdag, op de dag zelf "Vandaag!".
- **STA-6** Het menu geeft vanaf de stap Accommodatie toegang tot alle onderdelen; daarvoor alleen tot formulier, voortgang en archief.

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
- **FRM-5** Activiteiten, programma en sfeer en eten en drinken zijn vinkjeslijsten uit de editielijsten, elk met een vrij veld.
- **FRM-6** Het blok Samenwerken op vrijdag verschijnt alleen als de organisator het aanzet.
- **FRM-7** Eigen vragen worden getoond met het invoerelement dat bij hun type hoort.
- **FRM-8** Opslaan bewaart alles, toont "Opgeslagen" en de status ingevuld volgens §7.4.8.
- **FRM-9** Na de deadline of vanaf de stap Overzicht is het formulier alleen-lezen met de reden erbij.
- **FRM-10** Een versieconflict laadt de nieuwste antwoorden en meldt dat.

### Voortgang en overzicht (OVZ)
- **OVZ-1** Iedereen ziet per deelnemer een vinkje voor ingevuld of nog niet, plus de deadline.
- **OVZ-2** De organisator ziet een herinneringsknop die de WhatsApp-tekst met de namen van wie nog niet heeft ingevuld maakt.
- **OVZ-3** Vanaf de stap Overzicht zien deelnemers het overlapoverzicht volgens §7.5.3; daarvoor ziet een deelnemer alleen "Het overzicht verschijnt als de organisator het vrijgeeft".
- **OVZ-4** De heatmap toont per weekend de aantallen ja, misschien en nee, de voorkeursmaand en de vakantiekenmerken.
- **OVZ-5** De top 5 volgt de rangorde van §7.5.2; de bovenste is als voorkeursdatum gemarkeerd.
- **OVZ-6** De organisator ziet het detailoverzicht per persoon en per blok volgens §7.5.4.
- **OVZ-7** Een test bewijst dat het overzicht voor een deelnemer geen antwoorden per persoon bevat.

### Accommodatie (ACC)
- **ACC-1** De organisator legt het weekend vast vanuit de top 5 of uit de kalender.
- **ACC-2** De organisator voegt accommodaties toe, wijzigt en verwijdert ze (naam, plaats, link, totaalprijs, notitie).
- **ACC-3** De organisator kiest de deelvorm `info`, `stemmen` of `geboekt`.
- **ACC-4** Bij `stemmen` kiest elke deelnemer één favoriet en kan die wijzigen; iedereen ziet de aantallen.
- **ACC-5** Bij `geboekt` toont de app één accommodatie als geboekt met naam, plaats, link en prijs per persoon.

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
- **GELD-9** Een betaling markeren als betaald of terugdraaien werkt de afrekening direct bij.
- **GELD-10** Bij elke openstaande betaling maakt de ontvanger met één knop een betaalverzoek als WhatsApp-tekst.
- **GELD-11** Afhaken volgt §7.13.9.

### Archief (ARC)
- **ARC-1** Het archief toont alle edities van de groep volgens §7.15, nieuwste bovenaan.
- **ARC-2** Vanuit een afgeronde editie maakt de organisator een nieuwe editie die leden, lijsten en blokinstellingen overneemt.

### Rondleiding en installatie (RON)
- **RON-1** Bij eerste gebruik op een apparaat volgt een rondleiding van hooguit vijf schermen: welkom, pincode bewaren, op het beginscherm zetten, de stappenbalk, waar je begint.
- **RON-2** De installatie-uitleg herkent iOS Safari, iOS met een andere browser, Android Chrome en desktop Chrome of Edge, en toont de passende stappen; op iOS met de volgorde uit §7.1.8 en een knop "Kopieer mijn link"; andere browsers krijgen "Zet een bladwijzer".
- **RON-3** Op Android en desktop Chromium toont de app een knop "Installeren" via `beforeinstallprompt`.
- **RON-4** De rondleiding is later terug te vinden in het menu onder "Uitleg".
- **RON-5** De opzetwizard (GRP-2) begint met een rondleiding voor de eigenaar: sjabloon kopiëren, script implementeren, URL plakken, setupcode.
- **RON-6** De app is installeerbaar: manifest met naam, iconen 192 en 512 pixels en maskable, `display: standalone`, en een service worker die alleen de app-schil cachet.

## 9. Design

Zie `05-designbrief.md` (concept). Het ontwerp volgt in Claude Design vóór de bouw. Tot dan
gebruikt fase 2 neutrale tokens. Eerst komen: tokens als CSS-variabelen (licht en donker),
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
- **NFR-8 Prestaties.** De app-schil is zichtbaar binnen 1 seconde uit de cache (Playwright). Elk scherm doet bij openen precies één leesactie (`scherm`) en toont tot het antwoord een laadtoestand. Streefwaarde voor gegevens van het echte script: binnen 4 seconden bij een koude start, gemeten in fase 20, geen harde eis.
- **NFR-9 Mobiel en desktop.** Bruikbaar van 360 tot 1440 pixels breed; tikdoelen minimaal 44 × 44 pixels.
- **NFR-10 Thema.** Licht en donker volgen `prefers-color-scheme` en wisselen live mee.
- **NFR-11 Toegankelijkheid.** WCAG 2.1 AA: contrast, focusstijl, toetsenbord voor alle bediening, labels, kleur nooit als enige drager.
- **NFR-12 Offline.** Zonder verbinding toont de app de schil met "Geen verbinding, je gegevens zijn veilig opgeslagen in de Sheet" en blokkeert opslaan.
- **NFR-13 Tests.** `npm run check` draait bronregels, unittests, build en Playwright tegen de nepbackend en eindigt met één groene of rode regel.
- **NFR-14 Gelijktijdigheid.** §7.16, getest met parallelle verzoeken op de nepbackend met hetzelfde slotgedrag.
- **NFR-15 Quotas.** Een verzoek leest alleen de tabs die de actie nodig heeft, elk hooguit één keer, met `getDataRange().getValues()`, en cachet ze in het geheugen voor de rest van het verzoek.
- **NFR-16 Logging.** `Log` krijgt elke schrijfactie zonder inhoud van vrije tekst of geheimen; het Sheet-menu kan het log legen.
- **NFR-17 GitHub.** De README eist tweestapsverificatie op het account dat naar de repo pusht en een beschermde `main`-branch.
- **NFR-19 Celinjectie.** `SheetStore` schrijft alle waarden als tekst volgens §5 Celopslag; een test op de SheetStore-adapter (met een nagebootste `Range`) bewijst dat invoer die met `=`, `+`, `-` of `@` begint en waarden als `2027-04-09` en `09:30` ongewijzigd als tekst terugkomen.
- **NFR-20 Bundel.** `dist/gas` bevat de globale functies `doPost`, `doGet`, `onOpen` en alle menufuncties (unittest), en `appsscript.json` volgt §3.
- **NFR-18 Rechten Claude Code.** `.claude/settings.json` bevat een allow-lijst voor `npm`, `node`, `npx playwright`, `npx esbuild`, `git add`, `git commit`, `git status`, `git diff` en lees- en schrijfacties in de repo; geen algemene skip van toestemmingen.

## 11. Demodata

`test/fixtures/demo.json` vult de nepbackend met één groep "Studievrienden" van zes leden
(Anne, Bas, Daan, Eva, Joris, Sanne; woonplaatsen verspreid over Nederland) en twee edities:

- **2026, afgerond:** weekend 2 tot en met 4 oktober 2026, geboekte accommodatie, posten met
  alle drie de verdeelwijzen, een ontvangst, alle betalingen betaald.
- **2027, configureerbaar:** met een schakelaar `stap` die de editie in elke stap zet met
  passende data: vier van zes ingevuld (invullen), alle zes ingevuld met een duidelijke
  voorkeursdatum en een gelijkspel op de tweede plek (overzicht), drie accommodaties met
  stemmen (accommodatie), lijsten met claims, dubbele claim, definitieve boodschappen, twee
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
