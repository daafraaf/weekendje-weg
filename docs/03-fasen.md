# Bouwfasen Weekendje weg

Versie 0.1, 8 november 2026, bij bouwspec versie 0.1.

Elke fase is één Claude Code-context. Een fase is een verticale plak: hij loopt door alle
lagen heen (data, logica, scherm, test) en levert iets op dat je kunt zien of aanklikken.
Fase 0 en 1 zijn de uitzondering: opzet en fundament. Elke fase heeft een eigen bestand in
`docs/fasen/`; een bouwsessie leest alleen dat bestand, de genoemde paragrafen van de spec
en de vorige overdracht.

De volgorde zet het meeste risico voorop: eerst het doorgeefluik en de toegang (Apps Script
achter een statische site, hashing, sloten), dan de editie en het formulier, dan het geld
met de meeste rekenregels, en pas daarna de lijsten en schermen die vooral invulwerk zijn.
Fase 0 tot en met 19 lopen zonder Google- of GitHub-login tegen de nepbackend. Fase 20 doet
David samen met Claude Code.

## Voor de bouw

- **Ontwerp.** De designfase in Claude Design komt vóór de run. Fasen met een scherm lezen
  `docs/05-designbrief.md` §5 voor hun scherm en het artboard in `docs/design/`. Is het
  ontwerp er nog niet, dan bouwt fase 2 op neutrale tokens en neemt een latere sessie het
  ontwerp over.
- **Eenmalig door David vóór de run:** Node 22 of nieuwer, `npm ci`, `npx playwright install`.
  Daarna is er tot fase 20 niets van hem nodig.
- **Rechten.** Fase 0 legt `.claude/settings.json` vast (NFR-18). Start de run met die
  instellingen, niet met het overslaan van alle toestemmingen.

## Overzicht

