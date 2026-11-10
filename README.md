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
7. Maak in Drive de kopieerlink van de sjabloon-Sheet (de URL met `/copy` in plaats van `/edit`).
8. Vul `APP_ADRES` (het adres van de app op Pages, eindigt op `/`) en `SJABLOON_KOPIE` (de
   kopieerlink) in `src/shared/uitrol.js` in, commit, push, en doe `npm run build` en `clasp push`.
   Het zijn geen geheimen. `npm run check` faalt als een waarde de verkeerde vorm heeft.

De sjabloon moet leeg blijven (geen leden, geen edities) en gedeeld zijn als "Iedereen met de
link: lezer". Anders werkt de kopieerlink niet voor anderen, of krijgt een nieuwe groep de
gegevens van een andere mee.

Google Workspace-accounts kunnen toegang "Iedereen" blokkeren. Gebruik dan een gewoon Google-account.

### Een nieuwe groep opzetten

Voor de eigenaar van een groep. De app laat dezelfde drie stappen zien op `#/opzetten`.

1. Maak een kopie van de sjabloon-Sheet: open de app, kies Groep opzetten en dan Kopie maken.
   De kopie staat in je eigen Google Drive en is van jou.
2. Open in je kopie Extensies, Apps Script. Kies Implementeren, Nieuwe implementatie, type
   Web-app, uitvoeren als "Ik", toegang "Iedereen", en geef toestemming. Meldt Google "Google
   heeft deze app niet geverifieerd", kies dan Geavanceerd en ga verder: het script is je eigen
   kopie en raakt alleen deze Sheet.
3. Ga terug naar de Sheet, laad hem opnieuw, kies Weekendje weg en Groep opzetten en klik op
   de link. De app opent met de Sheet al gekoppeld; je geeft de groep een naam, voegt de leden
   toe en kiest een beheerwachtwoord. De link werkt één keer en 30 minuten.

Vraagt het menu om de webapp-URL, plak dan de URL uit Implementeren, Implementaties beheren
(eindigt op `/exec`, niet op `/dev`). Dat is één keer nodig.

Valkuil: een Google Workspace-account (werk of school) kan toegang "Iedereen" blokkeren. De
app bereikt het script dan niet. Maak de kopie met een gewoon Google-account.

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
4. De sjabloon bijwerken (`clasp push`) verandert niets aan bestaande kopieën: elke kopie heeft
   zijn eigen script. Alleen groepen die daarna een kopie maken, krijgen de nieuwe code.

## Beveiliging van de repo (NFR-17)

- Zet tweestapsverificatie aan op het GitHub-account dat naar deze repo pusht en op het
  Google-account dat het script bezit.
- Bescherm `main`: Settings, Branches, Add branch ruleset (of protection rule) voor `main`, met
  "Restrict deletions" en "Block force pushes".
- Controleer na een push dat de Actions-run groen is en dat er geen `.clasp.json` of `.clasprc.json`
  in de repo staat.
