# Fase 25: Weekend vastleggen met uitweg

Hoort bij `docs/03-fasen.md` en `docs/plan-feedbackronde.md`. Opdracht: punt 6. Model: Sonnet.

**Doel.** Er staat maar één weekend vast. Andere vastlegknoppen zijn uitgeschakeld; wijzigen kan alleen via "Ander weekend kiezen" met een bevestiging die toont wat het raakt.

- **Eisen:** ACC-1 aangepast; nieuw ACC-6 (één vastgelegd weekend, andere knoppen uit), ACC-7 (losmaken met bevestiging)
- **Aannames:** AAN-63 aangepast; nieuw AAN-81 (wanneer losmaken kan en wat het raakt)
- **Besluit K3:** losmaken laat een geboekte accommodatie staan; de bevestiging waarschuwt dat de boeking bij de oude datum hoort.
- **Leest:** spec §5.3, §7.6, §8 ACC; AAN-63, AAN-65; overdracht fase 24.
- **Raakt:** `src/server/acties/accommodatie.js` (`weekendVastleggen`, nieuw `weekendLosmaken`), `src/server/rechten.js`, `src/server/api.js` (`STANDAARD`), `src/web/screens/accommodatie-beheer.js`, `overzicht.js` (top 5), `src/shared/start.js` (aftelteller, eersteActie), tests.
- **Klaar als:** `npm run check` groen. Een tweede `weekendVastleggen` geeft `gesloten`. In de UI is het gekozen weekend gemarkeerd en zijn de andere knoppen `disabled`. "Ander weekend kiezen" vraagt bevestiging met wat het raakt (aftelteller, een geboekte accommodatie), maakt los, en daarna kan vastleggen weer. Losmaken en vastleggen wachten op de Sheet met bezig-status op de knop.

## Afsluiten

`npm run check` groen; commit `fase 25: één vastgelegd weekend met uitweg (ACC-6, ACC-7)`; overdracht; sessielog.