| Fase | Naam | Eisen | Aannames | Model |
|---|---|---|---|---|
| 0 | Opzet | NFR-3, NFR-4, NFR-13, NFR-18 | - | Sonnet |
| 1 | Fundament doorgeefluik | TOE-6, TOE-7, NFR-1, NFR-6, NFR-7, NFR-14, NFR-15, NFR-16, NFR-19, NFR-20 | AAN-32 | Opus |
| 2 | Schil | STA-1, STA-2, RON-6, NFR-8, NFR-9, NFR-10, NFR-12 | - | Sonnet |
| 3 | Inloggen met link en pincode | TOE-1, TOE-2, TOE-3, TOE-4, TOE-9, TOE-10, TOE-11, NFR-2, NFR-5 | AAN-01, AAN-02 | Sonnet |
| 4 | Groep opzetten en beheer | GRP-1, GRP-2, GRP-3, GRP-4, GRP-5, TOE-5, RON-5 | AAN-14, AAN-20, AAN-28 | Sonnet |
| 5 | Editie aanmaken en uitnodigen | EDI-1, EDI-4, EDI-5, EDI-6, TOE-8, TOE-12 | AAN-03, AAN-31, AAN-36 | Sonnet |
| 6 | Kalender met vakanties en feestdagen | KAL-1, KAL-2, KAL-3, KAL-4, KAL-5, KAL-6, KAL-7 | AAN-13, AAN-15, AAN-17 | Sonnet |
| 7 | Invulformulier | FRM-1, FRM-2, FRM-3, FRM-4, FRM-8, FRM-9, FRM-10 | AAN-33 | Sonnet |
| 8 | Wensblokken en eigen vragen | FRM-5, FRM-6, FRM-7, EDI-2, EDI-3 | AAN-21 | Sonnet |
| 9 | Voortgang, overzicht en stappen | OVZ-1, OVZ-2, OVZ-3, OVZ-4, OVZ-5, OVZ-6, OVZ-7, EDI-7, EDI-8, EDI-10 | AAN-04, AAN-05, AAN-06, AAN-07 | Opus |
| 10 | Posten en verdeling | GELD-1, GELD-2, GELD-3, GELD-4, GELD-5, GELD-6, GELD-7 | AAN-09, AAN-10, AAN-16 | Opus |
| 11 | Afrekenen en afhaken | GELD-8, GELD-9, GELD-10, GELD-11, EDI-9 | AAN-22, AAN-35 | Opus |
| 12 | Datum vastleggen en accommodaties | ACC-1, ACC-2, ACC-3, ACC-4, ACC-5 | AAN-08 | Sonnet |
| 13 | Wie neemt wat mee | MEE-1, MEE-2, MEE-3, MEE-4 | AAN-11, AAN-26 | Sonnet |
| 14 | Boodschappenlijst | MEE-5, MEE-6, MEE-7, MEE-8, MEE-9 | AAN-19, AAN-27 | Sonnet |
| 15 | Kookbeurten en programma | KOK-1, KOK-2, KOK-3, KOK-4, PRG-1, PRG-2, PRG-3 | AAN-18, AAN-25, AAN-34 | Sonnet |
| 16 | Kamers en carpool | KMR-1, CAR-1, CAR-2 | AAN-23, AAN-24 | Sonnet |
| 17 | Startschermen per stap en archief | STA-3, STA-4, STA-5, STA-6, ARC-1, ARC-2 | AAN-12, AAN-29, AAN-30 | Sonnet |
| 18 | Rondleiding en installatie | RON-1, RON-2, RON-3, RON-4 | - | Sonnet |
| 19 | Eindtest | NFR-11 | - | Opus |
| 20 | Uitrol (met David) | NFR-17 | - | Sonnet |
| 22 | Groep opzetten met opzetlink | GRP-1, GRP-6, GRP-7, GRP-8, RON-5 | AAN-28, AAN-45, AAN-77, AAN-78, AAN-79 | Sonnet |
| 23 | Stappenbalk één bron en menu | STA-8, NAV-10, NAV-11 (STA-1, STA-6, NAV-1, NAV-9 aangepast) | AAN-12, AAN-40, AAN-71 | Opus |
| 24 | Onderdelen uit en invullen vrijer | OND-1, OND-2, OND-3, FRM-11, DDL-1 | AAN-33, AAN-80 | Sonnet |
| 25 | Weekend vastleggen met uitweg | ACC-6, ACC-7 | AAN-63, AAN-81 | Sonnet |
| 26 | Synchronisatielaag | SYNC-1 t/m SYNC-8 | AAN-82, AAN-83 | Opus |
| 27 | Accommodatie verrassing of samen kiezen | ACC-8 t/m ACC-13 | AAN-08, AAN-65, AAN-84 | Opus |
| 28 | Uitleg van de stappen | UIT-1 t/m UIT-4 | AAN-85 | Sonnet |
| 29 | Foutafhandeling en versie | NFR-21, NFR-22, SYNC-5, SYNC-8, EDI-12, NAV-13 | AAN-14 | Opus |
| 30 | Binnenkomen en Start | TOE-13, STA-4, STA-9, NAV-2, NAV-15 | AAN-71, AAN-85 | Sonnet |
| 31 | Navigatie en layout | NAV-10, NAV-12, NAV-14, NAV-15, UIT-2 | AAN-12 | Sonnet |
| 32 | Weekend en stappen | ACC-1, ACC-7, EDI-7, GELD-9 | AAN-05, AAN-29, AAN-81, AAN-88 | Opus |
| 33 | Teksten, onderdelen en details | EDI-10, EDI-11, GRP-5, ACC-10, MEE-10, GELD-12 | AAN-89, AAN-90 | Sonnet |
| 34 | Swipen door de maanden | KAL-8 t/m KAL-12 | AAN-91, AAN-92 | Sonnet |
| 35 | Boodschappen als wensenlijst | OND-1, MEE-11, MEE-12, MEE-13 | AAN-80, AAN-93 | Sonnet |

## Fase 0: Opzet

- **Eisen:** NFR-3, NFR-4, NFR-13, NFR-18
- **Raakt:** zie `fasen/fase-00.md`
- **Klaar als:** `npm run check` eindigt met één groene regel. Een proefbestand met `innerHTML = x`, `eval(` of een externe `<script src>` in `src/web` maakt hem rood. `dist/web/index.html` bevat de CSP uit NFR-4. De rooktest opent de lege pagina in Chromium en WebKit.
- **Leest:** spec §3, §4, §10 (NFR-3, NFR-4, NFR-13, NFR-18)

