# Overdracht fase 13

Af: wie neemt wat mee (MEE-1 t/m MEE-4). Scherm `#/meenemen` (iedereen): drie secties, "Ik neem mee" en "Intrekken", chips met namen op volgorde van claim ("jij" voor jezelf), item toevoegen met voorgestelde categorie, eigen item verwijderen met tweede klik. De organisator haalt een claim van een ander weg met de kruisknop.
Server: `acties/items.js` (`itemOpslaan`, `itemVerwijderen`, `claimen`, `claimIntrekken`, `claimsVervallen`, `startItems`, scherm `meenemen`). Logica in `shared/categorieen.js` (`CATEGORIEEN`, `stelCategorieVoor`).
Een nieuwe editie krijgt de startlijst keuken en spullen als items (`editieAanmaken`); `maakDemo({ items: true })` doet dat voor de demo (`npm run mock` heeft het aan).
Afhaken laat de claims vervallen (AAN-11, in `afhakenMarkeren`). Na `boodschappenDefinitief` weigert de server claimen, intrekken, toevoegen en verwijderen op keuken en boodschap; nog niets zet de vlag (fase 14).
Nieuwe aanname: AAN-66 (grenzen 60 tekens en 200 items, voorstel alleen zonder meegestuurde categorie, afgehaakte claimt niet, startitems zijn van niemand). AAN-11, AAN-19, AAN-26 hebben hun codeplek.
Keuze buiten de spec: de derde sectie toont alle `boodschap`-items (ook zonder claim, met "nog niemand"), niet alleen geclaimde, zodat een nieuwe boodschap zichtbaar is.
Voor fase 14: boodschappenlijst = `boodschap` en `keuken` zonder claim; `Items.afgevinkt` en `categorie` staan klaar; fase 15 vult `maaltijdId` voor kok-ingrediënten (nu altijd leeg).
Niet gebouwd: afvinken, definitief zetten, kopieer als tekst, bewerken van een itemnaam in de UI (de actie kan het wel), desktopindeling.
Niet getest: echte telefoon, schermlezer, donkere modus. Wijzigingen aan de lijsten keuken en spullen in `#/lijsten` raken bestaande items niet.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
