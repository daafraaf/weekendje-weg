# Overdracht fase 12

Af: weekend vastleggen, accommodaties beheren, deelvorm kiezen en stemmen (ACC-1 t/m ACC-5).
Schermen: `#/accommodaties` (iedereen; kaarten met stemmen, "Kies als favoriet", Geboekt, prijs p.p., https-site) en `#/accommodatie-beheer` (alleen beheer; weekend uit top 5 of lijst, deelvorm info/stemmen/geboekt, toevoegen, wijzigen, verwijderen met bevestiging, "Zet op geboekt").
Server: `acties/accommodatie.js` (`weekendVastleggen`, `accommodatieOpslaan`, `accommodatieVerwijderen`, `deelvormZetten`, `stemmen`, scherm `accommodaties`). Logica in `shared/accommodatie.js` (`prijsPerPersoon`, `heleEuro`, `isHttpsLink`, `ACC_GRENZEN`).
Rechten: scherm `accommodaties` is voor deelnemers pas vanaf de stap Accommodatie (§7.6.2, was `iedereen`). De organisator stemt met zijn eigen deelnemersrij (AAN-39).
Nieuwe aannames: AAN-63 (weekend uit lijst, opnieuw vastleggen vervangt), AAN-64 (grenzen, prijs 0 = onbekend, max 12), AAN-65 (geboekt hoort bij één accommodatie, verwijderen ruimt op). AAN-08 heeft zijn codeplek.
`vastgelegdWeekend` (vrijdag, JJJJ-MM-DD) is gezet maar nog nergens gebruikt voor de aftelteller (fase 14) en maaltijden/programma (fase 15 e.v.); lees `editie.vastgelegdWeekend` en `geboektAccommodatieId`.
Demo-editie kreeg `vastgelegdWeekend`, `deelvorm` en `geboektAccommodatieId` (leeg) in `test/mock-backend/demo.mjs`.
Verwijderen van een accommodatie vraagt een tweede klik ("Ja, verwijderen"), geen dialoogvenster.
Niet gebouwd: de desktopindeling van het ontwerp (mobiele kolom op alle breedtes), een kaartweergave of vakantiekenmerken bij de weekendkeuze.
Niet getest: echte telefoon, schermlezer, donkere modus. Een afgehaakte deelnemer kan nog stemmen; zijn stem telt mee.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
