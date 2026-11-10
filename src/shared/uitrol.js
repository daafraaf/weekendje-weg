// Uitrolinstellingen (spec §7.18.1). Geen geheimen: ze staan in de publieke repo.
// AAN-77: leeg betekent het gedrag van spec 0.3 (het menu toont code en webapp-URL, de rondleiding
// heeft geen knop "Kopie maken"); een ingevulde waarde met een andere vorm laat npm run check falen.
export const APP_ADRES = 'https://daafraaf.github.io/weekendje-weg/';
export const SJABLOON_KOPIE = 'https://docs.google.com/spreadsheets/d/12m2576MTXElMXNVX_mdEsH4ZeIqNHsND4GtDsMwcyeA/copy';

// Het adres van de app op Pages: https, zonder query of fragment, eindigt op /.
export const appAdresGeldig = (w) => w === '' || (typeof w === 'string' && /^https:\/\/[a-z0-9.-]+(\/[A-Za-z0-9._~-]+)*\/$/.test(w));

// De kopieerlink van de sjabloon-Sheet.
export const sjabloonKopieGeldig = (w) => w === '' || (typeof w === 'string' && /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]{20,120}\/copy$/.test(w));
