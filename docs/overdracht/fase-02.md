# Overdracht fase 2

Af: schil in `src/web/`: `router.js` (hash-router, `registreer(naam, {titel, icoon, render})`), `api.js` (`maakApi`,
POST text/plain, offline blokkeert schrijven), `dom.js` (`h`, `icoon`), `components/stappenbalk.js` (STA-1, STA-2),
`css/tokens.css` (kopie van het ontwerp) en `css/app.css` (glas, stappenbalk, menu, offline-toast), manifest, `sw.js`,
iconen 192, 512 en maskable (PNG, gemaakt met `scripts/maak-iconen.mjs` uit `docs/design/`). Build kopieert alles naar `dist/web`.

Keuzes buiten de spec:
- Service worker: netwerk eerst, cache als terugval, alleen same-origin GET; gegevens van het script worden nooit gecachet.
- Menu is één `nav`: onderaan op mobiel, links vanaf 768 pixels; items komen uit de routes die een scherm registreert.
- Offline volgt `navigator.onLine` plus de events; schrijfknoppen krijgen `data-schrijft` en worden dan gedimd en geblokkeerd.
- Iconen zijn PNG omdat de spec 192 en 512 pixels vraagt; opnieuw maken kan met `node scripts/maak-iconen.mjs`.

Nieuwe aanname: AAN-40 (voorbeeldeditie in de schil, stap via `#/start?stap=...`).
Volgende fase: `maakApi` heeft nog geen `basisUrl` uit de groeplink en de sessie ligt nog niet in opslag; fase 3 koppelt
beide en vervangt `VOORBEELD` in `app.js`. NFR-8 (schil binnen 1 seconde uit de cache) is getest met de worker;
de leesactie per scherm volgt met de schermen. `fetch` naar localhost voor de nepbackend (NFR-2) is nog open.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
