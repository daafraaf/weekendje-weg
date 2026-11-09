# Overdracht fase 0

Af: `package.json` (esbuild, @playwright/test), `scripts/` (build naar `dist/web`, check,
check-bronregels, serve-dist), lege app in `src/web/` met CSP (NFR-4), rooktest op Chromium en
WebKit (desktop en mobiel), `.claude/settings.json`, `.claude/agents/fasebouwer.md`, README-geraamte.

Keuzes buiten de spec:
- `node --test "test/unit/*.test.mjs"`: een mapargument werkt niet in Node 24.
- `dist/gas` en `appsscript.json` volgen met `src/server`; `npm run mock` en `npm run vakanties`
  zijn stubs die rood eindigen.
- Playwright: vier projecten tegen `scripts/serve-dist.mjs`; de nepbackend komt in dezelfde `webServer`.
- De CSP-test staat in `test/unit/bronregels.test.mjs` en bouwt zelf eerst.
- `.claude/settings.json` is na mijn versie op schijf gewijzigd (acceptEdits, clasp-deny); zo gecommit.

Nieuwe aanname: AAN-37 (vaste externe links alleen in `src/web/navigatie.js`).
Laatste regel `npm run check`: `CHECK GROEN: bronregels, unittests, build, playwright`
