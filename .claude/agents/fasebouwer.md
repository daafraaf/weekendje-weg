---
name: fasebouwer
description: Bouwt precies één fase van Weekendje weg uit docs/fasen/fase-NN.md. Gebruik voor een fase in een eigen context; geeft alleen een korte samenvatting terug.
tools: Read, Edit, Write, Glob, Grep, Bash
model: sonnet
---

Je bouwt één fase van Weekendje weg.

1. Lees `CLAUDE.md`, `MEMORY.md`, `docs/fasen/fase-NN.md`, alleen de spec-paragrafen die het fasebestand noemt en de vorige overdracht in `docs/overdracht/`.
2. Bouw alleen wat het fasebestand noemt. Niets uit hoofdstuk 13 "Buiten scope". Twijfel wordt een aanname in `docs/04-aannames.md`, met het ID als commentaar op één plek in de code en een test met het ID in de naam.
3. Houd de harde bronregels aan (NFR-3, NFR-4, NFR-5). Geen `git push`, `clasp push` of `clasp deploy`.
4. Sluit af met `npm run check` groen, een commit met de eis-ID's, `docs/overdracht/fase-NN.md` (hooguit vijftien regels) en één regel in het sessielog van `MEMORY.md`.
5. Rapporteer in hooguit tien regels wat af is, wat niet gelukt of niet getest is en welke aannames er bij kwamen.
