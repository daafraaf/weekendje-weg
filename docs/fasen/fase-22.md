# Fase 22: Groep opzetten met een opzetlink

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** Een nieuwe eigenaar zet een groep op zonder URL en setupcode over te typen. Het
Sheet-menu "Groep opzetten" toont één link, die de wizard opent met alles ingevuld. De
rondleiding krijgt een knop naar de kopieerlink van de sjabloon.

- **Eisen:** GRP-1, GRP-6, GRP-7, GRP-8, RON-5
- **Aannames:** AAN-28, AAN-45, nieuw AAN-77, AAN-78, AAN-79 (zie hieronder)
- **Leest:** `docs/02-bouwspec.md` §3 (Implementaties), §7.1.9, §7.1.10, §7.18, §8 GRP, RON-5, NFR-2, NFR-5. Daarnaast alleen `CLAUDE.md`, de laatste overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/shared/uitrol.js` (nieuw), `src/shared/links.js` (nieuw, als het parsen van de webapp-URL daarheen gaat), `src/web/sessie.js`, `src/web/app.js`, `src/web/screens/opzetten.js`, `src/server/gas/menu.js`, `src/server/gas/dialoog.js` (nieuw), `src/server/gas/ingangen.js` (alleen als er een menufunctie bijkomt of van naam wisselt), `test/unit/opzet.test.mjs`, `test/unit/bundel.test.mjs`, `test/unit/uitrol.test.mjs` (nieuw), `test/e2e/opzetten.spec.mjs`, `test/mock-backend/server.mjs` (alleen tekst), `docs/04-aannames.md`, `README.md`
- **Klaar als:** `npm run check` groen. De e2e-test opent `#/opzetten?b=<id>&code=<code>` met een setupcode van de nepbackend, landt op stap 1 met URL en code ingevuld en de focus op de groepsnaam, ziet in de adresbalk alleen `#/opzetten`, en rondt de wizard af. Een opzetlink met een fout ID of een code van zeven tekens toont stap 0 met de melding uit GRP-7. De bundeltest laat zien dat "Groep opzetten" een dialoog met de opzetlink toont, dat een opgezette groep geen code krijgt, en dat de volgorde uit §7.18.2 werkt.
- **Hangt af van:** fase 21 (taginvoer) is gecommit. Die fase wijzigt ook `src/web/app.js`; begin niet zolang `git status` daar nog wijzigingen toont.

## Bouwen

1. **Uitrolinstellingen (§7.18.1).** Maak `src/shared/uitrol.js` met `APP_ADRES` en
   `SJABLOON_KOPIE`. Vul de waarden in die in de opdracht staan; staan ze er niet, laat ze dan
   leeg. Voeg vormcontroles toe (`appAdresGeldig`, `sjabloonKopieGeldig`) en een unittest die
   faalt als een ingevulde waarde de verkeerde vorm heeft. Leeg is geldig.
2. **Webapp-URL op één plek.** Het menu moet dezelfde regels gebruiken als `leesScriptUrl`
   in `src/web/sessie.js`. Verplaats de pure parsefunctie naar `src/shared/` en laat
   `sessie.js` hem opnieuw exporteren, zodat bestaande imports en tests blijven werken.
3. **Opzetlink lezen (§7.18.3, GRP-7).** Voeg `leesOpzetlink(hash)` toe aan
   `src/web/sessie.js`: geeft `{ scriptId, code }` of `{ fout }` bij een opzetlink, en `null`
   bij een gewoon `#/opzetten` of iets anders. Test dat `leesLink` een opzetlink nooit
   herkent. In `app.js` wordt de check op `location.hash === '#/opzetten'` een check op het
   pad `#/opzetten` met of zonder query. Lees de link, zet het adres direct terug met
   `history.replaceState` op `#/opzetten`, en geef de waarden mee aan `maakOpzetten`.
4. **Wizard (GRP-7, RON-5).** `maakOpzetten` krijgt een optionele `vooraf`. Met geldige
   waarden start de wizard bij stap 1 met beide velden ingevuld (ze blijven te wijzigen), de
   regel "Je Sheet is gekoppeld. Geef de groep een naam." en de focus op de groepsnaam. Met
   een `fout` start hij bij stap 0 met de melding. De rondleiding wordt drie stappen volgens
   RON-5. De knop "Kopie maken" is een gewone link (`target="_blank"
   rel="noopener noreferrer"`) naar `SJABLOON_KOPIE` en verschijnt alleen als die is ingevuld.
   De bestaande knop wordt "Ik heb de URL en de setupcode al" en gaat naar stap 1. Vervang
   overal "Setupcode tonen" door "Groep opzetten", ook in foutmeldingen en in de nepbackend.
