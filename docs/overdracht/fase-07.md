# Overdracht fase 7

Af: invulformulier met de vier vaste blokken (Kalender, Budget, Reistijd, Verblijf), opslaan, ingevuld-status, alleen-lezen na de deadline of vanaf Overzicht, en versieconflict.
Server: `acties/antwoorden.js` met `antwoordenOpslaan` ({ versie, data }; versie 0 = nog niets opgeslagen, een andere versie dan in de Sheet geeft `gewijzigd`) en scherm `formulier` (editie, vragen, standaardWoonplaats, `alleenLezen` = null | 'stap' | 'deadline', antwoorden met versie). Opslaan zet `Deelnemers.ingevuld` en `ingevuldOp`.
Gedeeld: `shared/antwoorden.js` (schijven, `ontbreekt`/`isIngevuld`, `VERBLIJF_WENSEN`). Voorkant: `screens/formulier.js`, `components/schuif.js`, `components/drieknop.js`; `maakKalender` kreeg `alleenLezen`.
De server accepteert al het hele `Antwoorden.data` uit §5.2 (ook activiteiten, programma, eten en drinken, samenwerken, eigenVragen), maar het formulier toont die blokken nog niet: dat is FRM-5, FRM-6, FRM-7 voor fase 8. Het formulier stuurt bij opslaan het hele object terug, dus die velden blijven bewaard.
Keuzes buiten de spec: de route `kalender` is weg, het menu heeft "Invullen" (`#/formulier`, alleen deelnemers; een beheersessie ziet het formulier niet, AAN-39 voor de organisator als deelnemer volgt later); onder het formulier staat een vaste opslaanbalk met "Nog nodig: ..." (niet sticky). Woonplaats is leeg toegestaan, anders 2 tot 60 tekens.
Aannames: AAN-51 (drieknop: nogmaals tikken wist de keuze), AAN-52 (labels verblijfswensen); AAN-33 heeft zijn codeplek, AAN-50 is vervallen.
Testhulp: `test/e2e/hulp.mjs` heeft `startNep` en `koppelNep` (nepbackend met sessietoken `lokaal` voor Anna); de demo-editie heeft nu periode 2027, voorkeursmaanden, blokken en een deadline in 2099. `kalender.spec.mjs` loopt via `#/formulier`.
Niet getest: echte telefoon of schermlezer, schuif met een vinger. Het scherm gebruikt `fill` op de range-input.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
