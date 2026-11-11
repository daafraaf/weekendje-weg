# Overdracht fase 31 (navigatie en layout)

Af: NAV-10, NAV-12, NAV-14, NAV-15, UIT-2, NFR-9; BV-16, BV-17, BV-18, BV-19. Geen nieuwe aannames; AAN-12 ongewijzigd.
- Menu mobiel: zeven even brede items met alleen een icoon, het actieve item toont zijn label (mag over de itemrand vallen, max 76 px). Elke link heeft `aria-label` met de volle naam (`components/menu.js`). Het menu scrolt niet meer horizontaal.
- Accommodatie heeft een bed-icoon (inline paden in `app.js`); Kamers houdt zijn eigen bed met hoofdeinde.
- Meenemen toont altijd het bovenschrift "Meenemen"; posten en afrekening hadden al "Afrekening". `uitleg.js` zegt bij Invullen, Meenemen en Afrekening dat die twee in elke stap open zijn.
- Desktop (vanaf 768 px): grid `220px minmax(0, 900px)` gecentreerd, kopregel over beide kolommen met de editienaam (`.kop-titel`) links en sync plus profiel rechts; het menu begint op de hoogte van de stappenbalk.
- `.kop-titel` volgt NAV-15: op `TITEL_OP_SCHERM` (start, formulier) krijgt ook `.kopregel` `data-titel-dubbel` en verbergt de titel.
- Vanaf 1200 px: stappenbalk `repeat(7, minmax(min-content, auto))` met `white-space: normal`, zodat namen niet afkorten; tussen 768 en 1199 px blijft afkorten met puntjes.
- e2e: `test/e2e/navigatie-layout.spec.mjs` (360, 390, 1280 px; menu binnen beeld, tikdoel 44 px, aria-label, geen null, bovenschrift, kopregel). De `test.fixme` voor het mobiele menu in `foutafhandeling.spec.mjs` is weg.
- Niet getest: een echt toestel en of een lang actief label (Accommodatie) de buur-iconen raakt; dat is beredeneerd, niet gemeten.
