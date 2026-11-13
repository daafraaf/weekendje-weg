# Ontwerp Weekendje weg

Versie 13 november 2026, bij designbrief 0.4. Gelijkgetrokken met de code van 11 november
(fase 20 t/m 33) en met de swipe-kalender van brief §5.1 (KAL-8 t/m KAL-12, voorstel).
Canvas in Claude Design: https://claude.ai/artifact/VUKgkd2jpwbnuTNf8LY7hr

Bij strijd geldt de code: `src/web/css/tokens.css` voor de tokens, de spec voor gedrag.

## Wat hier staat

- `tokens.css`: de tokens uit de code (accent #175891 / #7AB8EE, zand, feest, heatmap).
  `tokens-9nov.css` is de oude versie van het eerste ontwerp.
- `icon.svg` en `icon-maskable.svg`: bron voor de manifest-iconen.
- `*.dc.html`: één artboard per scherm, met demodata Studievrienden 2027. Ontwerpbronnen voor
  de Claude Design-editor, geen bouwcode: lees de markup, de klassen en de `<style>` in
  `<helmet>`. Draaien buiten de editor werkt niet (`support.js` ontbreekt).
- `_to_delete/`: artboards die niet meer bestaan (T-Gewijzigd, T-Leeg). Mag weg.

## Wat er sinds 9 november veranderd is

- Kopregel op elk scherm: synchronisatie-indicator (Opslaan…, Opgeslagen, Niet opgeslagen,
  opnieuw proberen) en profielknop met naam en rol, Uitleg, Installeren, Uitloggen.
- Stappenbalk met de nieuwe stapnamen, zonder datums, met info-knop "i" voor de uitleg.
- Menu: Start, Invullen, Voortgang, Weekendje prikker, Accommodatie, Meenemen, Afrekening.
  Mobiel alleen iconen, het actieve item met label, een stip bij de huidige stap. Een
  beheersessie heeft geen Invullen en krijgt Beheren apart na een scheidingslijn.
- Start: route "Zo gaat het weekend" bij het eerste bezoek, link "Hoe werkt het?",
  Afgelopen weekenden uitklapbaar.
- Invullen: geen knop Opslaan meer, alles behalve één weekend optioneel, "Graag ingevuld
  vóór …", verblijfswensen als drieknop, tagvelden onder de vinkjes, "?" achter de koppen.
- Kalender op mobiel (`Formulier.dc.html`, interactief): één maand tegelijk in een
  strook, swipen van rechts naar links voor de volgende maand, pijltjes in de maandkop, tikbare
  jaarstrook met de huidige maand in accentblauw, opent op de eerste maand met een leeg
  weekend, schuift de eerste keer 48 px op en veert terug. Bij `prefers-reduced-motion` geen
  beweging maar de tekst "Veeg naar links voor de volgende maand". Elk blad reserveert zes
  weekrijen. In het artboard is het swipen nagebootst met pointer-events; bouw het volgens
  §5.1 met `scroll-snap-type: x mandatory`.
- Hele maand per maandblad: lege weekenden in één keer op ja, misschien of nee.
- Weekendje prikker: heatmapvakje met ja, de vrijdag en daaronder misschien en nee;
  organisator met Top weekenden, Leg vast, kies uit alle weekenden en Ander weekend kiezen
  met bevestiging.
- Accommodatie in twee vormen: Samen kiezen (top 3 met 1, 2, 3, stand in punten, bedden en
  eigen kamers) en Verrassing ("✓ Geregeld").
- Afrekening met twee tabs: Wie betaalt wat en Eindafrekening.
- Nieuw: Beheren-overzicht, Stappen met "Toch door?", Per persoon met tags, profielmenu open,
  toestanden opslaan bezig en niet opgeslagen, "Komt in stap …".
- Boodschappen weer aan als tab onder Meenemen (spec 0.13, fase 35): wensen op de lijst met naam
  en categorie, "Komt zodra het weekend vastligt" zonder vastgelegd weekend, dicht na definitief.
- Op de plank: Kookbeurten, Programma en Kamers en carpool. Alleen licht.

## Artboards

| Bestand | Scherm | Soort | Eisen |
|---|---|---|---|
| `Tokens.dc.html` | Tokens | fundament |  |
| `Componenten.dc.html` | Componenten | fundament |  |
| `Icoon.dc.html` | App-icoon | fundament |  |
| `Binnenkomen.dc.html` | Link plakken en pincode | mobiel 390 | TOE-1 t/m 4, TOE-11 |
| `Beheerlogin.dc.html` | Beheerlogin | mobiel 390 | TOE-5 |
| `Rondleiding.dc.html` | Rondleiding | mobiel 390 | RON-1 t/m 4, NAV-6 |
| `Opzetwizard.dc.html` | Opzetwizard | mobiel 390 | GRP-2, GRP-4 |
| `Main.dc.html` | Start · deelnemer | mobiel 390 | STA-3, STA-5, NAV-4 |
| `StartRoute.dc.html` | Start · eerste bezoek | mobiel 390 | UIT-1 t/m 3, STA-9 |
| `StartOrganisator.dc.html` | Start · organisator | mobiel 390 | STA-4 |
| `Profielmenu.dc.html` | Profielmenu open | mobiel 390 | NAV-2, NAV-8 |
| `Archief.dc.html` | Archief | mobiel 390 | ARC |
| `Formulier.dc.html` | Invullen | mobiel 390 | FRM, KAL-1 t/m 12, TAG, DDL-1, OND-3 |
| `Voortgang.dc.html` | Voortgang | mobiel 390 | OVZ-1, OVZ-2 |
| `Overlap.dc.html` | Weekendje prikker · deelnemer | mobiel 390 | OVZ-3 t/m 5 |
| `PrikkerOrganisator.dc.html` | Weekendje prikker · organisator | mobiel 390 | ACC-1, ACC-6, ACC-7 |
| `Accommodaties.dc.html` | Accommodatie · samen kiezen | mobiel 390 | ACC-8, ACC-11 t/m 14 |
| `AccVerrassing.dc.html` | Accommodatie · verrassing | mobiel 390 | ACC-9, ACC-10 |
| `Posten.dc.html` | Afrekening · wie betaalt wat | mobiel 390 | GELD-1 t/m 7, NAV-11 |
| `UitgaveToevoegen.dc.html` | Uitgave toevoegen | mobiel 390 | GELD-1 t/m 7 |
| `Afrekening.dc.html` | Afrekening · eindafrekening | mobiel 390 | GELD-8 t/m 10, NAV-11 |
| `Beheren.dc.html` | Beheren | mobiel 390 | NAV-9 |
| `Stappen.dc.html` | Stappen · bevestiging | mobiel 390 | EDI, AAN-88 |
| `Detail.dc.html` | Per persoon | mobiel 390 | OVZ-6, TAG-9 |
| `Uitnodigen.dc.html` | Uitnodigen | mobiel 390 | EDI-4 |
| `D-StartOrganisator.dc.html` | Desktop · start organisator | desktop 1280 | STA-4, NAV-14 |
| `D-Overlap.dc.html` | Desktop · weekendje prikker | desktop 1280 | OVZ-3 t/m 5, ACC-1, ACC-6 |
| `D-Detail.dc.html` | Desktop · per persoon | desktop 1280 | OVZ-6, TAG-9 |
| `D-Formulier.dc.html` | Desktop · invullen | desktop 1280 | FRM, KAL |
| `D-Posten.dc.html` | Desktop · afrekening, wie betaalt wat | desktop 1280 | GELD-1 t/m 7, NAV-11 |
| `D-Afrekening.dc.html` | Desktop · afrekening, eindafrekening | desktop 1280 | GELD-8 t/m 10, NAV-11 |
| `T-Laden.dc.html` | Toestand · laden | toestand, mobiel |  |
| `T-Bezig.dc.html` | Toestand · opslaan bezig | toestand, mobiel | SYNC-4 |
| `T-Teruggezet.dc.html` | Toestand · niet opgeslagen | toestand, mobiel | SYNC-4, SYNC-5 |
| `T-Druk.dc.html` | Toestand · druk | toestand, mobiel |  |
| `T-Offline.dc.html` | Toestand · geen verbinding | toestand, mobiel |  |
| `T-KomtIn.dc.html` | Toestand · komt in stap | toestand, mobiel | NAV-10 |
| `T-AlleenLezen.dc.html` | Toestand · alleen-lezen | toestand, mobiel |  |
| `T-Blokkade.dc.html` | Toestand · pincode geblokkeerd | toestand, mobiel |  |
| `Kookbeurten.dc.html` | Kookbeurten | op de plank (uitgezet) |  |
| `Programma.dc.html` | Programma | op de plank (uitgezet) |  |
| `KamersCarpool.dc.html` | Kamers en carpool | op de plank (uitgezet) |  |
| `Meenemen.dc.html` | Meenemen | mobiel 390 | MEE-1 t/m 4, MEE-10, MEE-11, UIT-4 |
| `Boodschappen.dc.html` | Meenemen · boodschappen | mobiel 390 | MEE-5 t/m 9, MEE-11, MEE-12 |
| `BoodschappenDicht.dc.html` | Boodschappen · definitief (organisator) | mobiel 390 | MEE-6, MEE-13 |
| `D-Boodschappen.dc.html` | Desktop · boodschappen | desktop 1280 | MEE-5 t/m 9, MEE-11, MEE-12 |
| `T-BoodschappenWacht.dc.html` | Toestand · boodschappen voor het prikken | toestand, mobiel | MEE-13, AAN-93 |
