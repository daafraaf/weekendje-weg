# MEMORY.md — Weekendje weg

Laatst bijgewerkt: 2026-11-11 (feedbackronde 2 afgerond)

## Status

Feedbackronde 2 (fase 29 t/m 33) klaar, groen en live (11 november); spec 0.11, aannames 0.28. Eerder: fase 23 (stappenbalk en menu) klaar; open staat de uitrol met David (fase 20) en de proef uit `docs/fasen/fase-22.md`. De repo bevat naast de opzet de docs uit de Werkplaats: spec v0.3, aannames
v0.2 (45), 21 fasen (0 tot en met 20), designbrief v0.3 en het ontwerp in `docs/design/`
(README, tokens.css, iconen en 37 artboards, stand 9 november 2026).

Vóór de run doet David eenmalig `npm ci` en `npx playwright install` (Node 22 of nieuwer),
zodra fase 0 `package.json` heeft neergezet.

## Open punten

- BV-32 (beslissing David): de rangorde volgens AAN-06 zet een weekend met 0 ja en 0 nee boven weekenden met 3 ja en 1 nee. Voorstel: niet-ingevuld als onzeker tellen, of sorteren op ja min nee en dan misschien. AAN-06 blijft tot dan ongewijzigd.
- Feedbackronde 2 gebouwd (fase 29 t/m 33, alle groen; overdracht `docs/overdracht/feedbackronde-2.md`). Uitgerold; open: Davids test op telefoon en laptop. Wisselen van script voor clasp: `Copy-Item .clasp-<sjabloon|test|leid0n>.json .clasp.json -Force` (bestanden buiten git).
- Kleine restpunten uit ronde 2: AAN-89 stelt in november nog het lopende jaar voor; melding "Boodschappen zijn definitief" onder Uit eigen keuken bij Boodschappen uit; afkorten stapnamen 768-1199 px.

- Feedbackronde gebouwd (fase 23 t/m 28, `docs/plan-feedbackronde.md`). Open: Davids test op toestel (telefoon en laptop), lijst in `docs/overdracht/fase-28.md`; daarna uitrol (fase 20) en proef (fase 22).

## Sessielog

Nieuwste bovenaan. Houd hier de laatste drie fasen; oudere regels naar
`docs/sessielog-archief.md`.

- 2026-11-11 uitrol feedbackronde 2 (API_VERSIE 2): voorkant gepusht naar Pages; script met clasp push en deploy op de bestaande implementatie in de sjabloon, "Weekendje weg test" en "Leid0n Test"; door David uitgevoerd.
- 2026-11-11 fase 33: teksten, onderdelen en details: deadline-teksten "Graag ingevuld vóór", berichten en losmaakbevestiging volgen ONDERDELEN, Accommodatie zonder opties, na onthullen alleen de geboekte, Toewijzen aan … (`claimToewijzen`), geen categorie zonder Boodschappen, voorstel Nieuwe editie (AAN-89), niet zelf inactief (AAN-90), Bedrag voorgevuld (EDI-10, EDI-11, GRP-5, ACC-10, MEE-10, GELD-12; BV-09, 10, 11, 15, 27, 28, 29, 30, 31, 34); check groen; zie `docs/overdracht/fase-33.md`.
- 2026-11-11 fase 32: weekend en stappen: Leg vast en Ander weekend kiezen op Weekendje prikker (gedeeld met Accommodaties beheren), losmaken tot en met Meenemen, vanaf Weekend melding met link naar Stappen, bevestiging bij een stap vooruit (AAN-88), terug van Afgerond naar Afrekening, betalingen afvinken na Afgerond, bericht bij Afgerond zonder "afgerekend" als er nog open staat (ACC-1, ACC-7, EDI-7, GELD-9, AAN-88; BV-01, 25, 26); zie `docs/overdracht/fase-32.md`.
- 2026-11-11 fase 31: navigatie en layout: mobiel menu met alleen iconen en het actieve label, aria-label met de volle naam, bed-icoon voor Accommodatie, bovenschrift Meenemen, uitleg zegt dat Meenemen en Afrekening altijd open zijn, desktop met inhoud tot 900 px, kopregel met editienaam en stappenbalk zonder afkortingen (NAV-10, NAV-12, NAV-14, NAV-15, UIT-2; BV-16, 17, 18, 19); zie `docs/overdracht/fase-31.md`.
- 2026-11-11 uitrol feedbackronde (fase 23 t/m 28): voorkant gepusht naar Pages; script bijgewerkt in de sjabloon (@2) en in twee kopieën (@2), waaronder de kopie van de live groep "Weekendje weg test" (implementatie eindigt op MMEbIJ); POST bundel geeft daar geen "onbekende keuze" meer.