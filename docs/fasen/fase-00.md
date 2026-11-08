# Fase 0: Opzet

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** Repo, build, checks en rechten staan; een lege app wordt gebouwd en getest.

- **Eisen:** NFR-3, NFR-4, NFR-13, NFR-18
- **Leest:** `docs/02-bouwspec.md` §3, §4, §10 (NFR-3, NFR-4, NFR-13, NFR-18). Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `package.json`, `scripts/build.mjs`, `scripts/check.mjs`, `scripts/check-bronregels.mjs`, `src/web/index.html`, `src/web/app.js`, `test/unit/bronregels.test.mjs`, `test/e2e/rook.spec.mjs`, `playwright.config.mjs`, `.claude/settings.json`, `.claude/agents/fasebouwer.md`, `.gitignore`, `README.md` (geraamte), `docs/overdracht/`
- **Klaar als:** `npm run check` eindigt met één groene regel. Een proefbestand met `innerHTML = x`, `eval(` of een externe `<script src>` in `src/web` maakt hem rood. `dist/web/index.html` bevat de CSP uit NFR-4. De rooktest opent de lege pagina in Chromium en WebKit.

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 0: opzet (NFR-3, NFR-4, NFR-13, NFR-18)`.
3. Schrijf `docs/overdracht/fase-00.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
