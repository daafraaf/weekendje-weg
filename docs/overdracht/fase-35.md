# Overdracht fase 35 (boodschappen als wensenlijst)

Af: OND-1, MEE-11, MEE-12, MEE-13, AAN-80 (boodschappen aan), AAN-93 (status open, `boodschapDicht` in `acties/items.js`).
- Nieuwe actie `boodschapToevoegen` (in `BUNDEL_ACTIES`, optimistisch via de wachtrij): dezelfde naam van dezelfde persoon blijft één item, laatste categorie wint. Daarom `API_VERSIE` 3: voorkant en script moeten samen live.
- AAN-93 in het script: `boodschapToevoegen` en `itemOpslaan` met soort boodschap geven `gesloten` zonder vastgelegd weekend of na definitief, ook voor de organisator. Spullen en keuken blijven open.
- Scherm `meenemen` geeft `vastgelegdWeekend`, `boodschapDicht` en per item `door` (naam van wie hem toevoegde).
- Tabs onder Meenemen: `maakMeeTabs` in `components/tabs.js`; menu-item Meenemen heeft `routes: ['meenemen', 'boodschappen']`.
- `screens/boodschappen.js` herschreven: invoerblok blijft één element (tekst blijft staan bij hertekenen), voorlopig item `nieuw:<sleutel>` (`NIEUW_ITEM` in `stand.js`) tot de bundel bevestigt, dan laadt het scherm opnieuw. Een weigering meldt zich in het invoerblok.
- Zonder weekend: wachtpaneel; de lijst staat er alleen als er al boodschappen op staan (na losmaken). Wie neemt wat mee toont dan geen veld voor een nieuwe boodschap.
- `losmakenGevolgen` noemt dat toevoegen stilstaat; uitleg en hint noemen Boodschappen; woordenlijst kent nu ook pils, tripel, dubbel en een paar biermerken.
- Tests: `test/unit/wensenlijst.test.mjs`, `test/e2e/wensenlijst.spec.mjs` (390, 1280 en 360). `maakDemo` kreeg optie `weekend`.
- Uitrol: API_VERSIE 3, dus Pages en `clasp deploy -i` in alle drie de scripts kort na elkaar.
