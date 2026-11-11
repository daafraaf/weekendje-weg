# Weekendje weg

Installeerbare webapp waarmee een vaste vriendengroep elk jaar één weekend weg plant,
voorbereidt en afrekent. Deelnemers vullen los van elkaar beschikbaarheid en wensen in, de
organisator ziet alles samengevoegd. De voorkant draait op GitHub Pages, de gegevens staan in
een Google Sheet van de groep achter een Apps Script. Bedoeld voor Davids studievrienden en
bruikbaar voor andere groepen.
Specificatie: docs/02-bouwspec.md. Fasen: docs/03-fasen.md, per fase een bestand in
docs/fasen/. Aannames: docs/04-aannames.md. Vaktermen: docs/GLOSSARY.md.
Design: docs/05-designbrief.md en docs/design/ met tokens.css, de iconen en per scherm een
artboard; docs/design/README.md koppelt elk artboard aan zijn eisen. Bron is het canvas
"Weekendje weg · ontwerp" in Claude Design (https://claude.ai/artifact/VUKgkd2jpwbnuTNf8LY7hr).

## Workstation

Op Davids pc staat deze repo in `C:\Users\David\Claude\Code\Weekendje-weg`. Het workstation
`Weekendje-weg/` in de vault verwijst hierheen. Lees bij de start `MEMORY.md` en werk aan het
eind van een sessie het sessielog bij.

Schrijfstijl voor Nederlandse tekst: natuurlijk en direct, geen gedachtestreepjes als
stijlmiddel, geen "niet X, maar Y", geen AI-clichés.

## Commando's

Fase 0 legt de scripts vast in `package.json`; vul deze lijst aan als er een bijkomt.

- `npm ci` en `npx playwright install`: eenmalig, door David vóór de run
- `npm run check`: bronregels, aannames (`npm run aannames`: elke AAN-xx in de code en in een testnaam),
  unittests, build en Playwright tegen de nepbackend; eindigt met
  één groene of rode regel. Groen vóór elke commit (NFR-13)
- `npm run mock`: nepbackend met de demo uit spec §11 (`test/fixtures/demo.json`) op localhost;
  toont de demolinks van 2027 en 2026 in de console, pincode `123456`; `-- --stap=overzicht` zet
  editie 2027 in een andere stap
- `npm run mock -- --leeg`: nepbackend met lege Sheet, een setupcode en een opzetlink in de console, voor de opzetwizard
- `npm run vakanties`: haalt de schoolvakanties op en schrijft `data/vakanties.json` (AAN-13)
- `clasp deploy -i <id>`: alleen in fase 20, samen met David. Altijd een nieuwe versie op de
  bestaande implementatie, nooit een nieuwe implementatie (spec §3)

## Afspraken

- UI-teksten in het Nederlands, code in het Engels.
- Eén fase per sessie. Lees `docs/fasen/fase-NN.md`, alleen de paragrafen van de spec die het
  fasebestand noemt en de vorige overdracht in `docs/overdracht/`.
- Een fase sluit af met `npm run check` groen, een commit met de eis-ID's (bijvoorbeeld
  `fase 3: inloggen (TOE-1, TOE-2, NFR-5)`), `docs/overdracht/fase-NN.md` van hooguit vijftien
  regels en één regel in het sessielog van `MEMORY.md`.
- Vraag bij twijfel over scope eerst. Bouw niets uit hoofdstuk 13 "Buiten scope". In een run
  zonder vragen wordt twijfel een aanname.
- Aannames staan in docs/04-aannames.md (AAN-xx), elk op één plek in de code met het ID als
  commentaar en een eigen test met het ID in de naam.
- Tot en met fase 19 geen Google- of GitHub-login: alles draait tegen de nepbackend in
  `test/mock-backend/`. Geen `git push`, `clasp push` of `clasp deploy` zonder David.
- Bedrijfslogica staat als pure modules in `src/shared/` en `src/server/` tegen de
  `Store`-interface. `src/server/gas/` en de nepbackend zijn dunne adapters op hetzelfde
  HTTP-contract (spec §3, §5.3).
- Harde bronregels (NFR-3, NFR-4, NFR-5): geen `innerHTML` met variabele inhoud, geen `eval` of
  `new Function`, geen externe `<script src>`, `fetch` alleen naar `script.google.com`,
  gebruikerstekst alleen via `textContent` of veilige DOM-functies. De CSP uit NFR-4 blijft
  ongewijzigd.
- Geen geheimen in de repo of in logregels (NFR-1, NFR-16). `.clasp.json` blijft buiten git;
  alleen `.clasp.json.voorbeeld` gaat erin.
- Alleen esbuild en Playwright als devDependencies. Een ander pakket vraagt een aanname.
- Claude Code draait met de allow-lijst in `.claude/settings.json` (NFR-18), nooit met het
  overslaan van alle toestemmingen.
