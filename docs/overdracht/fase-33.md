# Overdracht fase 33 (teksten, onderdelen en details)

Af: EDI-10, EDI-11, GRP-5, ACC-10, MEE-10, GELD-12, OND-2, §7.12.4; BV-09, 10, 11, 15, 27, 28, 29, 30, 31, 34. AAN-89 en AAN-90 gebouwd (status open).
- Nieuwe actie `claimToewijzen` (`acties/items.js`, alleen organisator in `rechten.js`, geen wachtrij). `API_VERSIE` bleef 2: versie 2 is nog niet uitgerold; de snapshot in `foutafhandeling.test.mjs` kreeg de actie erbij. Scherm `meenemen` geeft de organisator `deelnemers` voor "Toewijzen aan …".
- `stapTekst` en `losmakenGevolgen` (`shared/stappen.js`) volgen `ONDERDELEN`; `stapTekst` kreeg `aantalOpties` en `onderdelen`. Stappen laadt `scherm accommodaties` in Weekendje prikker en Meenemen voor het aantal opties; `stapWaarschuwingen` vraagt bij Samen kiezen zonder opties (niet bij Verrassing).
- Deadline-teksten: "Graag ingevuld vóór ..." in herinnering, stapbericht, Stappen en Nieuwe editie.
- `nieuweEditieVoorstel` (`shared/editie.js`) met `jaren` uit scherm `beheer` (alle edities van de groep). Strikt volgens AAN-89: in 2026 met alleen een editie 2027 is het voorstel 2026.
- `zichtbareOpties` in `acties/geheim.js`: na onthullen ziet een deelnemer alleen de geboekte. Nieuw geval in `accommodatie.test.mjs`.
- AAN-90: server weigert zelf-inactief (`ongeldig`), geen knop; dubbele naam via `zelfdeNaam` in nieuw `shared/leden.js`.
- GELD-12: `bedragenVan` in `shared/verdeling.js`; bij Bedrag toont de status ook bij nul "Nog € 0,00 te verdelen" (geen "Verdeeld:" meer in die wijze).
- e2e: `test/e2e/teksten-details.spec.mjs` (met layoutcheck 360/390/1280 op Meenemen); unit: `test/unit/teksten-details.test.mjs`.
- Gezien, niet aangeraakt: bij Boodschappen uit toont Meenemen in de demo nog "Boodschappen zijn definitief. Claimen kan niet meer." onder Uit eigen keuken.
