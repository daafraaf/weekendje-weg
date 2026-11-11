# MEMORY.md — Weekendje weg

Laatst bijgewerkt: 2026-11-11 (fase 32: weekend en stappen)

## Status

Fase 23 (stappenbalk en menu) klaar; open staat de uitrol met David (fase 20) en de proef uit `docs/fasen/fase-22.md`. De repo bevat naast de opzet de docs uit de Werkplaats: spec v0.3, aannames
v0.2 (45), 21 fasen (0 tot en met 20), designbrief v0.3 en het ontwerp in `docs/design/`
(README, tokens.css, iconen en 37 artboards, stand 9 november 2026).

Vóór de run doet David eenmalig `npm ci` en `npx playwright install` (Node 22 of nieuwer),
zodra fase 0 `package.json` heeft neergezet.

## Open punten

- BV-32 (beslissing David): de rangorde volgens AAN-06 zet een weekend met 0 ja en 0 nee boven weekenden met 3 ja en 1 nee. Voorstel: niet-ingevuld als onzeker tellen, of sorteren op ja min nee en dan misschien. AAN-06 blijft tot dan ongewijzigd.
- Feedbackronde 2 (fase 29 t/m 33, `docs/fasen/`): in uitvoering.

- Feedbackronde gebouwd (fase 23 t/m 28, `docs/plan-feedbackronde.md`). Open: Davids test op toestel (telefoon en laptop), lijst in `docs/overdracht/fase-28.md`; daarna uitrol (fase 20) en proef (fase 22).

## Sessielog

Nieuwste bovenaan. Houd hier de laatste drie fasen; oudere regels naar
`docs/sessielog-archief.md`.

- 2026-11-11 fase 32: weekend en stappen: Leg vast en Ander weekend kiezen op Weekendje prikker (gedeeld met Accommodaties beheren), losmaken tot en met Meenemen, vanaf Weekend melding met link naar Stappen, bevestiging bij een stap vooruit (AAN-88), terug van Afgerond naar Afrekening, betalingen afvinken na Afgerond, bericht bij Afgerond zonder "afgerekend" als er nog open staat (ACC-1, ACC-7, EDI-7, GELD-9, AAN-88; BV-01, 25, 26); zie `docs/overdracht/fase-32.md`.
- 2026-11-11 fase 31: navigatie en layout: mobiel menu met alleen iconen en het actieve label, aria-label met de volle naam, bed-icoon voor Accommodatie, bovenschrift Meenemen, uitleg zegt dat Meenemen en Afrekening altijd open zijn, desktop met inhoud tot 900 px, kopregel met editienaam en stappenbalk zonder afkortingen (NAV-10, NAV-12, NAV-14, NAV-15, UIT-2; BV-16, 17, 18, 19); zie `docs/overdracht/fase-31.md`.
- 2026-11-11 fase 30: binnenkomen en Start: pinscherm zonder plakveld bij een link en met tekstvakjes, elke login naar #/start, Iedereen uitnodigen zolang links ontbreken, Start zonder null, Uitloggen, dubbele kop en aftelteller na Afgerond, Hoe werkt het? als tekstlink, Afgelopen weekenden met klapicoon, titel één keer, profielmenu met naam (TOE-13, STA-4, STA-9, NAV-2, NAV-15; BV-02, 06, 07, 08, 20, 21, 22, 23, 33, 36); zie `docs/overdracht/fase-30.md`.
- 2026-11-11 uitrol feedbackronde (fase 23 t/m 28): voorkant gepusht naar Pages; script bijgewerkt in de sjabloon (@2) en in twee kopieën (@2), waaronder de kopie van de live groep "Weekendje weg test" (implementatie eindigt op MMEbIJ); POST bundel geeft daar geen "onbekende keuze" meer.