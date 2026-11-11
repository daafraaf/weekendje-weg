# Overdracht fase 30 (binnenkomen en Start)

Af: TOE-13, STA-4, STA-9, NAV-2, NAV-4, NAV-15 (titel); BV-02, BV-06, BV-07, BV-08, BV-20, BV-21, BV-22, BV-23, BV-33, BV-36. Geen nieuwe aannames.
- `vervang(el, ...kinderen)` in `web/dom.js` laat null, undefined en false weg; gebruik het in plaats van `replaceChildren` zodra er een kind kan ontbreken (nu in `start.js` en `uitnodigen.js`; de schermen met `zet` filterden al).
- Pinscherm: met een link in het fragment geen plakveld, alleen "Link herkend"; pinvakjes `type="text"`, plus `data-1p-ignore`, `data-lpignore`, `data-bwignore` op alle velden.
- Elke login (ook beheer en opzetten) eindigt op `#/start`. e2e: `naarLeden(page)` en `uitloggen(page)` (via het profielmenu) in `hulp.mjs`; Leden houdt zijn eigen Uitloggen-knop.
- Scherm `start` geeft `ikNaam` (iedereen) en `voortgang.zonderLink` (alleen organisator). `eersteActie`: "Iedereen uitnodigen" zolang `zonderLink > 0`; bij Afrekening "Betalingen afvinken" onder de kop Openstaande betalingen.
- Profielmenu: `wortel.zetNaam(naam)` vanuit `zetStandVanStart`/`haalStand` in `app.js`; tekst "Naam · organisator" of "Naam · deelnemer".
- NAV-15: `TITEL_OP_SCHERM` in `app.js` (start, formulier) zet `data-titel-dubbel` op `.balk-plek`; CSS verbergt dan `.sb-titel`. Een nieuw scherm met de editietitel als kop of bovenschrift hoort in die set.
- e2e: `test/e2e/binnenkomen-start.spec.mjs` (Start per stap en rol zonder null op 360, 390 en 1280 px, alleen desktopprojecten); de layouttest in `foutafhandeling.spec.mjs` neemt nu ook Start en Uitnodigen mee. Menu-items op mobiel blijven `test.fixme` tot fase 31 (BV-16).
- Niet getest: een echte wachtwoordmanager (alleen de attributen).
