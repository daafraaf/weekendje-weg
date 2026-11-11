# Fase 31: Navigatie en layout

Hoort bij `docs/03-fasen.md`, feedbackronde 2 (`docs/01-interview.md`, "Feedbackronde 2"). Model: Sonnet.

**Doel.** Het menu past op elke telefoon, Accommodatie is te onderscheiden van Start, de schermen zeggen in welk
scherm je zit, en de desktop gebruikt de breedte.

- **Bevindingen:** BV-16, BV-17, BV-18, BV-19
- **Eisen:** NAV-10, NAV-12, NAV-14, NAV-15 (nieuw of aangepast), §7.14, UIT-2, NFR-9
- **Aannames:** AAN-12 (Meenemen en Afrekening altijd open, ongewijzigd); geen nieuwe gepland
- **Leest:** spec §7.14, §8 STA-1, STA-2, UIT-2, NAV-10, NAV-12, NAV-14, NAV-15, §10 NFR-9; overdracht
  `docs/overdracht/fase-30.md`; artboards `D-StartOrganisator.dc.html` (desktop) en `Componenten.dc.html` (iconen,
  menu); de iconen in `docs/design/`.
- **Raakt:** het hoofdmenu (`src/web/components/` en de CSS): op mobiel alleen iconen, het actieve item met label,
  `aria-label` met de volle naam; een bed-icoon voor Accommodatie (inline SVG of een bestand onder de app-schil,
  geen externe bron); de schermkoppen van Meenemen en Afrekening (bovenschrift = schermnaam); `src/web/uitleg.js`
  (Meenemen en Afrekening zijn in elke stap open); de desktop-layout (inhoud tot ±900 px vanaf 1024 px, menu
  uitgelijnd met de stappenbalk, editienaam in de kopregel naast de profielknop, stappenbalk zonder afkortingen).
- **Klaar als:** `npm run check` groen. Playwright op 360, 390 en 1280 pixels: alle zeven menu-items liggen binnen
  het venster, `document.documentElement.scrollWidth` is niet groter dan de vensterbreedte, het menu scrolt niet
  horizontaal, elk item heeft een `aria-label` met de volle naam, en `main` bevat geen tekst `null`. Op 1280 px
  toont de stappenbalk "Weekendje prikker" en "Accommodatie" voluit. Het icoon van Accommodatie verschilt van dat
  van Start. Meenemen in stap Invullen heeft het bovenschrift "Meenemen". Haal de `test.fixme` uit fase 30 weg.

## Bouwen

Per bevinding eerst een test die de fout laat zien, dan de fix. Houd de CSP intact (geen inline stijlen of
`style`-attributen; breedtes via CSSOM). Licht en donker volgen de tokens.

## Afsluiten

`npm run check` groen; commit `fase 31: navigatie en layout (NAV-10, NAV-12, NAV-14, NAV-15, UIT-2; BV-16, BV-17, BV-18, BV-19)`;
`docs/overdracht/fase-31.md`; één regel in het sessielog; "Opgelost in fase 31" achter elke opgeloste BV.
