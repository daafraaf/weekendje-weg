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

Drie onderdelen: de voorkant op GitHub Pages, het script in een sjabloon-Sheet, en per groep
een kopie van die Sheet.

### 1. Voorkant op GitHub Pages

1. Maak een publieke repo en push `main` ernaartoe. De repo bevat geen geheimen.
2. GitHub, Settings, Pages: kies bij Source "GitHub Actions".
3. De workflow `.github/workflows/pages.yml` draait bij elke push naar `main` (bronregels,
   unittests, build) en publiceert `dist/web`.
4. De site staat op `https://<account>.github.io/<repo>/`. Alle paden in de app zijn relatief,
   dus het subpad werkt.

### 2. Sjabloon-Sheet en script (clasp)

Eenmalig:

1. Installeer clasp (`npm i -g @google/clasp`) en log in met `clasp login`.
2. Zet de Apps Script API aan op https://script.google.com/home/usersettings.
3. Maak een lege Google Sheet "Weekendje weg - sjabloon". Open Extensies, Apps Script en kopieer
   het script-ID uit Projectinstellingen.
4. Kopieer `.clasp.json.voorbeeld` naar `.clasp.json` en vul het script-ID in. `.clasp.json`
   staat in `.gitignore` en blijft buiten git.
5. `npm run build`, dan `clasp push`.
6. In Apps Script: Implementeren, Nieuwe implementatie, type Web-app, uitvoeren als "Ik",
   toegang "Iedereen". Noteer het implementatie-ID. Dit is de enige keer dat je een nieuwe
   implementatie maakt.
7. Maak in Drive de kopieerlink van de sjabloon-Sheet (de URL met `/copy` in plaats van `/edit`)
   en geef die aan de groep.

Google Workspace-accounts kunnen toegang "Iedereen" blokkeren. Gebruik dan een gewoon Google-account.

### 3. Script bijwerken

Een update van het script gaat altijd als nieuwe versie op de bestaande implementatie, nooit als
nieuwe implementatie: die krijgt een nieuw deployment-ID en maakt alle links van een groep
ongeldig.

1. `npm run build` en `clasp push`.
2. Apps Script, Implementeren, Implementaties beheren, de bestaande implementatie bewerken,
   Versie: Nieuwe versie, Implementeren. Of met `clasp deploy -i <implementatie-ID>`.
3. Een groep heeft een eigen kopie van de Sheet en dus een eigen script en implementatie
   (zie de opzetwizard). Meldt de app "verouderd" (`api_versie`), dan werkt de eigenaar van die
   groep het script bij met de nieuwste code en zet hij een nieuwe versie op de bestaande
   implementatie. Hoe de nieuwe code bij de groepen komt, is nog niet uitgewerkt.

## Beveiliging van de repo (NFR-17)

- Zet tweestapsverificatie aan op het GitHub-account dat naar deze repo pusht en op het
  Google-account dat het script bezit.
- Bescherm `main`: Settings, Branches, Add branch ruleset (of protection rule) voor `main`, met
  "Restrict deletions" en "Block force pushes".
- Controleer na een push dat de Actions-run groen is en dat er geen `.clasp.json` of `.clasprc.json`
  in de repo staat.
