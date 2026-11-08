# Fase 17: Startschermen per stap en archief

Hoort bij `docs/03-fasen.md`. Model: Sonnet.

**Doel.** Het startscherm van deelnemer en organisator per stap, het menu, de aftelteller en het archief met nieuwe editie.

- **Eisen:** STA-3, STA-4, STA-5, STA-6, ARC-1, ARC-2
- **Aannames:** AAN-12, AAN-29, AAN-30
- **Leest:** `docs/02-bouwspec.md` §7.14, §7.15, §8 STA-3 t/m 6, ARC. Daarnaast alleen `CLAUDE.md`, de vorige overdracht in `docs/overdracht/` en de bestanden die je wijzigt.
- **Raakt:** `src/web/screens/start.js`, `src/web/screens/start-organisator.js`, `src/web/components/menu.js`, `src/web/screens/archief.js`, `src/server/acties/archief.js`, `test/e2e/start.spec.mjs`
- **Klaar als:** `npm run check` groen. Een geparametriseerde e2e-test zet de demo-editie in elke stap en controleert voor beide rollen wat bovenaan staat. Na Afgerond is alles alleen-lezen en maakt "Nieuwe editie" een editie met dezelfde leden.
- **Hangt af van:** fase 16

## Afsluiten

1. `npm run check` groen.
2. Commit `fase 17: startschermen per stap en archief (STA-3, STA-4, STA-5, STA-6, ARC-1, ARC-2)`.
3. Schrijf `docs/overdracht/fase-17.md` met hooguit vijftien regels: wat er af is, keuzes die niet in de spec staan, nieuwe aannames, wat de volgende fase moet weten, de laatste regel van `npm run check`.
4. Eén regel in het sessielog van `MEMORY.md`.
