# Fase 32: Weekend en stappen

Hoort bij `docs/03-fasen.md`, feedbackronde 2 (`docs/01-interview.md`, "Feedbackronde 2"). Model: Opus.
Hangt af van fase 31 (menu en schermkoppen).

**Doel.** De organisator legt het weekend vast en kiest een ander weekend waar de uitleg dat belooft, tot en met
Meenemen. Stappen vooruit vragen een korte bevestiging als iets nog niet klaar is, en Afgerond sluit open
betalingen niet meer op.

- **Bevindingen:** BV-01, BV-25, BV-26
- **Eisen:** ACC-1, ACC-7, §7.6.8, §7.2.2, §7.2.7, §7.12.4 (bericht bij Afgerond), EDI-7, GELD-9, UIT-2, §6
- **Aannames:** AAN-81 en AAN-05 en AAN-29 (aangepast in het plan, code en tests bijwerken), AAN-88 (nieuw, status
  "gepland fase 32": zet hem op "open" als hij gebouwd is)
- **Leest:** spec §6 (slotregel), §7.2, §7.6.8, §7.12, §8 ACC-1, ACC-6, ACC-7, EDI-7, GELD-9; AAN-05, AAN-29, AAN-81,
  AAN-88; overdracht `docs/overdracht/fase-31.md`; artboard `Overlap.dc.html` (knoppen op Weekendje prikker).
- **Raakt:** `src/server/acties/accommodatie.js` (`weekendLosmaken` ook in `voorbereiding`); `src/shared/stappen.js`
  (`stapMogelijk`: van `afgerond` terug naar `afrekenen`; nieuw `stapWaarschuwingen` met AAN-88);
  `src/server/rechten.js` (`reden`: betaling markeren en terugdraaien na Afgerond, AAN-29); het scherm Weekendje
  prikker (`overzicht`) voor de organisator: Leg vast en Ander weekend kiezen, met dezelfde bevestiging als
  `accommodatie-beheer.js` (deel de code); de melding met link naar Stappen vanaf Weekend; het scherm Stappen
  (bevestiging met de redenen, knop Terug naar Afrekening); `src/shared/whatsapp.js` (bericht bij Afgerond);
  `src/web/uitleg.js` als de tekst over losmaken verandert.
- **Klaar als:** `npm run check` groen. Unittests: losmaken in `voorbereiding` lukt, in `weekend` geeft `gesloten`;
  `stapWaarschuwingen` (test met AAN-88 in de naam) geeft de drie redenen; `betalingMarkeren` na Afgerond lukt
  (AAN-29), een post toevoegen na Afgerond niet; stap `afgerond` → `afrekenen` lukt. e2e: de organisator legt het
  weekend vast op Weekendje prikker, kiest een ander weekend na de bevestiging en legt opnieuw vast; in stap
  Weekend staat de melding met een werkende link naar Stappen; Naar Afgerond met open betalingen vraagt een
  bevestiging met het aantal; het bericht bij Afgerond zegt dan niet "afgerekend".

## Bouwen

Per bevinding eerst een test die de fout laat zien, dan de fix. De bevestigingen zijn voorkant; de server
controleert alleen wat AAN-05, AAN-29 en AAN-81 zeggen.

## Afsluiten

`npm run check` groen; commit `fase 32: weekend en stappen (ACC-1, ACC-7, EDI-7, GELD-9, AAN-88; BV-01, BV-25, BV-26)`;
`docs/overdracht/fase-32.md`; één regel in het sessielog; "Opgelost in fase 32" achter elke opgeloste BV.
