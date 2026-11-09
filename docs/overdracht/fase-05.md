# Overdracht fase 5

Af: editie aanmaken en uitnodigen. Server: `acties/editie.js` (`editieAanmaken`, `linksMaken`, `pincodeVernieuwen`, `linkVernieuwen`, `beheerlinkMaken`); scherm `beheer` geeft nu `edities` (eigen edities met deelnemers en `heeftLink`, zonder geheimen).
Gedeeld: `shared/editie.js` (blokkendefaults, `deadlineIso`, `stapDatums` volgens §7.2.4), `shared/whatsapp.js` (uitnodiging en pincodetekst, `heeftLinkEnPincode`).
Voorkant: `screens/editie-nieuw.js`, `screens/uitnodigen.js` (menu-items Nieuwe editie en Uitnodigen, alleen beheer), `delen.js` (delen en kopiëren), `navigatie.js` (enige plek met `wa.me`, AAN-37), `beheerapi.js` (aanroephulp voor beheerschermen).
Keuzes buiten de spec: "Links maken" is een knop op het uitnodigscherm (editie maken doet dat niet zelf); link en pincode staan alleen in het geheugen van dat scherm; een nieuwe pincode laat de link ongemoeid en toont dan alleen de pincode; `linkVernieuwen` wist alleen de deelnemerssessies van die deelnemer; `deelnemersBeheren` is niet gebouwd (staat niet in de fase).
Nieuwe aannames: AAN-46 (maker is organisator en deelnemer, minstens twee deelnemers), AAN-47 (`linksMaken` alleen zonder bestaande link), AAN-48 (deadline 23:59 Amsterdamse tijd).
Volgende fase: een editie krijgt `lijsten: {}` (EDI-2 vult ze); `stapData` heeft alleen invullen, overzicht en accommodatie; het uitnodigscherm kent geen stap-WhatsApp, herinnering of betaalverzoek (alleen de twee teksten uit EDI-4). Het beheerscherm kent nog geen `editieBijwerken`.
Niet getest: `navigator.share` en klembord op een echt apparaat (e2e stubt het deelmenu; het klembord faalt netjes met een melding); het echte Apps Script met deze acties.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
