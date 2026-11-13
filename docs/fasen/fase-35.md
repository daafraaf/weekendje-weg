# Fase 35: Boodschappen als wensenlijst

Hoort bij `docs/03-fasen.md`, toegevoegd op 13 november 2026 op verzoek van David (spec 0.13, aannames 0.30).
Model: Sonnet.

**Doel.** Leden zetten zelf op de lijst wat ze graag willen, zoals speciaalbier of een bepaalde snack. Dat kan
zodra er een weekend is vastgelegd en blijft kunnen tot de organisator de lijst definitief maakt.

- **Eisen:** MEE-11, MEE-12, MEE-13 (nieuw); OND-1 (Boodschappen aan); MEE-5 t/m MEE-9 en MEE-10 blijven gelden;
  NAV-10, NAV-11, OND-2
- **Aannames:** AAN-80 (aangepast: boodschappen aan), AAN-93 (nieuw, zet de status van "gepland fase 35" op
  "open" en geef hem een plek in de code en een test met het ID in de naam)
- **Leest:** spec §7.6.8, §7.7, §7.8 (vooral punt 9 tot en met 11), §7.14, §8 OND-1, OND-2, MEE-5 t/m MEE-13,
  NAV-10, NAV-11; overdracht van de vorige fase; artboards `docs/design/Boodschappen.dc.html`,
  `BoodschappenDicht.dc.html`, `D-Boodschappen.dc.html`, `T-BoodschappenWacht.dc.html`, `Meenemen.dc.html` en
  `Main.dc.html` (rij Boodschappenlijst).
- **Raakt:**
  - `src/shared/onderdelen.js`: `boodschappen: true`;
  - de tabs onder Meenemen, net als `src/web/components/tabs.js` bij Afrekening: Wie neemt wat mee en
    Boodschappen. Het hoofdmenu blijft zeven items en Meenemen is actief op beide tabs;
  - `src/web/screens/boodschappen.js`: het invoerblok "Zet iets op de lijst" met naam en categorie (voorstel uit
    `src/shared/categorieen.js`), bij elk item de naam van wie hem toevoegde ("jij" voor jezelf), "uit eigen
    keuken" bij een keukenitem zonder claim, en weghalen van je eigen item zolang de lijst open is;
  - de wachttoestand zonder vastgelegd weekend ("Komt zodra het weekend vastligt", lijst niet zichtbaar);
  - de serveractie die een `boodschap` toevoegt: `gesloten` zonder vastgelegd weekend of na definitief (AAN-93),
    ook als het item via Wie neemt wat mee binnenkomt;
  - de teksten van `losmakenGevolgen` in `src/shared/stappen.js`, die erbij krijgen dat toevoegen stilstaat tot
    er een nieuw weekend ligt.

  Startscherm, eerstvolgende actie ("Boodschappen definitief maken") en status per onderdeel lezen de vlag al
  (OND-2); controleer dat ze verschijnen.
- **Klaar als:** `npm run check` groen. Playwright op 390 en 1280 pixels:
  - zonder vastgelegd weekend toont de tab Boodschappen de wachttekst en weigert het script toevoegen met
    `gesloten`;
  - met een vastgelegd weekend zet een deelnemer "Tripel Karmeliet, 4 flesjes" op de lijst, onder Frisdrank, bier
    en wijn, met zijn naam erbij, en kan hij hem weer weghalen;
  - na Lijst definitief maken kan niemand meer toevoegen en afvinken werkt nog;
  - na Ander weekend kiezen blijven de items staan en is toevoegen dicht;
  - het menu heeft zeven items en op 360 pixels scrolt niets horizontaal (NFR-9).

## Bouwen

Per eis eerst een test, dan de bouw. Houd de CSP intact: geen inline stijlen of `style`-attributen. Toevoegen gaat
als optimistische handeling via de wachtrij (AAN-83), zoals claimen en afvinken. Een weigering met `gesloten`
draait terug en meldt dat rustig. Licht en donker volgen de tokens.

## Afsluiten

`npm run check` groen; commit `fase 35: boodschappen als wensenlijst (OND-1, MEE-11, MEE-12, MEE-13, AAN-80, AAN-93)`;
`docs/overdracht/fase-35.md`; één regel in het sessielog van MEMORY.md.