## Fase 1: Fundament doorgeefluik

- **Eisen:** TOE-6, TOE-7, NFR-1, NFR-6, NFR-7, NFR-14, NFR-15, NFR-16, NFR-19, NFR-20
- **Aannames:** AAN-32
- **Raakt:** zie `fasen/fase-01.md`
- **Klaar als:** `npm run check` groen. `npm run mock` start de nepbackend op localhost; `curl -X POST -H 'Content-Type: text/plain' -d '{"actie":"status"}'` geeft `ok: true` met `apiVersie`. Elke rij uit §6 heeft een rechtentest. `dist/gas/` bevat één Apps Script-bestand dat `doPost` exporteert. Twee parallelle schrijfacties op dezelfde rij geven één `gewijzigd`. Een onverwachte fout geeft JSON met code `fout`. De hashtestvector is gelijk in Node en in de GAS-code.
- **Leest:** spec §3 (één logica, twee adapters, HTTP-contract, bundel, appsscript.json), §5, §6, §7.1.3, §7.1.4, §7.16, §10 (NFR-1, 6, 7, 14, 15, 16, 19, 20)
- **Hangt af van:** fase 0

## Fase 2: Schil

- **Eisen:** STA-1, STA-2, RON-6, NFR-8, NFR-9, NFR-10, NFR-12
- **Raakt:** zie `fasen/fase-02.md`
- **Klaar als:** `npm run check` groen. De Playwright-test toont de stappenbalk op 360 en 1440 pixels, wisselt licht en donker via `colorScheme`, en ziet de offline-melding bij `context.setOffline(true)`. De manifest-test vindt naam, iconen en `standalone`.
- **Leest:** spec §7.2.1, §8 STA-1, STA-2, RON-6, §9, §10 (NFR-8, 9, 10, 12), `docs/05-designbrief.md` §3 en §4
- **Hangt af van:** fase 1

## Fase 3: Inloggen met link en pincode

- **Eisen:** TOE-1, TOE-2, TOE-3, TOE-4, TOE-9, TOE-10, TOE-11, NFR-2, NFR-5
- **Aannames:** AAN-01, AAN-02
- **Raakt:** zie `fasen/fase-03.md`
- **Klaar als:** `npm run check` groen. In de browser: demolink zonder pincode toont alleen het pinscherm; `123456` opent een lege startpagina; vijf foute pogingen tonen de blokkadetijd. Een nieuwe context zonder fragment accepteert de geplakte demolink. De XSS-test faalt niet op het pinscherm.
- **Leest:** spec §7.1, §8 TOE, §10 (NFR-2, NFR-5)
- **Hangt af van:** fase 2

## Fase 4: Groep opzetten en beheer

- **Eisen:** GRP-1, GRP-2, GRP-3, GRP-4, GRP-5, TOE-5, RON-5
- **Aannames:** AAN-14, AAN-20, AAN-28
- **Raakt:** zie `fasen/fase-04.md`
- **Klaar als:** `npm run check` groen. Tegen de nepbackend doorloopt de e2e-test de wizard met een setupcode uit de console, kiest een wachtwoord, en komt op het beheerscherm. Een tweede opzet wordt geweigerd. Een afwijkende `apiVersie` toont de melding uit §7.17.
- **Leest:** spec §3 (Implementaties), §7.1.9, §7.1.10, §7.17, §8 GRP, TOE-5, RON-5
- **Hangt af van:** fase 3

## Fase 5: Editie aanmaken en uitnodigen

- **Eisen:** EDI-1, EDI-4, EDI-5, EDI-6, TOE-8, TOE-12
- **Aannames:** AAN-03, AAN-31, AAN-36
- **Raakt:** zie `fasen/fase-05.md`
- **Klaar als:** `npm run check` groen. De e2e-test maakt een editie met zes deelnemers, ziet zes links met pincodes en kopieerknoppen, logt in met één ervan en vernieuwt een pincode en een link waarna de oude faalt. Geen WhatsApp-tekst bevat link en pincode samen.
- **Leest:** spec §5.1 (Edities, Deelnemers, Beheerlinks), §7.1.3, §7.1.5, §7.1.7, §7.1.10, §7.1.11, §7.2.4, §7.12, §8 EDI-1, EDI-4, EDI-5, EDI-6, TOE-8, TOE-12
- **Hangt af van:** fase 4

