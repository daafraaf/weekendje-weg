# Fase 24: Onderdelen uit en invullen vrijer

Hoort bij `docs/03-fasen.md` en `docs/plan-feedbackronde.md`. Opdracht: punt 2 en 3. Model: Sonnet.

**Doel.** Boodschappen, kookbeurten, programma, kamerindeling en carpool staan uit met één vlag per onderdeel. Invullen vraagt alleen beschikbaarheid; de deadline hoort alleen bij Invullen en is informatief.

- **Eisen:** nieuw OND-1 (vlaggen op één plek), OND-2 (uit = weg uit menu, start, eersteActie, uitleg), OND-3 (voorkeuren eten en doen blijven en komen terug bij de organisator), FRM-11 (gedeeltelijk opslaan), DDL-1 (deadline alleen bij Invullen, informatief); aangepast FRM-8, FRM-9, OVZ-1, STA-1, EDI-7, EDI-8, EDI-10
- **Aannames:** nieuw AAN-80 (vlaggen), AAN-33 aangepast (ingevuld = minstens één weekend met een waarde), §7.2.3 en §7.2.4 herschreven
- **Besluit K2:** voorkeuren eten en doen blijven vinkjes uit de editielijsten plus tags, alles optioneel; geen vrije tekstvelden. Geen datawijziging.
- **Leest:** spec §5.2, §7.2, §7.4, §7.14, §8 FRM, OVZ, EDI; AAN-04, AAN-21, AAN-33; overdracht fase 23.
- **Raakt:** `src/shared/onderdelen.js` (nieuw), `src/web/app.js` (registratie), `src/shared/start.js`, `src/web/screens/meenemen.js` (sectie Boodschappen), `src/shared/antwoorden.js`, `src/server/rechten.js` (deadline), `src/server/acties/antwoorden.js`, `stappen.js`, `editie.js`, `src/web/screens/formulier.js`, `voortgang.js`, `detail.js`, `overzicht.js`, `stappen-beheer.js`, `editie-nieuw.js`, `src/web/components/stappenbalk.js`.
- **Klaar als:** `npm run check` groen. De vijf vlaggen staan uit en een test zet elk aan en ziet het onderdeel terug. Een deelnemer met alleen beschikbaarheid slaat op en telt als ingevuld. Opslaan na de deadline lukt. De deadline staat alleen bij Invullen en in Voortgang; balk en stappenbeheer tonen geen datums meer. Voorkeuren eten en doen staan bij Invullen en bij de organisator in Weekendje prikker.

## Bouwen

1. **Vlaggen.** `ONDERDELEN` in `src/shared/onderdelen.js`, alle vijf `false`, met AAN-80 als commentaar. Uit: route niet geregistreerd, niet in menu, start en eersteActie. Acties en tabs blijven ongemoeid. Gekozen: verdwijnen, geen grijze items (rustiger, minder vragen).
2. **Formulier.** Alleen de kalender verplicht; budgetten, reistijd, verblijf optioneel met "(optioneel)" in de kop. De knop Opslaan blijft tot fase 26 en slaat ook een half formulier op.
3. **Deadline.** Weg uit `rechten.js` als blokkade; AAN-04 (naar Weekendje prikker sluit het invullen) blijft. Formulier toont "Graag ingevuld vóór vrijdag 21 november". `stapData` niet meer lezen of schrijven; de kolom blijft. Stappenbeheer stelt alleen de deadline in.
4. **Spec en aannames** bijwerken, met tests op de ID's.

## Afsluiten

`npm run check` groen; commit `fase 24: onderdelen uit en invullen vrijer (OND-1, OND-2, OND-3, FRM-11, DDL-1)`; overdracht; sessielog.
