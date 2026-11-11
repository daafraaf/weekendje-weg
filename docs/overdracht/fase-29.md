# Overdracht fase 29 (foutafhandeling en versie)

Af: NFR-21, NFR-22, §7.17, SYNC-5, SYNC-8, EDI-12, NAV-13; BV-04, BV-05, BV-12, BV-13, BV-14, BV-24, BV-35. Geen nieuwe aannames.
- `API_VERSIE` is 2 in `src/server/api.js` en `src/web/api.js`. De snapshot van `ACTIES` staat in `test/unit/foutafhandeling.test.mjs`: een nieuwe of vervallen actie vraagt versie +1 aan beide kanten en een nieuwe snapshot. Het script toetst de versie nu vóór de actie.
- Nepbackend als oud script: `maakNepApi({ apiVersie: 1 })`, `startServer({ apiVersie })`, `startNep(context, { apiVersie: 1 })`.
- Foutteksten: alleen `src/web/foutteksten.js` (`leesbareMelding(code, melding, actie)`), aangeroepen in `web/api.js` en per uitslag in `web/wachtrij.js`. `VEROUDERD_TEKST` (AAN-14) staat daar nu; `web/api.js` exporteert hem opnieuw. Servermeldingen blijven technisch; een nieuw veld krijgt een regel in `VELDEN` of `PER_ACTIE`.
- Wachtrij (BV-24): acties uit localStorage heten `hersteld`; weigert het script er een, dan valt ze stil weg (geen Niet opgeslagen, geen Opnieuw). Een netwerkfout na alle pogingen geeft wel de melding.
- Router (NAV-13): een onbekende route of een scherm van de andere rol gaat met `history.replaceState` naar `#/start`.
- Bezig-knop (SYNC-8): de schil zet in een `data-schrijft`-knop "Opslaan…" met `aria-busy`; de oude tekst wordt `aria-label` en komt terug na het antwoord. Bevestigingen staan bij het veld: Meenemen per sectie, Eigen vragen onder het formulier, deelvorm in het blok Hoe kiezen we?.
- Eigen vragen: de knop heet "Vraag toevoegen" (niet te verwarren met Toevoegen van het optieveld); één optie geeft "Geef minstens twee antwoordopties." (voorkant en server).
- e2e: `test/e2e/foutafhandeling.spec.mjs`, met layout op 360, 390 en 1280 px zonder "null" in main. De menu-check op 360 en 390 staat op `test.fixme` tot NAV-12 (fase 31). Start bleef buiten de null-check: BV-02 hoort bij fase 30.
- Niet getest: een echt oud GAS-script met deze voorkant (alleen de nepbackend met apiVersie 1).
