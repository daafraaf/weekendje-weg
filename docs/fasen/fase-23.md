# Fase 23: Stappenbalk één bron en menu in stapvolgorde

Hoort bij `docs/03-fasen.md` en `docs/plan-feedbackronde.md`. Opdracht: `docs/feedbackronde-opdracht.md` punt 4 en 1. Model: Opus.

**Doel.** De stap van een editie heeft één bron (de editie in de Sheet). Stappenbalk, menu en start lezen hem voor elke rol. Het menu loopt in de volgorde van de stappen met dezelfde namen als de balk.

- **Eisen:** STA-1, STA-6, NAV-1, NAV-9 aangepast; nieuw STA-8 (één bron), NAV-10 (zeven items, Beheren apart), NAV-11 (Afrekening met Wie betaalt wat en Eindafrekening)
- **Aannames:** AAN-40 vervalt, AAN-12 en AAN-71 aangepast
- **Leest:** spec §7.2, §7.14, §8 STA en NAV, AAN-12, AAN-40, AAN-71; `CLAUDE.md`, `docs/overdracht/fase-22.md` en de bestanden die je wijzigt.
- **Raakt:** `src/web/app.js` (`toonBalk`, `haalMenuStap`, `VOORBEELD`), `src/web/components/stappenbalk.js` (`STAPNAMEN`), `src/web/components/menu.js`, `src/shared/start.js` (`MENU_VANAF`, `eersteActie`), `src/web/router.js` (volgorde), `src/web/screens/overzicht.js`, `posten.js`, `afrekening.js`, `start*.js`, `stappen-beheer.js`, `src/web/hints.js`, `src/shared/whatsapp.js`, CSS van het menu, e2e-tests die "Overzicht" zoeken.
- **Klaar als:** `npm run check` groen. Het menu toont Start, Invullen, Voortgang, Weekendje prikker, Accommodatie, Meenemen, Afrekening in die volgorde; Beheren staat los na een scheidingslijn. `grep -ri '"Overzicht'` in `src/web` en `src/shared` vindt geen label meer. Een e2e-test met twee contexten: de organisator zet de stap in beheer, de deelnemer ververst, en balk, menu en start tonen op elk scherm dezelfde stap.

## Bouwen

1. **Eén stand.** De schil houdt één `editieStand` (stap, titel, vastgelegd weekend) uit `scherm start`; balk en menu tekenen daaruit. Ophalen bij openen, elke navigatie, `visibilitychange` en na `stapZetten`. Geen stap uit `#/start?stap=` meer; de voorbeeldeditie (AAN-40) gaat weg. Een beheersessie krijgt de balk van de nieuwste eigen editie (AAN-71).
2. **Namen.** Waarden in de Sheet blijven `invullen … afgerond`. Labels: Invullen, Weekendje prikker, Accommodatie, Meenemen, Weekend, Afrekening, Afgerond. Eén tabel met labels in `src/shared/stappen.js`, gebruikt door balk, menu, stappenbeheer en WhatsApp-teksten.
3. **Menu.** Altijd de zeven items (vervangt de "vanaf"-regels van AAN-12; een scherm dat nog niet aan de beurt is toont zelf een rustige "Komt in stap X"). Uitgezette onderdelen regelt fase 24. Menu-item `overzicht` heet Weekendje prikker; route `#/overzicht` blijft werken.
4. **Afrekening.** Posten (Wie betaalt wat) en de eindafrekening worden twee secties of tabs onder één menu-item Afrekening; de oude routes blijven werken.
5. **Spec en aannames.** §7.2, §7.14, §8 STA/NAV bijwerken; AAN-40 als vervallen, AAN-12 en AAN-71 herschrijven met test.

## Afsluiten

`npm run check` groen; commit `fase 23: stappenbalk één bron en menu in stapvolgorde (STA-8, NAV-10, NAV-11)`; `docs/overdracht/fase-23.md` (≤ 15 regels); regel in het sessielog.
