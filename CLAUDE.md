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

## Valkuilen

Leeg bij de start. Elke fout die twee keer gebeurt, komt hier.

- ECONNRESET in een e2e-test: een `context.route`-doorsturer zonder `.catch` faalt als de nepserver
  sluit terwijl de pagina nog vraagt. Gebruik altijd de vorm uit `koppelNep` (nieuwe poging, dan `route.abort()`).
