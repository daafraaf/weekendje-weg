# Overdracht fase 23 (stappenbalk één bron en menu in stapvolgorde)

Af: STA-8, NAV-10, NAV-11; STA-1, STA-6, NAV-1, NAV-9 en §7.2.1, §7.2.6, §7.14 bijgewerkt (spec 0.5).
Stand: `web/app.js` houdt één `editieStand` uit `scherm start` (`haalStand`, `zetStand`); ophalen bij openen, elke navigatie, `visibilitychange` en na `stapZetten`/`editieBijwerken` (`bijStap` in stappenbeheer). Het startscherm geeft zijn eigen antwoord door zolang er geen editiekeuze is. Een beheersessie krijgt nu ook de balk (nieuwste eigen editie). `VOORBEELD` en `#/start?stap=` zijn weg; stappenbeheer heeft geen eigen balk meer.
Namen: `STAPNAMEN` en `komtInStap` in `shared/stappen.js` (Invullen, Weekendje prikker, Accommodatie, Meenemen, Weekend, Afrekening, Afgerond); `components/stappenbalk.js` exporteert geen namen meer. WhatsApp: "De stap X volgt rond ...".
Menu: `MENU` en `menuItems` in `shared/start.js`, altijd zeven items; beheersessie zonder Invullen, Beheren na `.menu-scheiding`. Het item van de huidige stap heeft `data-stap-nu` (stip). Boodschappen, kookbeurten, programma, kamers en carpool staan niet in het menu (fase 24 zet ze uit).
Afrekening: menu-item opent `#/posten`; tabs Wie betaalt wat / Eindafrekening (`components/tabs.js`); h1 van `#/afrekening` heet nu Eindafrekening.
Niet aan de beurt: `components/komtin.js`; Weekendje prikker en Accommodatie bij een deelnemer vóór hun stap (`bijGesloten` in `beheerapi.js`). Meenemen en Afrekening blijven open, zoals de server toelaat.
Aannames: AAN-40 vervallen; AAN-12 en AAN-71 herschreven (tests `NAV-10 AAN-12`, `AAN-71` in `navigatie.spec.mjs`). STA-8-test met twee contexten in `navigatie.spec.mjs`.
Keuzes buiten de spec: zonder stand (laden of offline bij de eerste keer) toont de balk geen huidige stap en "Stap laden…"; serverfout "tot de stap Weekendje prikker" in `acties/vragen.js`.
Niet getest: het gedrag van `visibilitychange` (alleen de code); de menuweergave met acht items op een echt toestel.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, aannames, unittests, build, playwright`
