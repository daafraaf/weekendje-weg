# Fase 26: Synchronisatielaag (optimistisch opslaan)

Hoort bij `docs/03-fasen.md` en `docs/plan-feedbackronde.md`. Opdracht: punt 8. Model: Opus.

**Doel.** Kleine handelingen staan direct in beeld en gaan via een wachtrij gebundeld naar de Sheet. Grote acties blijven wachten op bevestiging. Meenemen gaat als eerste over, daarna het formulier.

- **Eisen:** nieuw SYNC-1 (optimistisch in beeld, geen blokkerende lader), SYNC-2 (debounce 1 s, één `bundel`-aanroep), SYNC-3 (wachtrij in localStorage met try/catch, bij openen alsnog versturen), SYNC-4 (één indicator: Opslaan…, Opgeslagen, Niet opgeslagen, opnieuw proberen), SYNC-5 (opnieuw proberen met oplopende wachttijd, daarna terugdraaien met melding en Opnieuw), SYNC-6 (waarschuwing bij verlaten), SYNC-7 (per item schrijven, laatste wint, onder het slot), SYNC-8 (grote acties wachten met bezig-status op de knop); aangepast GRP-5 (lader), NFR-12 (offline: kleine handelingen gaan de wachtrij in), FRM-8, FRM-10, §7.16.4
- **Aannames:** nieuw AAN-82 (debounce, wachttijden 2, 4, 8, 16, 30 s, hooguit 25 acties per bundel), AAN-83 (welke acties optimistisch zijn; laatste wint zonder versiecheck voor die acties)
- **Besluit K4:** het formulier slaat elk veld automatisch op via de wachtrij; de knop Opslaan verdwijnt.
- **Leest:** spec §5.3, §7.4.8, §7.4.9, §7.16, NFR-8, NFR-12, NFR-15; `src/web/api.js`, `src/server/api.js`; overdracht fase 25.
- **Raakt:** `src/web/stand.js` en `src/web/wachtrij.js` (nieuw), `src/web/api.js`, `src/web/app.js` (indicator, `beforeunload`, lader), `src/server/acties/bundel.js` (nieuw) en `src/server/api.js`, `src/server/acties/items.js` (`afvinken`, `claimIntrekken` idempotent), `src/server/acties/antwoorden.js` (patch per veld), `src/web/screens/meenemen.js`, `formulier.js`, `src/web/components/tagveld.js`, de nepbackend (aanroepen tellen, fout naspelen), CSS.
- **Klaar als:** `npm run check` groen. e2e: aanvinken bij Meenemen staat direct in beeld zonder lader; tien snelle klikken leveren hooguit drie aanroepen; na verversen staat alles er; een nagebootste netwerkfout toont "Niet opgeslagen, opnieuw proberen", wordt opnieuw geprobeerd en lukt na herstel; definitief mislukt draait terug met melding. Unit: de wachtrij overleeft herladen; twee deelnemers die tegelijk verschillende items aanvinken houden allebei hun vinkje.

## Bouwen

1. **Server.** Actie `bundel` met een lijst van `{ actie, data }`; alleen acties uit een vaste lijst; alles onder het bestaande slot met één flush; uitslag per actie. Een fout in één actie stopt de rest niet.
2. **Optimistisch:** claimen, claim intrekken, afvinken, formuliervelden en tags (patch per veld op `Antwoorden.data`), top 3 (fase 27 gebruikt de laag). **Blijft wachten:** weekend vastleggen of losmaken, boeken, onthullen, deelvorm, stap zetten, item toevoegen of verwijderen, post opslaan, betaling markeren, alle beheeracties.
3. **Voorkant.** Een scherm zet zijn gegevens in `stand`, past de wijziging lokaal toe en zet een actie in de wachtrij. Na een geslaagde bundel geen volledige herlaadronde per klik; wel bij `visibilitychange`. De schil-lader en de `data-schrijft`-blokkade gelden alleen nog voor grote acties.
4. **Spec en aannames** (§7.16 krijgt een lid over de wachtrij).

## Afsluiten

`npm run check` groen; commit `fase 26: synchronisatielaag met wachtrij (SYNC-1 t/m SYNC-8)`; overdracht; sessielog.
