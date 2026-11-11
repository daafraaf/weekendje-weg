# Fase 30: Binnenkomen en Start

Hoort bij `docs/03-fasen.md`, feedbackronde 2 (`docs/01-interview.md`, "Feedbackronde 2"). Model: Sonnet.

**Doel.** Inloggen werkt ook met een wachtwoordmanager, de organisator landt op Start, en Start is opgeruimd: geen
`null`, geen dubbele koppen, de juiste eerstvolgende actie.

- **Bevindingen:** BV-02, BV-06, BV-07, BV-08, BV-20, BV-21, BV-22, BV-23, BV-33, BV-36
- **Eisen:** TOE-13 (nieuw), STA-3, STA-4, STA-9 (nieuw), NAV-2, NAV-4, NAV-15 (alleen de editietitel, BV-20)
- **Aannames:** AAN-71, AAN-85; geen nieuwe gepland
- **Leest:** spec §7.1.8, §7.14, §8 TOE-1, TOE-11, TOE-13, STA-3, STA-4, STA-9, NAV-2, NAV-4, NAV-15; overdracht
  `docs/overdracht/fase-29.md`; artboards `Binnenkomen.dc.html`, `StartOrganisator.dc.html` en `Main.dc.html`.
- **Raakt:** alle `replaceChildren(`-aanroepen in `src/web` nalopen (Grep): geen `null`, `undefined` of `false`
  als kind, bijvoorbeeld via een hulpfunctie die filtert; het pinscherm (plakveld verbergen bij een link in het
  fragment, pinvakjes `type="text"`, `inputmode="numeric"`, `autocomplete="one-time-code"`, de drie
  ignore-attributen); `src/web/app.js` (beheersessie na inloggen naar `#/start`); `src/shared/start.js`
  (`eersteActie`: "Iedereen uitnodigen" zolang niet elke deelnemer een link heeft); `start.js`,
  `start-organisator.js` (één kop bij de eerstvolgende actie, geen aftelteller na Afgerond, "Hoe werkt het?" als
  tekstlink, geen "Je bent ingelogd." met Uitloggen, Afgelopen weekenden met klapicoon en lege tekst);
  `components/stappenbalk.js` (titel niet dubbel); `components/profielmenu.js` (naam en rol).
- **Klaar als:** `npm run check` groen. e2e: op Start staat in `main` nergens de tekst `null` (organisator en
  deelnemer, elke stap); de demolink opent het pinscherm zonder plakveld en met `type="text"`-vakjes; een
  beheerlogin eindigt op `#/start`; een nieuwe editie zonder links toont "Iedereen uitnodigen"; Afrekening op
  Start heeft één kop "Openstaande betalingen"; Afgerond toont geen aftelteller; het profielmenu toont
  "David · organisator". Playwright op 360, 390 en 1280 pixels: alle menu-items binnen beeld en geen `null` in `main`.

## Bouwen

Per bevinding eerst een test die de fout laat zien, dan de fix. De menu-items op mobiel passen pas na fase 31;
schrijf de breedtetest nu al, en markeer hem met `test.fixme` voor 360 en 390 pixels als hij alleen faalt door
BV-16, met een verwijzing naar fase 31.

## Afsluiten

`npm run check` groen; commit `fase 30: binnenkomen en Start (TOE-13, STA-4, STA-9, NAV-2, NAV-15; BV-02, BV-06, BV-07, BV-08, BV-20, BV-21, BV-22, BV-23, BV-33, BV-36)`;
`docs/overdracht/fase-30.md`; één regel in het sessielog; "Opgelost in fase 30" achter elke opgeloste BV.