## Fase 6: Kalender met vakanties en feestdagen

- **Eisen:** KAL-1, KAL-2, KAL-3, KAL-4, KAL-5, KAL-6, KAL-7
- **Aannames:** AAN-13, AAN-15, AAN-17
- **Raakt:** zie `fasen/fase-06.md`
- **Klaar als:** `npm run check` groen. De feestdagentest voor 2026 tot en met 2030 slaagt. In de browser toont de kalender april 2027 met voorkeursmarkering, de meivakantie per regio en Koningsdag; tikken en toetsenbord doorlopen de vier waarden.
- **Leest:** spec §7.3, §8 KAL, §5.2 (beschikbaarheid)
- **Hangt af van:** fase 5

## Fase 7: Invulformulier

- **Eisen:** FRM-1, FRM-2, FRM-3, FRM-4, FRM-8, FRM-9, FRM-10
- **Aannames:** AAN-33
- **Raakt:** zie `fasen/fase-07.md`
- **Klaar als:** `npm run check` groen. De e2e-test vult als deelnemer de vier vaste blokken in, slaat op, ziet "ingevuld", opent een tweede context met een oude versie en krijgt de conflictmelding. Na de deadline is alles alleen-lezen.
- **Leest:** spec §5.2 (Antwoorden.data), §7.4, §8 FRM
- **Hangt af van:** fase 6

## Fase 8: Wensblokken en eigen vragen

- **Eisen:** FRM-5, FRM-6, FRM-7, EDI-2, EDI-3
- **Aannames:** AAN-21
- **Raakt:** zie `fasen/fase-08.md`
- **Klaar als:** `npm run check` groen. De organisator voegt een activiteit en een eigen meerkeuzevraag toe, zet samenwerken aan; de deelnemer ziet en beantwoordt ze en alles komt terug na herladen.
- **Leest:** spec §5.2 (Edities.lijsten), §7.4.1, §7.4.2, §7.4.6, §7.4.7, §8 FRM-5 t/m 7, EDI-2, EDI-3
- **Hangt af van:** fase 7

## Fase 9: Voortgang, overzicht en stappen

- **Eisen:** OVZ-1, OVZ-2, OVZ-3, OVZ-4, OVZ-5, OVZ-6, OVZ-7, EDI-7, EDI-8, EDI-10
- **Aannames:** AAN-04, AAN-05, AAN-06, AAN-07
- **Raakt:** zie `fasen/fase-09.md`
- **Klaar als:** `npm run check` groen. De privacytest bewijst dat het antwoord van `overzicht` voor een deelnemer geen deelnemer-ID's of vrije tekst bevat. In de browser: de organisator zet de stap naar Overzicht, de stappenbalk schuift door, de WhatsApp-tekst verschijnt en de deelnemer ziet de heatmap met de demo-voorkeursdatum bovenaan.
- **Leest:** spec §7.2, §7.5, §7.12, §8 OVZ, EDI-7, EDI-8, EDI-10
- **Hangt af van:** fase 8

## Fase 10: Posten en verdeling

- **Eisen:** GELD-1, GELD-2, GELD-3, GELD-4, GELD-5, GELD-6, GELD-7
- **Aannames:** AAN-09, AAN-10, AAN-16
- **Raakt:** zie `fasen/fase-10.md`
- **Klaar als:** `npm run check` groen. De voorbeelden uit §7.13.2 en §7.13.3 zijn tests; een eigenschapstest met 1000 willekeurige posten houdt de som van de saldi op nul. In de browser voert een deelnemer een uitgave met aandelen in en kan een post van een ander niet wijzigen.
- **Leest:** spec §5.1 (Posten), §5.2 (verdeling), §7.9, §7.13.1 t/m §7.13.6, §7.13.10, §8 GELD-1 t/m 7
- **Hangt af van:** fase 9

## Fase 11: Afrekenen en afhaken