- Ontwerp: zoek in `docs/design/README.md` het artboard bij de eisen van de fase en lees
  alleen dat bord (plus de `D-`-versie en de toestand `T-*` als die erbij horen); de borden
  zijn groot. Lees de markup, de klassen en de `<style>` in `<helmet>`; de componentklassen
  staan in de README. `support.js`, `<x-dc>`, `{{...}}` en inline stijlen horen bij Claude
  Design en gaan niet mee (strikte CSP, NFR-4). Tokens op `.ww` en `.ww.dark` worden in de app
  `:root` en de media query; fase 2 neemt `docs/design/tokens.css` over. Er staan alleen
  lichte borden; donker volgt uit de tokens. Wijkt een bord af van de spec, dan wint de spec.
- Testoutput en breed zoekwerk via een subagent; alleen de samenvatting komt terug.

## Patronen

Na elke fase hier aanvullen met wat de volgende sessie moet weten en niet uit de code haalt.
Houd dit bestand onder de 200 regels; werkwijzen die zelden nodig zijn gaan naar een skill in
`.claude/skills/`.

- e2e met de nepbackend: `startServer({ port: 0, seed })` per test plus `context.route('https://script.google.com/**')` die naar de nepserver doorstuurt, met `test.use({ serviceWorkers: 'block' })` (WebKit). Sessie voor schil-tests: `logIn(context)` in `test/e2e/hulp.mjs`.
- Een handler die een fout gooit maar toch moet schrijven (pogingenteller) roept zelf `store.flush()` aan; `api.js` flusht alleen na succes.

- Een actie bouwen: handler `{ schema, context?, uitvoeren }` in `src/server/acties/<groep>.js`
  en registreren in `STANDAARD` van `src/server/api.js`. `context` levert rijvelden als `eigen`,
  `nieuw`, `betrokken` voor `reden()` in `rechten.js`; de API doet slot, sessie, editie, Log en flush.
- Store-tabs en kolomtypen staan in `TABS` van `src/server/store.js`; een nieuwe kolom eerst daar.
- Tests met data: `maakNepApi({ seed, handlers, nu })` uit `test/mock-backend/server.mjs`;
  nagebootste GAS-diensten in `test/unit/nep-gas.mjs`.
- Geen `token = '...'`-letterlijken in tests: de geheimencheck van de bronregels slaat aan;
  maak tokens met `maakToken(nodeRandom)`.
- Demo met antwoorden: `maakDemo({ antwoorden: true, stap })` en `startNep(context, { antwoorden: true })`;
  standaard staan er geen antwoorden in, omdat oudere tests `lees('Antwoorden')[0]` gebruiken.
- Twee demosets: `maakDemo` (`test/fixtures/basis.json`, vier personen) voor de fasetests en
  `maakVolledigeDemo({ stap })` (§11, zes personen) voor mock en eindtest; e2e daarop met `startDemo(context, { stap, als, beheer })`.
- Een rol zonder regel voor een actie krijgt `geen_toegang` vóór het valideren (`rolReden` in `rechten.js`).
- Breedtes van balken via `el.style.width` (CSSOM); een `style`-attribuut blokkeert de CSP.
- Leesschermen die voor deelnemer en beheer werken (`voortgang`, `overzicht`) kiezen zonder
  `editieId` de nieuwste eigen editie van de organisator en geven `edities` mee voor de kiezer.

- Taginvoer: `src/shared/tags.js` (`tagSleutel`, `voegToe`, `tagsUitTekst`, `tagsFout`) en `components/tagveld.js`; de server accepteert alleen lijsten, `tagsUitTekst` leest oude tekst bij lezen. Een invoerveld met `list=` heet in Playwright een `combobox`.
- Navigatie: Archief en Uitleg staan in `NIET_IN_MENU` (`shared/start.js`); het profielmenu (`components/profielmenu.js`) en de sectie `maakAfgelopen` (`screens/archief.js`) vervangen ze. Beheerschermen staan in `BEHEER_SCHERMEN` en komen via het scherm `beheren` in het menu; tests gaan er via `beheerNaar` in `test/e2e/hulp.mjs` heen. Hints: tekst in `web/hints.js`, `kopMetHint` in `components/hint.js`.
- Opzetlink en uitrol: `APP_ADRES` en `SJABLOON_KOPIE` in `src/shared/uitrol.js`; linkfuncties die menu en voorkant delen in `src/shared/links.js` (`sessie.js` exporteert ze opnieuw). De dialoog-HTML van het Sheet-menu is een pure functie in `src/server/gas/dialoog.js`; de bundeltest (`gasOmgeving({ url, prompts })`) speelt `getUrl()`, `ui.prompt` en `showModalDialog` na.
- Stap en menu (STA-8): de schil houdt één stand (`haalStand`/`zetStand` in `web/app.js`) uit `scherm start`; een scherm tekent nooit een eigen stappenbalk. Stapnamen alleen uit `STAPNAMEN` in `shared/stappen.js`, menu-items uit `MENU` in `shared/start.js` (route `overzicht` heet Weekendje prikker). Niet aan de beurt: `maakKomtIn(stap)` (`components/komtin.js`) met `bijGesloten` als vierde argument van de `beheerapi`-aanroep. e2e: `balkNu(page)` in `navigatie.spec.mjs`.
- Bewerken op Windows: veel bestanden hebben CRLF en `sed -i` maakt er LF van (volledige diff). Vervang met een node-script dat de regeleinden bewaart, of met Edit.

