# Overdracht fase 25 (één vastgelegd weekend met uitweg)

Af: ACC-1 (aangepast), ACC-6, ACC-7; AAN-63 aangepast, AAN-81 nieuw; spec 0.7, aannames 0.24.
Server: `weekendVastleggen` geeft `gesloten` als er al een weekend vastligt. Nieuw `weekendLosmaken` (`acties/accommodatie.js`, registratie in `STANDAARD`, regel in `rechten.js`: organisator, alleen in de stappen overzicht en accommodatie, anders `gesloten`; zonder vastgelegd weekend `gewijzigd`).
Losmaken wist alleen `vastgelegdWeekend` (K3): geboekte accommodatie, deelvorm, maaltijden en stemmen blijven. Datums bij maaltijden en programma en de aftelteller verdwijnen vanzelf (leeg weekend).
Scherm `accommodaties` geeft `losmakenMogelijk` mee (organisator-kant, AAN-81).
UI (`accommodatie-beheer.js`): gekozen weekend heet "<weekend> is vastgelegd" (knoptekst Vastgelegd), andere knoppen en de keuzelijst `disabled`; "Ander weekend kiezen" opent een bevestiging (aftelteller, datums, geboekte accommodatie hoort bij de oude datum); knoppen dragen `data-schrijft` voor de bezig-status. Buiten de twee stappen staat er een hint in plaats van de knop.
`overzicht.js` en `shared/start.js` hoefden niet te wijzigen: ze kenden al een leeg weekend (aftelteller weg, eersteActie "Weekend vastleggen").
Tests: unit (accommodatie, rechten, maaltijden aangepast: eerst losmaken), e2e `accommodatie.spec.mjs` (ACC-6 ACC-7 AAN-81).
Niet gedaan: synchronisatielaag (fase 26), nieuwe accommodatievormen (fase 27). Losmaken in de stap Voorbereiding of later kan niet; wie dat wil, zet de stap terug.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, aannames, unittests, build, playwright`