5. **Menu (GRP-1, GRP-6, §7.18.2).** Het menu-item "Setupcode tonen" wordt "Groep opzetten".
   Het rechtenwoord `setupcodeTonen` in `src/server/rechten.js` blijft zoals het is, zodat de
   beveiligingstest ongewijzigd blijft. Schrijf `webappId()` met de volgorde uit §7.18.2.
   De vraag om de URL gebeurt met `ui.prompt`, bij een fout opnieuw met de foutmelding, en
   Annuleren stopt zonder code. Pas daarna maakt het menu de setupcode.
6. **Dialoog (§7.18.4).** `src/server/gas/dialoog.js` bouwt de HTML als pure functie, zodat
   Node hem test, met een escape-functie voor elke waarde. `menu.js` geeft hem aan
   `HtmlService.createHtmlOutput(...).setWidth(...).setHeight(...)` en
   `SpreadsheetApp.getUi().showModalDialog(...)`. Breid `test/unit/nep-gas.mjs` uit met
   `HtmlService` en `showModalDialog` als de bundeltest dat nodig heeft. Een unittest
   controleert dat er buiten `APP_ADRES` geen `http`-adres in de HTML staat en dat een waarde
   met `<`, `"` of `&` ge-escaped is.
7. **Beheerlink (GRP-8, AAN-45).** Met `APP_ADRES` ingevuld toont "Beheerlink maken" de
   volledige link in dezelfde dialoog. Zonder blijft het zoals het is.
8. **Uitleg in het menu.** `menuUitleg` beschrijft de nieuwe route in twee zinnen.
9. **Geen API-wijziging.** `API_VERSIE` en `appsscript.json` blijven gelijk (§7.18.4, §7.18.5).

## Aannames om toe te voegen

Zet ze in `docs/04-aannames.md` met codeplek en een test met het ID in de naam, anders faalt
`npm run check`. Voeg een versieregel en een logregel toe.

| ID | Onderwerp | Soort | Inhoud |
|---|---|---|---|
| AAN-77 | Uitrolinstellingen | Regel | `APP_ADRES` en `SJABLOON_KOPIE` staan in `src/shared/uitrol.js`; leeg betekent het gedrag van spec 0.3; een ingevulde waarde met een andere vorm faalt de check |
| AAN-78 | Opzetlink | Flow | `#/opzetten?b=<webappId>&code=<setupcode>`; de setupcode mag in het fragment omdat hij eenmalig en 30 minuten geldig is; de app haalt het fragment direct uit de adresbalk |
| AAN-79 | Webapp-ID in het menu | Flow | eerst `getUrl()` als die op `/exec` eindigt, dan de eigenschap `webappId`, dan één keer vragen; reden: het is niet zeker wat `getUrl()` in de nieuwe Apps Script-editor teruggeeft |

Werk ook de tekst van AAN-45 bij: met `APP_ADRES` toont het menu de volledige beheerlink.

## README

- Uitrollen, onderdeel 2: na stap 7 een stap "Vul `APP_ADRES` en `SJABLOON_KOPIE` in
  `src/shared/uitrol.js` in, commit, push, en doe `npm run build` en `clasp push`." Zet erbij
  dat de sjabloon leeg moet blijven (geen leden, geen edities) en gedeeld als "Iedereen met de
  link: lezer", anders werkt de kopieerlink niet voor anderen.
- Nieuw onderdeel "Een nieuwe groep opzetten" voor eigenaren, drie stappen zoals RON-5, met
  de valkuil van Google Workspace-accounts.
- Onderdeel 3 (script bijwerken): de sjabloon bijwerken verandert niets aan bestaande kopieën.

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 22: groep opzetten met opzetlink (GRP-1, GRP-6, GRP-7, GRP-8, RON-5)`.
3. Schrijf `docs/overdracht/fase-22.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat David nog moet doen (zie hieronder), de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.

## Daarna, door David

1. Controleer dat `APP_ADRES` en `SJABLOON_KOPIE` goed staan en push naar `main`.
2. `npm run build` en `clasp push` naar de sjabloon. Een nieuwe implementatie op de sjabloon is
   niet nodig: elke kopie maakt zijn eigen.
3. Proef: maak met een tweede Google-account een kopie via de knop in de app, implementeer,
   kies Groep opzetten en klik op de link. Noteer wat er misgaat in
   `docs/overdracht/fase-20-bevindingen.md`, ook wat het menu deed bij het bepalen van het
   webapp-ID (AAN-79).