- Onderdelen aan of uit: `ONDERDELEN` in `src/shared/onderdelen.js` (alle vijf uit, AAN-80). Nieuwe plekken die naar boodschappen, kookbeurten, programma, kamers of carpool verwijzen vragen `onderdeelAan(naam)`. e2e zet ze aan door de bundel te herschrijven: `zetOnderdelen(context, 'alle' | 'standaard' | [namen])` in `hulp.mjs`; `koppelNep` doet standaard 'alle', een test met een eigen `context.route` roept het zelf aan.
- De deadline is informatief (DDL-1) en `stapData` bestaat niet meer in de logica; gebruik geen verwachte datums per stap.

- Weekend vastleggen: één per editie; wijzigen alleen via `weekendLosmaken` (stap overzicht of accommodatie). Unit-tests die opnieuw vastleggen moeten eerst losmaken, in een latere stap via `store.werkBij` op de stap.
- `npx playwright test` los gebruikt de oude bundel; draai eerst `npm run build` of gebruik `npm run check`.

- Kleine handeling (SYNC): actie in `BUNDEL_ACTIES` (`src/shared/synchronisatie.js`), idempotent en laatste wint; op het scherm `maakStand({ wachtrij, toepassen, hoort, levend, bijWijziging })` uit `web/stand.js`, `stand.zetBevestigd(r)` na elke leesactie en `stand.zet(actie, data, { sleutel, editieId })` bij een klik; geen `data-schrijft`. Grote acties houden `data-schrijft` en wachten.
- e2e met de wachtrij: wacht op `page.locator('.sync')` met "Opgeslagen" voordat een andere context of de Store het ziet; `nep.aanroepen(actie)` en `nep.zetStoring([...])` uit `startServer`; wachttijden overslaan met `page.clock.install()` en `fastForward`.
- Accommodatie (fase 27): vorm via `deelvormVan` en stemrang via `rangVan` (`shared/accommodatie.js`), nooit de ruwe kolom; geboekt is `geboektAccommodatieId` gevuld. Een leesscherm dat een accommodatie teruggeeft, vraagt `verborgenVoor`/`geboekteVoor` in `acties/geheim.js` (ACC-9) en krijgt een geval in de lektest `geheimLekt` (`accommodatie.test.mjs`). Nieuwe kolommen gewoon achteraan in `TABS`: de Store vult een oude kop aan (AAN-84).

- Uitleg (UIT): alle teksten in `src/web/uitleg.js` (`UITLEG`, `uitlegVoor(stap, organisator)`); een nieuw onderdeel of stap eerst daar aanpassen. e2e: `logIn` en `startDemo` zetten `ww-route-gezien`, geef `routeGezien: false` voor de route op Start. De info-knop in de stappenbalk bestaat twee keer (mobiel en desktop), CSS toont er één.

- Versie en fouten (fase 29): een nieuwe of vervallen actie in `ACTIES` vraagt `API_VERSIE` +1 in `server/api.js` en `web/api.js` plus een nieuwe snapshot in `test/unit/foutafhandeling.test.mjs`; de unit- en e2e-tests met een vaste `apiVersie` moeten mee. Foutteksten voor de gebruiker alleen via `leesbareMelding` (`web/foutteksten.js`). Een grote actie krijgt "Opslaan…" in de knop vanzelf via `data-schrijft`; zet de bevestiging bij het veld.

- Kinderen die kunnen ontbreken: `vervang(el, ...)` uit `web/dom.js`, nooit `replaceChildren` met een mogelijke `null` (BV-02). Elke login landt op `#/start`; e2e naar Leden met `naarLeden(page)`, uitloggen met `uitloggen(page)` (profielmenu) uit `hulp.mjs`.

- Menu en layout (NAV-12, NAV-14): menu-links hebben `aria-label` met de volle naam; op mobiel is alleen het label van het actieve item zichtbaar. Desktop: kopregel over beide kolommen met `.kop-titel`; een scherm met de editietitel als kop hoort in `TITEL_OP_SCHERM` (`app.js`). e2e-maten: `test/e2e/navigatie-layout.spec.mjs`.

## Valkuilen

Leeg bij de start. Elke fout die twee keer gebeurt, komt hier.

- ECONNRESET in een e2e-test: een `context.route`-doorsturer zonder `.catch` faalt als de nepserver
  sluit terwijl de pagina nog vraagt. Gebruik altijd de vorm uit `koppelNep` (nieuwe poging, dan `route.abort()`).
