# Weekendje weg

Installeerbare webapp waarmee een vaste vriendengroep elk jaar één weekend weg plant,
voorbereidt en afrekent. De voorkant draait op GitHub Pages, de gegevens staan in een Google
Sheet van de groep achter een Apps Script. Specificatie: `docs/02-bouwspec.md`.

## Ontwikkelen

Node 22 of nieuwer.

```
npm ci
npx playwright install
npm run check
```

`npm run check` draait bronregels, unittests, build en Playwright tegen de nepbackend en eindigt
met één groene of rode regel.

## Uitrollen

Volgt in fase 20. Een update van het script gaat altijd als nieuwe versie op de bestaande
implementatie, nooit als nieuwe implementatie: die krijgt een nieuw deployment-ID en maakt alle
links van een groep ongeldig. Google Workspace-accounts kunnen toegang "Iedereen" blokkeren.

## Beveiliging van de repo (NFR-17)

Zet tweestapsverificatie aan op het GitHub-account dat naar deze repo pusht en bescherm de
`main`-branch.
