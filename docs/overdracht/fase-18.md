# Overdracht fase 18

Af: rondleiding en installatie (RON-1 t/m RON-4). `screens/rondleiding.js` toont vijf schermen (welkom, pincode, beginscherm, stappenbalk, beginnen) op `#/uitleg`; het menu toont hem onder "Uitleg" (RON-4). Vanzelf alleen voor deelnemers met een nieuwe vlag `ww-rondleiding` in localStorage (AAN-73), ook bij een bestaande sessie.
`platform.js`: `herkenPlatform(ua, maxTouchPoints)` (iOS Safari, iOS andere browser, Android Chrome, desktop Chrome/Edge, rest bladwijzer), `installatieVoor` voor de apparaatknoppen, en `beforeinstallprompt` voor de knop Installeren (RON-3, geregistreerd in `app.js`).
"Kopieer mijn link" (iOS-uitleg) werkt alleen direct na inloggen met een link; de app bewaart de link niet (AAN-72). `pincode.js` geeft de link als tweede argument aan `bijIngelogd`.
Nieuwe aannames: AAN-72, AAN-73.
Keuze buiten de spec: installatie is scherm 3 van 5 (spec-volgorde), het bord noemt 4 van 5.
Testhulp: `logIn` in `test/e2e/hulp.mjs` zet de vlag standaard; tests die via de UI inloggen zetten hem zelf. Een nieuwe e2e-test met inloggen via de UI moet dat ook doen.
Niet getest: echte iOS of Android; de echte installatie-prompt (alleen een nagebootste gebeurtenis); klembord op WebKit. RON-5 (wizard-rondleiding) en RON-6 (manifest) vallen buiten deze fase.
Twee keer faalde bij een volledige run een e2e-test (editie, opzetten GRP-5) die los en bij herhaling groen is; waarschijnlijk tijdsdruk bij parallel draaien.
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