- **Eisen:** GELD-8, GELD-9, GELD-10, GELD-11, EDI-9
- **Aannames:** AAN-22, AAN-35
- **Raakt:** zie `fasen/fase-11.md`
- **Klaar als:** `npm run check` groen. Een eigenschapstest bewijst hooguit n − 1 betalingen en saldi nul na alle betalingen. In de browser markeert de demo één betaling, de afrekening herberekent; de afgehaakte deelnemer houdt zijn aandeel in de accommodatie en zit niet in een nieuwe post.
- **Leest:** spec §7.13.6 t/m §7.13.9, §7.12.2, §7.12.3, §8 GELD-8 t/m 11, EDI-9
- **Hangt af van:** fase 10

## Fase 12: Datum vastleggen en accommodaties

- **Eisen:** ACC-1, ACC-2, ACC-3, ACC-4, ACC-5
- **Aannames:** AAN-08
- **Raakt:** zie `fasen/fase-12.md`
- **Klaar als:** `npm run check` groen. In de browser legt de organisator de voorkeursdatum vast, zet drie accommodaties op stemmen, twee deelnemers stemmen, daarna zet hij er één op geboekt met prijs per persoon.
- **Leest:** spec §5.1 (Accommodaties, Stemmen), §7.6, §8 ACC
- **Hangt af van:** fase 11

## Fase 13: Wie neemt wat mee

- **Eisen:** MEE-1, MEE-2, MEE-3, MEE-4
- **Aannames:** AAN-11, AAN-26
- **Raakt:** zie `fasen/fase-13.md`
- **Klaar als:** `npm run check` groen. Twee gelijktijdige claims op pindakaas geven "Pindakaas: Anne, Bas". De startlijst uit §7.7.2 staat er bij een nieuwe editie. Een afgehaakte deelnemer verliest zijn claims.
- **Leest:** spec §5.1 (Items, Claims), §7.7, §7.8.3, §7.16.3, §8 MEE-1 t/m 4
- **Hangt af van:** fase 12

## Fase 14: Boodschappenlijst

- **Eisen:** MEE-5, MEE-6, MEE-7, MEE-8, MEE-9
- **Aannames:** AAN-19, AAN-27
- **Raakt:** zie `fasen/fase-14.md`
- **Klaar als:** `npm run check` groen. De gekopieerde tekst van de demolijst is gelijk aan een vaste verwachte tekst. Na definitief geeft toevoegen `gesloten`; afvinken werkt en is na verversen in een tweede context zichtbaar.
- **Leest:** spec §7.8, §8 MEE-5 t/m 9
- **Hangt af van:** fase 13

## Fase 15: Kookbeurten en programma

- **Eisen:** KOK-1, KOK-2, KOK-3, KOK-4, PRG-1, PRG-2, PRG-3
- **Aannames:** AAN-18, AAN-25, AAN-34
- **Raakt:** zie `fasen/fase-15.md`
- **Klaar als:** `npm run check` groen. Na vastleggen staan zes maaltijden klaar; een kok voegt een ingrediënt toe dat met maaltijdnaam op de boodschappenlijst staat en ziet de eetwensen met namen; een andere deelnemer ziet die namen niet. Het programma toont zaterdag op tijd.
- **Leest:** spec §5.1 (Maaltijden, Koks, Programma), §7.10, §7.11.1, §8 KOK, PRG
- **Hangt af van:** fase 14

## Fase 16: Kamers en carpool

- **Eisen:** KMR-1, CAR-1, CAR-2
- **Aannames:** AAN-23, AAN-24
- **Raakt:** zie `fasen/fase-16.md`
- **Klaar als:** `npm run check` groen. Een volle kamer of rit weigert een extra persoon; wie geen rit heeft staat in een aparte lijst; een afgehaakte deelnemer verdwijnt uit beide.
- **Leest:** spec §5.1 (Kamers, Kamerindeling, Ritten, Meerijders), §7.11.2 t/m §7.11.4, §8 KMR, CAR
- **Hangt af van:** fase 15

## Fase 17: Startschermen per stap en archief

