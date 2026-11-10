# Overdracht fase 22 (groep opzetten met een opzetlink)

Let op: het fasenummer 22 is eerder ook gebruikt voor TAG-10 en NAV-9; die staan in `fase-21.md`.
Af: GRP-1, GRP-6, GRP-7, GRP-8, RON-5. Het Sheet-menu "Groep opzetten" bepaalt het webapp-ID, maakt de setupcode en toont de opzetlink in een dialoog; de app opent daarmee stap 1 met URL en code ingevuld en zet het adres terug op `#/opzetten`.
Nieuw: `src/shared/uitrol.js` (`APP_ADRES`, `SJABLOON_KOPIE`, beide ingevuld), `src/shared/links.js` (linkfuncties voor menu en voorkant; `sessie.js` exporteert ze opnieuw), `src/server/gas/dialoog.js` (pure HTML met `esc`), `leesOpzetlink` en `isOpzetPad` in `sessie.js`.
Rondleiding in drie stappen met de link "Kopie maken"; de knop heet "Ik heb de URL en de setupcode al". `API_VERSIE` en `appsscript.json` zijn ongewijzigd.
Keuzes buiten de spec: de menufunctie heet nog `menuSetupcode` (alleen het label wisselde, `ingangen.js` bleef gelijk). "Groep opzetten" bepaalt het webapp-ID vóór de controle op "al opgezet", zodat een eigenaar bij wie `getUrl()` niets geeft het ID via dat menu kan vastleggen voor "Beheerlink maken". `leesLink` weigert elk fragment dat met `/opzetten` begint. Een code in de opzetlink moet precies acht letters of cijfers zijn. De nepbackend met `--leeg` toont ook de opzetlink.
Nieuwe aannames: AAN-77, AAN-78, AAN-79; AAN-45 bijgewerkt (codeplek `menuBeheerlink`).
Niet getest: de dialoog in een echte Sheet (`HtmlService`, `showModalDialog`) en wat `getUrl()` daar teruggeeft. De menuroute zonder `APP_ADRES` is alleen via `opzetDialoog` getest, omdat de bundel de ingevulde waarde bevat.
David nog: (1) `APP_ADRES` en `SJABLOON_KOPIE` controleren en pushen naar `main`; (2) `npm run build` en `clasp push` naar de sjabloon, geen nieuwe implementatie; de sjabloon leeg houden en delen als "Iedereen met de link: lezer"; (3) proef met een tweede Google-account: kopie via de knop, implementeren, Groep opzetten, link klikken; bevindingen en het gedrag van het webapp-ID (AAN-79) in `docs/overdracht/fase-20-bevindingen.md`.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, aannames, unittests, build, playwright`
