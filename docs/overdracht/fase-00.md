# Overdracht fase 0

Af: `package.json` (esbuild, @playwright/test), `scripts/build.mjs` (alleen `dist/web`),
`scripts/check.mjs` (bronregels, unittests, build, Playwright), `scripts/check-bronregels.mjs`,
`scripts/serve-dist.mjs`, lege app in `src/web/` met CSP (NFR-4), rooktest op Chromium en WebKit
(desktop en mobiel), `.claude/settings.json` (allow- en deny-lijst), `.claude/agents/fasebouwer.md`,
`.gitignore`, README-geraamte.

Keuzes buiten de spec:
- `node --test "test/unit/*.test.mjs"`: een mapargument werkt niet in Node 24.
- `dist/gas` en `appsscript.json` volgen zodra `src/server` er is; `npm run mock` en
  `npm run vakanties` zijn stubs die rood eindigen.
- Playwright draait vier projecten (Chromium/WebKit, desktop/mobiel) tegen `scripts/serve-dist.mjs`;
  de nepbackend komt later in dezelfde `webServer`-config.
- De CSP-test staat in `test/unit/bronregels.test.mjs` en bouwt zelf eerst.

Nieuwe aanname: AAN-37 (vaste externe links alleen in `src/web/navigatie.js`).
Volgende fase: `package-lock.json` is gecommit; `npm ci` en `npx playwright install` zijn al gedaan.

Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
