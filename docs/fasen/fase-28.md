# Fase 28: Uitleg van de stappen

Hoort bij `docs/03-fasen.md` en `docs/plan-feedbackronde.md`. Opdracht: punt 5. Model: Sonnet.

**Doel.** Iedereen snapt snel welke stappen er zijn, wat er gebeurt en wat er van hem verwacht wordt. Eerste bezoek: een route op Start. Daarna terug via "Hoe werkt het" en een info-icoon bij de stappenbalk.

- **Eisen:** nieuw UIT-1 (route bij eerste bezoek op Start, te sluiten), UIT-2 (per stap naam, wat er gebeurt, wat het oplevert, wat jij doet, per rol), UIT-3 ("Hoe werkt het" op Start), UIT-4 (info-icoon bij de stappenbalk met de uitleg van de huidige stap); NAV-7 aangepast (de stappenbalk krijgt nu wel een hint)
- **Aannames:** nieuw AAN-85 (vlag `ww-route-gezien` in localStorage met try/catch, per apparaat; los van de rondleiding van AAN-73)
- **Leest:** spec §7.14, RON-1, NAV-7, AAN-73; `src/web/components/hint.js`, `src/web/hints.js`; overdrachten fase 23 t/m 27.
- **Raakt:** `src/web/uitleg.js` (nieuw, alle teksten), `src/web/screens/start.js`, `start-organisator.js`, `src/web/components/stappenbalk.js`, CSS, e2e-test.
- **Klaar als:** `npm run check` groen. e2e: een nieuwe gebruiker ziet de route op Start, sluit hem, ziet hem na verversen niet meer, en haalt hem terug via "Hoe werkt het" en via het info-icoon (dat de huidige stap toont). Een test controleert dat uitgezette onderdelen (fase 24) niet in de teksten staan.

## Bouwen

Een kleine tijdlijn met kaartjes, vrolijk en kort, met een knipoog, in gewoon Nederlands. De teksten volgen wat er na fase 23 t/m 27 echt staat (namen uit de stappentabel). Tekst voor organisator en deelnemer apart waar ze verschillen.

## Afsluiten

`npm run check` groen; commit `fase 28: uitleg van de stappen (UIT-1 t/m UIT-4)`; overdracht met de **eindlijst voor David**: wat is gewijzigd per eis-ID (fase 23 t/m 28), nieuwe aannames, en wat hij zelf test op telefoon en laptop; sessielog.
