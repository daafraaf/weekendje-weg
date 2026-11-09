# Overdracht fase 4

Af: groep opzetten en beheer. Server: `acties/opzet.js` (setupcode, `groepOpzetten`, menulogica), `acties/beheertoegang.js` (`inloggenBeheer`, `wachtwoordInstellen`, `startBeheerSessie`), `acties/leden.js` (`ledenBeheren`, scherm `beheer`), `gas/menu.js` en `gas/deps.js` (`eigenschappen` = PropertiesService).
Voorkant: `screens/opzetten.js` (rondleiding + 4 stappen), `beheerlogin.js`, `leden.js`; `router.js` kent nu `soort` (deelnemer of beheer) en `ververs()`.
Keuzes buiten de spec: `deps.eigenschappen` bewaart alleen hash en verlooptijd van de setupcode; de beheerlogin vraagt met een lege poging of er al een wachtwoord is (telt niet als fout, `data.wachtwoordInstellen`); het ledenscherm is de landing van een beheersessie en verbergt de stappenbalk; `scherm` heeft nu één handler (`beheer`), andere namen geven nog 'ongeldig'.
Nepbackend: `nep.setupcode()` en `nep.beheerlink(lidId, wachtwoord)` spiegelen de menu-items; `npm run mock -- --leeg` toont een setupcode.
Nieuwe aannames: AAN-43 (eigenaar direct ingelogd), AAN-44 (blokkade beheerwachtwoord), AAN-45 (menu toont fragment); AAN-41 vervallen. AAN-14, 20, 28 staan nu in de code.
Niet getest: het echte Apps Script-menu (`ui.prompt`, `ScriptApp.getService().getUrl()`, mogelijk extra scope) en `PropertiesService`; alleen tegen nagebootste diensten. Meten in fase 20.
Open: de verouderd-melding (§7.17) noemt de README maar heeft nog geen link, want de repo-URL ontbreekt; fase 20 vult die in. `verlopen` van een beheersessie stuurt het ledenscherm terug naar het plakveld, de deelnemersschermen volgen met hun fase.
Volgende fase: `beheerlinkMaken` (EDI-6), `pincodeVernieuwen`/`linkVernieuwen` moeten `resetPogingen` aanroepen; `startBeheerSessie` geeft `editieId: ''`.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
