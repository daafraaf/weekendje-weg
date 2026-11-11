# Overdracht fase 32 (weekend en stappen)

Af: ACC-1, ACC-7, §7.6.8, §7.2.2, §7.2.7, §7.12.4, EDI-7, GELD-9, UIT-2; BV-01, BV-25, BV-26. AAN-88 gebouwd (status open); AAN-05, AAN-29 en AAN-81 gevolgd.
- Weekendblok in `components/weekendkeuze.js` (`maakWeekendKeuze({ schrijf, teken })`), gebruikt door `accommodatie-beheer.js` en `overzicht.js`. Op Weekendje prikker alleen voor een beheersessie (`sessie.soort === 'beheer'`); dat scherm laadt daarvoor ook `scherm accommodaties`.
- `LOSMAKEN_STAPPEN` in `shared/stappen.js` (overzicht, accommodatie, voorbereiding) voor `rechten.js` en `losmakenMogelijk`. Vanaf Weekend toont het blok "Het weekend wijzigen kan tot en met de stap Meenemen. Zet de stap terug onder Stappen." met link `#/stappen?editie=`.
- `stapWaarschuwingen` en `stapVraag` in `shared/stappen.js` (AAN-88). Stappen laadt `scherm start` van de gekozen editie voor `voortgang.nogNiet`, `vastgelegdWeekend` en `afrekening.aantalOpen` en toont een groep "Naar X bevestigen".
- Na Afgerond: `NA_AFGEROND` in `rechten.js` laat `betalingMarkeren`, `betalingTerugdraaien` en `stapZetten` door (stapMogelijk staat alleen terug naar Afrekening toe). `afrekeningScherm` geeft `magMarkeren` ook na Afgerond; betaalverzoek blijft zichtbaar.
- `stapTekst` kreeg `aantalOpen`; bij Afgerond met open betalingen geen "afgerekend".
- Geen serverwijziging in het contract (geen nieuwe acties), dus `API_VERSIE` blijft 2. Een oud script geeft na Afgerond nog `gesloten` op betalingen; dat lost de volgende uitrol op.
- e2e: `test/e2e/weekend-stappen.spec.mjs`; de layouttest kreeg Weekendje prikker voor de organisator. Een stap vooruit in e2e via `stapVooruit(page, naam)` in `hulp.mjs` (bevestigt AAN-88 als erom gevraagd wordt).
- Niet aangeraakt: de bevestiging noemt nog maaltijden en programma, ook als die uit staan (BV-27, latere fase).
