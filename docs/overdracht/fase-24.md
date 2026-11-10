# Overdracht fase 24 (onderdelen uit en invullen vrijer)

Af: OND-1, OND-2, OND-3, FRM-11, DDL-1; FRM-8, FRM-9, OVZ-1, STA-1, EDI-7, EDI-8 (vervallen), EDI-10 en §7.2.3, §7.2.4, §7.2.6, §7.4.8 bijgewerkt (spec 0.6).
Vlaggen: `ONDERDELEN` en `onderdeelAan(naam, vlaggen)` in `src/shared/onderdelen.js`, alle vijf `false` (AAN-80). Uit betekent: `registreerOnderdeel` in `web/app.js` registreert de route niet, `voorbereidingRijen` en `eersteActie` (tweede argument `vlaggen`) slaan het over, het startscherm toont geen programma, `meenemen.js` laat de sectie Boodschappen weg. Acties, tabs en schermbestanden blijven.
Invullen: `ontbreekt()` vraagt alleen een weekend (AAN-33); kopjes Budget, Reistijd en Verblijf dragen "(optioneel)"; de knop Opslaan blijft tot fase 26.
Deadline: `rechten.js` blokkeert niet meer op `naDeadline` (de ctx-waarde blijft bestaan); formulier toont "Graag ingevuld vóór ..."; `alleenLezen` kent alleen nog 'stap'.
stapData: niet meer gelezen of geschreven (kolom blijft); `stapDatums`, `stapDatum`, het blok Verwachte datum per stap en de datums in de balk zijn weg; `stapTekst` zegt "Daarna volgt de stap X" zonder datums.
Tests: e2e herschrijven in de bundel de vlaggen: `zetOnderdelen(context, 'alle' | 'standaard' | [namen])` in `test/e2e/hulp.mjs`; `koppelNep` zet standaard alle aan, tests met een eigen `context.route` roepen `zetOnderdelen(context)` zelf aan. Nieuw: `test/e2e/onderdelen.spec.mjs`, `test/unit/onderdelen.test.mjs`.
Niet gedaan: Kookbeurten-eetwensen en kamerwens in het formulier bleven zoals ze waren; de demo-fixtures houden hun `stapData`.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, aannames, unittests, build, playwright`