- **Eisen:** STA-3, STA-4, STA-5, STA-6, ARC-1, ARC-2
- **Aannames:** AAN-12, AAN-29, AAN-30
- **Raakt:** zie `fasen/fase-17.md`
- **Klaar als:** `npm run check` groen. Een geparametriseerde e2e-test zet de demo-editie in elke stap en controleert voor beide rollen wat bovenaan staat. Na Afgerond is alles alleen-lezen en maakt "Nieuwe editie" een editie met dezelfde leden.
- **Leest:** spec §7.14, §7.15, §8 STA-3 t/m 6, ARC
- **Hangt af van:** fase 16

## Fase 18: Rondleiding en installatie

- **Eisen:** RON-1, RON-2, RON-3, RON-4
- **Raakt:** zie `fasen/fase-18.md`
- **Klaar als:** `npm run check` groen. De platformtest herkent de user agents van iOS Safari, iOS Chrome, Android Chrome, Windows Edge en macOS Firefox. De rondleiding verschijnt één keer per apparaat en is terug te vinden onder Uitleg.
- **Leest:** spec §7.1.8, §8 RON-1 t/m 4, `docs/05-designbrief.md` §5 (rondleiding)
- **Hangt af van:** fase 17

## Fase 19: Eindtest

- **Eisen:** NFR-11
- **Raakt:** zie `fasen/fase-19.md`
- **Klaar als:** `npm run check` groen. Het scenario doorloopt een editie van uitnodiging tot laatste betaling met zes browsercontexten. Alle bediening werkt met het toetsenbord; elke actie uit §6 is zonder sessie en met de verkeerde rol geweigerd. Elke AAN-xx heeft een test met het ID in de naam (een check telt ze).
- **Leest:** spec §6, §7.14, §10, §11, §14, `docs/overdracht/` (alle bestanden)
- **Hangt af van:** fase 18

## Fase 20: Uitrol (met David)

- **Eisen:** NFR-17
- **Raakt:** zie `fasen/fase-20.md`
- **Klaar als:** David heeft ingelogd met `clasp login` en bij GitHub. De sjabloon-Sheet heeft een kopieerlink, de Pages-site draait, een echte groep met twee testpersonen doorloopt inloggen, invullen en een uitgave op een iPhone en een Android-telefoon. Tweestapsverificatie en een beschermde `main` zijn gecontroleerd.
- **Leest:** spec §2, §3, §10 (NFR-17), §14
- **Hangt af van:** fase 19

## Fase 22: Groep opzetten met opzetlink

Toegevoegd na de uitrol, bij bouwspec versie 0.4. Fase 21 (taginvoer) staat los van deze lijst.

- **Eisen:** GRP-1, GRP-6, GRP-7, GRP-8, RON-5
- **Aannames:** AAN-28, AAN-45, AAN-77, AAN-78, AAN-79
- **Raakt:** zie `fasen/fase-22.md`
- **Klaar als:** `npm run check` groen. Een opzetlink opent de wizard bij stap 1 met URL en setupcode ingevuld en laat alleen `#/opzetten` in de adresbalk staan. Het Sheet-menu "Groep opzetten" toont de opzetlink in een dialoog; een opgezette groep krijgt geen code.
- **Leest:** spec §3 (Implementaties), §7.1.9, §7.1.10, §7.18, §8 GRP, RON-5, NFR-2, NFR-5
- **Hangt af van:** fase 21 gecommit

## Fase 23 t/m 28: Feedbackronde

Toegevoegd op 10 november 2026 na Davids doorklikronde. Opdracht in `feedbackronde-opdracht.md`,
plan en Davids keuzes (K1 t/m K4) in `plan-feedbackronde.md`, per fase een bestand in `fasen/`.
Volgorde vast: 23, 24, 25, 26, 27, 28; elke fase hangt af van de vorige. Fase 27 stopt na de schets
tot David akkoord geeft.

## Fase 29 t/m 33: Feedbackronde 2

Toegevoegd op 11 november 2026 na de functionele test (`bevindingen-test-2026-11-11.md`, BV-01 t/m BV-36).
Beslissingen in `01-interview.md` onder "Feedbackronde 2", spec versie 0.11, aannames versie 0.28. Per fase een
bestand in `fasen/`. Fase 32 hangt af van fase 31; de andere staan los van elkaar. BV-03 is opgelost bij de uitrol
en heeft geen fase. Na fase 33 staat `API_VERSIE` op 2: voorkant en script gaan kort na elkaar live (§7.17).

