# Overdracht feedbackronde 2 (BV-01 t/m BV-36)

Onbewaakte run van 11 november 2026. Plan in commit 86387f2 (spec 0.11, aannames 0.28, fasen 29 t/m 33).

## Fasen
- Fase 29 foutafhandeling en versie: GROEN 137492b (BV-04, 05, 12, 13, 14, 24, 35)
- Fase 30 binnenkomen en Start: GROEN 14fde35 (BV-02, 06, 07, 08, 20, 21, 22, 23, 33, 36)
- Fase 31 navigatie en layout: GROEN bd67729 (BV-16, 17, 18, 19)
- Fase 32 weekend en stappen: GROEN 3561826 (BV-01, 25, 26)
- Fase 33 teksten, onderdelen en details: GROEN 092a998 (BV-09, 10, 11, 15, 27, 28, 29, 30, 31, 34)
Na elke fase heb ik `npm run check` zelf opnieuw gedraaid: steeds groen.

## Bevindingen
- Opgelost: 34 van de 36, elk met "Opgelost in fase NN" in `docs/bevindingen-test-2026-11-11.md`.
- BV-03: al opgelost bij de uitrol van 11 november, geen fase.
- BV-32: niet opgelost, beslissing voor jou (zie open punten).

## Aannames in deze run
- AAN-88 (nieuw): Stappen vraagt een bevestiging bij een stap vooruit: niet iedereen ingevuld, weekend meer dan 7 dagen weg, open betalingen bij Afgerond.
- AAN-89 (nieuw): Nieuwe editie stelt het eerste vrije jaar vanaf dit jaar voor, titel "Weekendje weg <jaar>" en het kalenderjaar als periode.
- AAN-90 (nieuw): de organisator kan zichzelf niet inactief maken; een dubbele voornaam geeft een waarschuwing.
- AAN-05 aangepast: ook van Afgerond terug naar Afrekening.
- AAN-29 aangepast: betaling markeren en terugdraaien blijven na Afgerond mogelijk.
- AAN-81 aangepast: losmaken kan tot en met de stap Meenemen.
- De aannamecheck slaat status "gepland ..." over, zodat een plan aannames kan vastleggen vóór de bouw.

## Open punten
- BV-32: rangorde AAN-06 zet een weekend met 0 ja en 0 nee boven een weekend met 3 ja en 1 nee. Kies: niet-ingevuld als onzeker tellen, of sorteren op ja min nee, dan misschien.
- AAN-89 letterlijk: in november 2026 met alleen een editie 2027 stelt de app 2026 voor. Wil je liever "vanaf volgend jaar" als het jaar bijna om is?
- Meenemen toont met Boodschappen uit nog "Boodschappen zijn definitief. Claimen kan niet meer." onder Uit eigen keuken (gezien in fase 33, niet opgelost).
- Stapnamen korten tussen 768 en 1199 px nog af; desktopindeling begint bij 768 px in plaats van 1024 (fase 31).
- Niet getest op een echt toestel en niet met een echte wachtwoordmanager; alleen Playwright tegen de nepbackend.

## Uitrol (samen met Claude, API_VERSIE is nu 2)
Voorkant en script moeten kort na elkaar live, anders ziet de groep "Het script van deze groep is verouderd".
1. `npm run check` groen.
2. `git push` (GitHub Pages).
3. Sjabloon-Sheet: `npm run build`, `clasp push`, `clasp deploy -i <bestaande implementatie-ID>`.
4. Groep "Leid0n Test" (eigen kopie): `npm run build`, `clasp push`, `clasp deploy -i <bestaande implementatie-ID>`.
Altijd een nieuwe versie op de bestaande implementatie, nooit een nieuwe implementatie. Daarna je test op telefoon en laptop.
