# Ontwerp Weekendje weg

Versie 9 november 2026, bij designbrief 0.3 en bouwspec 0.3.
Canvas in Claude Design: https://claude.ai/artifact/VUKgkd2jpwbnuTNf8LY7hr

## Wat hier staat

- `tokens.css`: alle kleuren, glas, hoeken en het lettertype als CSS-variabelen. Licht is
  standaard, donker volgt `prefers-color-scheme`. Fase 2 neemt dit bestand over.
- `icon.svg` en `icon-maskable.svg`: bron voor de manifest-iconen 192, 512 en maskable.
- `*.dc.html`: één artboard per scherm, met demodata Studievrienden 2027. Het zijn
  ontwerpbronnen voor de Claude Design-editor, geen bouwcode: lees de markup, de klassen en de
  `<style>` in `<helmet>`. Draaien buiten de editor werkt niet (`support.js` ontbreekt).

## Hoe je ze leest

- In elke `<style>` staan dezelfde tokens als in `tokens.css`, op `.ww` (licht) en `.ww.dark`
  (donker). In de app worden dat `:root` en de media query.
- Componentklassen sluiten aan op `src/web/components/`: stappenbalk (`stappenbalk`,
  `.seg`), kalender (`.mcal`, `.band`, `.dc`), schuif (`.range`), drieknop (`.drie`),
  vinkjeslijst (`.vink`), verdeelinvoer (`.segm` plus de rijen), kaart (`.card`), toast
  (`.toast`), menu (`.nav-m` mobiel, `.nav-d` desktop). Glas is `.glass`, stevig is `.solid`.
- Status: `.st-ja`, `.st-mis`, `.st-nee`, `.st-leeg`, altijd met ✓ ~ ✕ of stippelrand.
- De jaarkalender in `Formulier.dc.html` en `D-Formulier.dc.html` is interactief. De logica
  in het `<script>`-blok laat zien hoe maandbladen, balken, vakanties en tellingen worden
  opgebouwd; de feestdagen en vakanties daar zijn demowaarden, in de app komen ze uit
  `src/shared/feestdagen.js` en `data/vakanties.json`.
- Elke artboard bestaat ook in donker op het canvas; hier staat alleen de lichte versie.

## Artboards

| Bestand | Scherm | Soort | Eisen |
|---|---|---|---|
| `Tokens.dc.html` | Tokens | fundament |  |
| `Componenten.dc.html` | Componenten | fundament |  |
| `Icoon.dc.html` | App-icoon | fundament |  |
| `Binnenkomen.dc.html` | Link plakken en pincode | mobiel 390 | TOE-1 t/m 4, TOE-11 |
| `Beheerlogin.dc.html` | Beheerlogin | mobiel 390 | TOE-5 |
| `Rondleiding.dc.html` | Rondleiding | mobiel 390 | RON-1 t/m 4 |
| `Opzetwizard.dc.html` | Opzetwizard | mobiel 390 | GRP-2, GRP-4, RON-5 |
| `Main.dc.html` | Startscherm deelnemer | mobiel 390 | STA-3, STA-5 |
| `StartOrganisator.dc.html` | Startscherm organisator | mobiel 390 | STA-4 |
| `Formulier.dc.html` | Formulier | mobiel 390 | FRM, KAL |
| `Voortgang.dc.html` | Voortgang | mobiel 390 | OVZ-1, OVZ-2 |
| `Overlap.dc.html` | Overlapoverzicht | mobiel 390 | OVZ-3 t/m 5 |
| `Detail.dc.html` | Detailoverzicht | mobiel 390 | OVZ-6 |
| `Uitnodigen.dc.html` | Editie nieuw en uitnodigen | mobiel 390 | EDI-1, EDI-4 |
| `Accommodaties.dc.html` | Accommodaties | mobiel 390 | ACC |
| `Meenemen.dc.html` | Wie neemt wat mee | mobiel 390 | MEE-1 t/m 4 |
| `Boodschappen.dc.html` | Boodschappenlijst | mobiel 390 | MEE-5 t/m 9 |
| `Kookbeurten.dc.html` | Kookbeurten | mobiel 390 | KOK |
| `Programma.dc.html` | Programma | mobiel 390 | PRG |
| `KamersCarpool.dc.html` | Kamers en carpool | mobiel 390 | KMR, CAR |
| `Posten.dc.html` | Posten en verdeling | mobiel 390 | GELD-1 t/m 7 |
| `UitgaveToevoegen.dc.html` | Uitgave toevoegen | mobiel 390 | GELD-1 t/m 7 |
| `Afrekening.dc.html` | Afrekening | mobiel 390 | GELD-8 t/m 10 |
| `Archief.dc.html` | Archief | mobiel 390 | ARC |
| `D-StartOrganisator.dc.html` | Desktop · startscherm organisator | desktop 1280 | STA-4 |
| `D-Overlap.dc.html` | Desktop · overlapoverzicht | desktop 1280 | OVZ-3 t/m 5 |
| `D-Detail.dc.html` | Desktop · detailoverzicht | desktop 1280 | OVZ-6 |
| `D-Formulier.dc.html` | Desktop · formulier | desktop 1280 | FRM, KAL |
| `D-Posten.dc.html` | Desktop · posten en verdeling | desktop 1280 | GELD-1 t/m 7 |
| `D-Afrekening.dc.html` | Desktop · afrekening | desktop 1280 | GELD-8 t/m 10 |
| `T-Laden.dc.html` | Toestand · laden | toestand, mobiel |  |
| `T-Druk.dc.html` | Toestand · druk | toestand, mobiel |  |
| `T-Offline.dc.html` | Toestand · geen verbinding | toestand, mobiel |  |
| `T-Leeg.dc.html` | Toestand · leeg | toestand, mobiel |  |
| `T-AlleenLezen.dc.html` | Toestand · alleen-lezen | toestand, mobiel |  |
| `T-Blokkade.dc.html` | Toestand · pincode geblokkeerd | toestand, mobiel |  |
| `T-Gewijzigd.dc.html` | Toestand · elders gewijzigd | toestand, mobiel |  |
