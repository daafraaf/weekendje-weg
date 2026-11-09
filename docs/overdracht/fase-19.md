# Overdracht fase 19

Af: eindtest (NFR-11). `test/e2e/scenario.spec.mjs`: zes contexten doorlopen een editie van uitnodiging tot laatste betaling en Afgerond (alleen chromium-desktop). `toegankelijkheid.spec.mjs`: per scherm namen, labels, Tab-bereik, focusstijl en contrast in licht en donker, plus vijf toetsenbordflows. `beveiliging.spec.mjs`: elke actie en elk scherm uit het contract zonder sessie, met de deelnemersrol, op andermans rijen, als organisator van een andere editie en na Afgerond; XSS in alle tekstvelden op alle schermen; CSP; Log zonder geheimen; AAN-42.
Demo §11: `test/fixtures/demo.json` (Anne, Bas, Daan, Eva, Joris, Sanne; 2026 afgerond, 2027 per stap) en `maakVolledigeDemo({ stap })` in `demo.mjs`; `npm run mock` gebruikt hem. De oude set van vier staat als `test/fixtures/basis.json` onder `maakDemo`, zodat de fasetests ongewijzigd blijven. Unittest: `test/unit/demo.test.mjs`.
Aannamecheck: `scripts/check-aannames.mjs` (stap `aannames` in `npm run check`) eist per niet-vervallen AAN-xx een codeplek en een testnaam met het ID. AAN-31 kreeg zijn codeplek; AAN-42, 45, 68 een test.
Kleine fixes: `rolReden` in `rechten.js`, door `api.js` vóór het valideren aangeroepen (wie een actie nooit mag krijgt `geen_toegang`, geen veldmeldingen). Accent licht `#175891` en donker `#7AB8EE` (was `#1F6FB8`/`#5AA3E6`, contrast 3,8 tot 4,4 op de lichte en glazen vlakken); `docs/design/tokens.css` is niet aangepast. Alle routedoorsturers in e2e vangen ECONNRESET af.
Nieuwe aannames: geen.
Niet getest: echte schermlezer en echte telefoon; contrast op verlopen en `backdrop-filter` is benaderd met beide uiteinden van het achtergrondverloop; de tabronde draait alleen op chromium-desktop; het scenario niet op WebKit.
Bekend: de stappenbalk toont nog de voorbeeldeditie (AAN-40), ook in de eindtest; fase 20 of later.
Volgende fase (20): echte Sheet, clasp en Pages met David; meten van ITERATIES en koude start (NFR-8); README-link in de verouderd-melding.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, aannames, unittests, build, playwright`
