# Fase 33: Teksten, onderdelen en details

Hoort bij `docs/03-fasen.md`, feedbackronde 2 (`docs/01-interview.md`, "Feedbackronde 2"). Model: Sonnet.

**Doel.** Teksten kloppen met wat aan staat en met de informatieve deadline, een verrassing blijft na onthullen
beperkt tot de geboekte, de organisator kan items toewijzen, en een paar kleine dingen in Leden, Nieuwe editie en
Wie betaalt wat.

- **Bevindingen:** BV-09, BV-10, BV-11, BV-15, BV-27, BV-28, BV-29, BV-30, BV-31, BV-34
- **Eisen:** EDI-10, EDI-11 (nieuw), GRP-5, §7.12.4, OND-2, ACC-9, ACC-10, MEE-10 (nieuw), §6 (nieuwe rij), TOE-7,
  GELD-12 (nieuw), DDL-1
- **Aannames:** AAN-89 en AAN-90 (nieuw, status "gepland fase 33": zet ze op "open" als ze gebouwd zijn), AAN-15,
  AAN-80, AAN-87
- **Leest:** spec §6, §7.6.6, §7.7.4, §7.12, §7.13.4, §8 GRP-5, EDI-10, EDI-11, ACC-9, ACC-10, MEE-10, GELD-2,
  GELD-12, OND-2, DDL-1; AAN-89, AAN-90; overdracht `docs/overdracht/fase-32.md`; artboards `Meenemen.dc.html` en
  `UitgaveToevoegen.dc.html`.
- **Raakt:** het beheer-overzicht (BV-09 "Stap en deadline"); teksten rond de deadline in Nieuwe editie, Stappen en
  de herinnering in `src/shared/whatsapp.js` (BV-10); `src/shared/editie.js` (`nieuweEditieVoorstel`, AAN-89) en
  het scherm Nieuwe editie; `src/server/acties/leden.js` en het scherm Leden (AAN-90); `src/shared/whatsapp.js`
  (Meenemen, Accommodatie zonder opties) en de bevestiging in `accommodatie-beheer.js`, die `ONDERDELEN` volgen;
  Stappen waarschuwt bij nul opties; `src/server/acties/geheim.js` (na onthullen alleen de geboekte) met een
  nieuw geval in `geheimLekt` (`accommodatie.test.mjs`); `src/server/acties/items.js` plus `rechten.js` (actie om
  een claim op naam van een deelnemer te maken, alleen organisator) en het scherm Meenemen ("Toewijzen aan ...");
  de categoriekeuze onder Uit eigen keuken alleen met `onderdeelAan('boodschappen')`; het postformulier (Bedrag per
  persoon voorvullen). Een nieuwe actie wijzigt de actielijst: `API_VERSIE` blijft 2, omdat versie 2 nog niet is
  uitgerold en alle fasen van deze ronde samen live gaan; werk de snapshot uit fase 29 bij en noteer dat in de overdracht.
- **Klaar als:** `npm run check` groen. Unittests: een deelnemer die toewijst krijgt `geen_toegang` (TOE-7), de
  organisator maakt een claim op naam van een ander; na onthullen geeft geen leesactie een niet-geboekte optie;
  `nieuweEditieVoorstel` (test met AAN-89 in de naam) kiest het eerste vrije jaar en het kalenderjaar; zichzelf
  inactief maken geeft `ongeldig` (test met AAN-90). Een test controleert dat de WhatsApp-teksten en de
  bevestiging bij Ander weekend kiezen geen uitgezet onderdeel noemen (uitbreiding van de test uit fase 28).
  e2e: geen "vult iedereen ... in" of "kan nu tot" bij de deadline; wisselen van Gelijk naar Bedrag laat
  "nog € 0,00 te verdelen" zien.

## Bouwen

Per bevinding eerst een test die de fout laat zien, dan de fix. De actie voor toewijzen hoort niet in de wachtrij
(het is een beheeractie, groot).

## Afsluiten

`npm run check` groen; commit `fase 33: teksten, onderdelen en details (EDI-10, EDI-11, GRP-5, ACC-10, MEE-10, GELD-12, AAN-89, AAN-90; BV-09, BV-10, BV-11, BV-15, BV-27, BV-28, BV-29, BV-30, BV-31, BV-34)`;
`docs/overdracht/fase-33.md`; één regel in het sessielog; "Opgelost in fase 33" achter elke opgeloste BV.
