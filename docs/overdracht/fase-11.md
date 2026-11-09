# Overdracht fase 11

Af: `#/afrekening` (menu "Afrekening", voor deelnemer en organisator): kaart "Jij betaalt" met "Markeer als betaald", lijst "Alle betalingen · x van y betaald" (open eerst, dan betaald), knoppen Betaald en Terugdraaien voor wie betrokken is of organisator, "Saldo nu" en de privacyregel over rekeningnummers (GELD-8, GELD-9).
Betaalverzoek (GELD-10): alleen de ontvanger ziet de knop per open betaling; die opent een kaart met de tekst en Delen/Kopieer (`deelKnoppen`). Tekst: `betaalverzoekTekst` in `shared/whatsapp.js` (AAN-22).
Logica: `shared/afrekening.js` (`afrekening(saldi, naamVan)`, AAN-35, `zelfdeBetaling`). Open betalingen worden altijd herberekend uit de saldi na de rijen in `Betalingen`; zo werkt afrekenen in rondes.
Server: `acties/afrekening.js` (scherm `afrekening`, `betalingMarkeren`, `betalingTerugdraaien`), `acties/afhaken.js` (`afhakenMarkeren` met `{ deelnemerId, afgehaakt }`). `deelnemersVan`, `mijnRij`, `naamFunctie` uit posten.js zijn nu geëxporteerd.
EDI-9: het afhaken staat voor de organisator onderaan de afrekening ("Wie doet mee"), want er was nog geen deelnemersscherm met ID's (voortgang toont bewust geen ID's). Mag later verhuizen.
Afhaken zet nu alleen de vlag. Claims (§7.7.5) en kamers/carpool (§7.11.4) volgen in fase 13 en 16; haak daar aan op `afhakenMarkeren`.
Nieuwe aanname: AAN-62 (alleen een betaling die nu open staat kan op betaald, anders `gewijzigd`). AAN-22 en AAN-35 hebben hun codeplek.
Demo: `maakDemo({ afrekening: true })` voegt het huisje (Eva, € 480 gelijk), een betaalde betaling Bram → Eva en de afgehaakte Chris toe; `npm run mock -- --stap=afrekenen` zet het aan.
CSS: `.t-display` en `.av-sm` stonden nog niet in app.css en zijn toegevoegd.
Niet getest: echte telefoon, `navigator.share` echt delen, schermlezer op de betalingslijst, donkere modus, desktopindeling uit D-Afrekening (tabel en saldobalken zijn niet gebouwd; mobiele lijst op alle breedtes).
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
