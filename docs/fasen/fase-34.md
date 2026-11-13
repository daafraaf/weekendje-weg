# Fase 34: Swipen door de maanden

Hoort bij `docs/03-fasen.md`, toegevoegd op 13 november 2026 na het bijgewerkte ontwerp (designbrief 0.4 §5.1,
spec 0.12, aannames 0.29). Model: Sonnet.

**Doel.** Op de telefoon zie je in Invullen één maand tegelijk. Je swipet van rechts naar links naar de volgende
maand en prikt daar je weekenden. Het maandblad zelf werkt zoals nu.

- **Eisen:** KAL-8, KAL-9, KAL-10, KAL-11, KAL-12 (nieuw); KAL-1 t/m KAL-7 blijven gelden; NFR-9
- **Aannames:** AAN-91 (startmaand), AAN-92 (hint dat swipen kan); zet hun status van "gepland fase 34" op
  "open" en geef ze een plek in de code en een test met het ID in de naam
- **Leest:** spec §7.3 (vooral §7.3.7), §8 KAL-1 t/m KAL-12, §10 NFR-9; `docs/05-designbrief.md` §5.1; overdracht
  `docs/overdracht/fase-33.md`; artboard `docs/design/Formulier.dc.html` (de klassen `.swipe`, `.track`, `.mcal`,
  `.mrows`, `.pijl`, `.strip .col.cur`, `.swipe-tekst` en de keyframes `ww-nudge`). In het artboard is swipen
  nagebootst met pointer-events. Bouw het met scroll-snap zoals §7.3.7 zegt, niet zoals het artboard.
- **Raakt:** `src/web/components/kalender.js` en de kalenderregels in `src/web/css/app.css`:
  - onder 768 pixels een horizontale strook met `scroll-snap-type: x mandatory`, `overscroll-behavior-x: contain`
    en een blad per schermbreedte (`scroll-snap-align: start`);
  - pijlen in de maandkop, een tikbare jaarstrook met de maand in beeld gemarkeerd, een `aria-live`-regel;
  - de startmaand (AAN-91) en de hint met de vlag `ww-swipe-gezien` (AAN-92), lezen en schrijven in try/catch,
    zoals `routeGezien` in `src/web/uitleg.js`;
  - zes gereserveerde weekrijen per blad;
  - focus op een weekend in een andere maand schuift die maand in beeld.

  Vanaf 768 pixels blijft alles zoals het is, ook de regel `.jaar-m` vanaf 900 pixels. De heatmap in
  `overzicht.js` raak je niet aan.
- **Klaar als:** `npm run check` groen. Playwright op 390 pixels:
  - Invullen toont één maandblad in beeld, en de kalender opent op de eerste maand met een leeg weekend;
  - "Volgende maand" en een tik op een kolom in de jaarstrook brengen de juiste maand in beeld, met de rand in de
    strook;
  - een horizontale veeg (`page.mouse` of `touchscreen`) gaat naar de volgende maand en wisselt geen weekend;
  - verticaal scrollen van de pagina werkt;
  - tikken op een weekend doorloopt nog steeds de vier waarden en Hele maand werkt;
  - de `aria-live`-regel noemt de maand;
  - met `reducedMotion: 'reduce'` staat de tekst "Veeg naar links voor de volgende maand" er en beweegt er niets;
  - na een herlaad komt de hint niet terug.

  Op 360 pixels geen horizontale scroll van de pagina (NFR-9). Op 1280 pixels zijn alle twaalf maanden zichtbaar
  zoals voorheen. Pas tests in `test/e2e/kalender.spec.mjs` en `test/e2e/formulier.spec.mjs` aan die uitgaan
  van maanden onder elkaar op mobiel.

## Bouwen

Eerst de tests die het nieuwe gedrag vastleggen, dan de bouw. Houd de CSP intact: geen inline stijlen of
`style`-attributen. Verschuif met `scrollTo` of `scrollIntoView` en niet met een transform op de strook, zodat
scroll-snap het werk doet. De hint mag een CSS-animatie op een binnenlaag zijn. Licht en donker volgen de tokens.
De teller en de jaarstrook tellen over het hele jaar, zoals nu.

## Afsluiten

`npm run check` groen; commit `fase 34: swipen door de maanden (KAL-8, KAL-9, KAL-10, KAL-11, KAL-12, AAN-91, AAN-92)`;
`docs/overdracht/fase-34.md`; één regel in het sessielog van MEMORY.md.
