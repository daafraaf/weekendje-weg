# Fase 29: Foutafhandeling en versie

Hoort bij `docs/03-fasen.md`, feedbackronde 2 (`docs/01-interview.md`, "Feedbackronde 2"). Model: Opus.

**Doel.** Een verouderd script meldt zich netjes, de gebruiker ziet nooit een technische fouttekst, en grote
acties laten bij de knop zien dat ze bezig zijn.

- **Bevindingen:** BV-04, BV-05, BV-12, BV-13, BV-14, BV-24, BV-35 (zie `docs/bevindingen-test-2026-11-11.md`)
- **Eisen:** NFR-21, NFR-22 (nieuw), §7.17, SYNC-5, SYNC-8, EDI-3, EDI-12 (nieuw), NAV-13 (nieuw)
- **Aannames:** AAN-14 (verouderd script), AAN-82, AAN-83 (wachtrij); geen nieuwe gepland
- **Leest:** spec §7.16.5, §7.17, §8 EDI-3, EDI-12, SYNC-5, SYNC-8, NAV-13, §10 NFR-21, NFR-22; overdracht
  `docs/overdracht/fase-28.md`; artboards `T-Druk.dc.html` en `T-Gewijzigd.dc.html` alleen als je een melding vormgeeft.
- **Raakt:** `src/server/api.js` en `src/web/api.js` (`API_VERSIE` naar 2), een nieuwe unittest met een snapshot
  van de actielijst plus versie; een vertaalfunctie van `ongeldig`-meldingen naar gewone taal (voorkant, één plek);
  `src/web/stand.js` en de schil (melding "Niet opgeslagen" na herladen alleen als er echt iets terug te zetten is);
  `src/web/app.js` (onbekende route met `history.replaceState` naar `#/start`); het scherm Vragen (Eigen vragen:
  minstens twee opties, oude melding weg, bezig-status in de knop); de knoppen van grote acties (item toevoegen,
  eigen vraag toevoegen, deelvorm wisselen): `aria-busy` plus tekst in de knop, bevestiging bij het veld, veld leeg na succes.
- **Klaar als:** `npm run check` groen. Unittest: wijzig je `ACTIES` zonder `API_VERSIE` te verhogen, dan faalt de
  snapshot (bewijs met een test die de vergelijkfunctie met een gewijzigde lijst aanroept). Nepbackend met
  `apiVersie` 1 toont de verouderd-melding van §7.17. e2e: een lege vraag geeft "Vul een vraag in." en geen
  "Veld data."; een geweigerde wachtrij-actie toont geen veldnaam; na herladen staat er geen "Niet opgeslagen";
  `#/vragen` als deelnemer en `#/onzin` eindigen op `#/start`; een keuzevraag met één optie geeft "Geef minstens
  twee antwoordopties."; tijdens het opslaan van een item heeft de knop `aria-busy="true"` en daarna is het veld leeg.

## Bouwen

Per bevinding eerst een test die de fout laat zien, dan de fix. De vertaling van foutteksten staat op één plek in
de voorkant; laat de serverteksten technisch, zodat logs en tests ze blijven herkennen. Een onbekende actie
(`ongeldig` op `verzoek.actie`) krijgt de tekst uit NFR-21.

## Afsluiten

`npm run check` groen; commit `fase 29: foutafhandeling en versie (NFR-21, NFR-22, SYNC-5, SYNC-8, EDI-12, NAV-13; BV-04, BV-05, BV-12, BV-13, BV-14, BV-24, BV-35)`;
`docs/overdracht/fase-29.md`; één regel in het sessielog; "Opgelost in fase 29" achter elke opgeloste BV.