## Fase 34: Swipen door de maanden

Toegevoegd op 13 november 2026 na het bijgewerkte ontwerp (designbrief 0.4 §5.1, spec 0.12, aannames 0.29).

- **Eisen:** KAL-8, KAL-9, KAL-10, KAL-11, KAL-12
- **Aannames:** AAN-91, AAN-92
- **Raakt:** zie `fasen/fase-34.md`
- **Klaar als:** `npm run check` groen. Op 390 pixels toont Invullen één maandblad tegelijk, een veeg of pijl gaat naar de volgende maand, de jaarstrook springt naar een maand en de kalender opent op de eerste maand met een leeg weekend. Op 1280 pixels is de kalender ongewijzigd.
- **Leest:** spec §7.3, §8 KAL, §10 NFR-9; designbrief §5.1; artboard `docs/design/Formulier.dc.html`
- **Hangt af van:** fase 33 gecommit

## Fase 35: Boodschappen als wensenlijst

Toegevoegd op 13 november 2026 op verzoek van David (spec 0.13, aannames 0.30). Staat los van fase 34.

- **Eisen:** OND-1, MEE-11, MEE-12, MEE-13
- **Aannames:** AAN-80, AAN-93
- **Raakt:** zie `fasen/fase-35.md`
- **Klaar als:** `npm run check` groen. Meenemen heeft de tabs Wie neemt wat mee en Boodschappen. Zonder vastgelegd weekend staat er "Komt zodra het weekend vastligt", met een weekend zet een deelnemer een boodschap met zijn naam op de lijst, en na definitief kan niemand meer toevoegen.
- **Leest:** spec §7.6.8, §7.7, §7.8, §7.14, §8 OND, MEE, NAV-10, NAV-11; artboards Boodschappen, BoodschappenDicht, D-Boodschappen, T-BoodschappenWacht, Meenemen
- **Hangt af van:** fase 33 gecommit

## Opdracht voor de hele run

Plak dit in een nieuwe Claude Code-sessie (Sonnet) die in de repo is geopend. De hoofdsessie
bouwt zelf niets; ze start per fase een verse subagent, zodat de context per fase klein blijft
en de geschiedenis van eerdere fasen niet meegaat.

> Voer de bouw van Weekendje weg uit, fase 0 tot en met 19 uit `docs/03-fasen.md`, op
> volgorde. Lees zelf alleen `docs/03-fasen.md` en de overdrachtsbestanden. Start per fase
> één subagent van het type `fasebouwer` (vanaf fase 1 aanwezig; voor fase 0 een
> general-purpose subagent) met het model uit de tabel en de opdracht: "Bouw
> `docs/fasen/fase-NN.md`. Volg CLAUDE.md. Lees alleen wat het fasebestand noemt." Na elke
> subagent: draai `npm run check`, controleer dat de commit en
> `docs/overdracht/fase-NN.md` er zijn, en ga door. Is de check rood, start dan één
> nieuwe subagent met de foutmelding en de overdracht als opdracht. Blijft hij rood, stop
> dan en vat in vijf regels samen wat er misgaat. Stel mij geen vragen tijdens de run;
> twijfel over scope wordt een aanname in `docs/04-aannames.md`. Sluit af met een lijst
> van nieuwe aannames en de laatste regel van `npm run check`.

## Opdracht per fase

Voor een losse fase, of om na een stop verder te gaan. Plak dit in een nieuwe Claude
Code-sessie in de repo:

> Bouw fase N uit `docs/fasen/fase-NN.md`. Lees alleen de genoemde paragrafen van
> `docs/02-bouwspec.md` en de vorige overdracht. Sluit af met `npm run check` groen, een
> commit met de eis-ID's, `docs/overdracht/fase-NN.md` en een regel in het sessielog van
> MEMORY.md. Twijfel je over scope, voeg dan een aanname toe aan `docs/04-aannames.md`,
> bouw erop en meld het.
