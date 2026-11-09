# Weekendje weg

Installeerbare webapp waarmee een vaste vriendengroep elk jaar één weekend weg plant,
voorbereidt en afrekent. Deelnemers vullen los van elkaar beschikbaarheid en wensen in, de
organisator ziet alles samengevoegd. De voorkant draait op GitHub Pages, de gegevens staan in
een Google Sheet van de groep achter een Apps Script. Bedoeld voor Davids studievrienden en
bruikbaar voor andere groepen.
Specificatie: docs/02-bouwspec.md. Fasen: docs/03-fasen.md, per fase een bestand in
docs/fasen/. Aannames: docs/04-aannames.md. Vaktermen: docs/GLOSSARY.md.
Design: docs/05-designbrief.md, tokens in docs/design/tokens.css, iconen docs/design/icon.svg
en icon-maskable.svg, de schermen als artboards in docs/design/ (zie Afspraken). Bron is het
canvas "Weekendje weg · ontwerp" in Claude Design (https://claude.ai/artifact/VUKgkd2jpwbnuTNf8LY7hr).

## Workstation

Op Davids pc staat deze repo in `C:\Users\David\Claude\Code\Weekendje-weg`. Het workstation
`Weekendje-weg/` in de vault verwijst hierheen. Lees bij de start `MEMORY.md` en werk aan het
eind van een sessie het sessielog bij.

Schrijfstijl voor Nederlandse tekst: natuurlijk en direct, geen gedachtestreepjes als
stijlmiddel, geen "niet X, maar Y", geen AI-clichés.

## Commando's

Fase 0 legt de scripts vast in `package.json`; vul deze lijst aan als er een bijkomt.

- `npm ci` en `npx playwright install`: eenmalig, door David vóór de run
- `npm run check`: bronregels, unittests, build en Playwright tegen de nepbackend; eindigt met
  één groene of rode regel. Groen vóór elke commit (NFR-13)
- `npm run mock`: nepbackend met de demodata op localhost; toont de demolinks in de console,
  pincode `123456`
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
- Artboards in `docs/design/`: mobiel `<Scherm>.dc.html` (390 breed), desktop
  `D-<Scherm>.dc.html` (1280), toestanden `T-*.dc.html` (laden, druk, offline, leeg,
  alleen-lezen, blokkade, gewijzigd), onderdelen in `Componenten.dc.html`, kleuren in
  `Tokens.dc.html`, icoon in `Icoon.dc.html`. Titel en plek per bord in `canvas.json`. Donker is
  hetzelfde bord met de schakelaar `dark`, daarom staan er alleen lichte borden.
- Een fase met een scherm leest alleen het bord van dat scherm (en zijn `D-`-versie als die
  er is), niet de hele map; de borden zijn groot. Ze zijn referentie voor opbouw, maten en
  teksten. Markup wordt niet overgenomen: `support.js`, `<x-dc>`, `{{...}}` en inline stijlen
  horen bij Claude Design, niet bij de app (strikte CSP, NFR-4). Kleuren en glas komen uit
  `docs/design/tokens.css`. Wijkt een bord af van de spec, dan wint de spec.
- Testoutput en breed zoekwerk via een subagent; alleen de samenvatting komt terug.

## Patronen

Leeg bij de start. Na elke fase hier aanvullen met wat de volgende sessie moet weten en niet
uit de code haalt. Houd dit bestand onder de 200 regels; werkwijzen die zelden nodig zijn
gaan naar een skill in `.claude/skills/`.

## Valkuilen

Leeg bij de start. Elke fout die twee keer gebeurt, komt hier.
