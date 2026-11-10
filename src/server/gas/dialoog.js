// HTML van de dialogen van het Sheet-menu (spec §7.18.4, GRP-6, GRP-8). Pure functies, zodat Node ze test.
// De dialoog draait in de zandbak van HtmlService, niet in de app; elke waarde gaat door `esc`
// en het enige externe adres is APP_ADRES (of, zonder APP_ADRES, de eigen webapp-URL).
import { scriptUrl, opzetlinkVan, beheerlinkVan } from '../../shared/links.js';

export const DIALOOG_BREEDTE = 460;
export const DIALOOG_HOOGTE = 330;

export const esc = (w) => String(w ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const STIJL = 'body{font:14px/1.45 Arial,sans-serif;color:#202124;margin:0;padding:4px 2px}'
  + 'p{margin:0 0 12px}label{display:block;font-size:12px;color:#5f6368;margin:0 0 4px}'
  + 'input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #dadce0;border-radius:4px;font:13px monospace;margin:0 0 12px}'
  + '.knop{display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;padding:9px 18px;border-radius:4px;font-weight:bold;margin:0 0 14px}'
  + '.klein{font-size:12px;color:#5f6368}';

const pagina = (inhoud) => `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><base target="_blank"><style>${STIJL}</style></head><body>${inhoud}</body></html>`;
const veld = (id, label, waarde) => `<label for="${esc(id)}">${esc(label)}</label><input id="${esc(id)}" type="text" readonly value="${esc(waarde)}">`;
const knop = (adres, tekst) => `<p><a class="knop" href="${esc(adres)}" target="_blank" rel="noopener noreferrer">${esc(tekst)}</a></p>`;

// GRP-6: met appAdres de opzetlink, zonder de setupcode en de webapp-URL om in de wizard te plakken.
export function opzetDialoog({ appAdres, webappId, code, minuten }) {
  const geldig = `<p class="klein">De code is ${esc(minuten)} minuten geldig en werkt één keer. Kies opnieuw Groep opzetten voor een nieuwe; de vorige vervalt dan.</p>`;
  if (appAdres) {
    const link = opzetlinkVan(appAdres, webappId, code);
    return pagina('<p>Je Sheet is klaar. Open de app om je groep een naam te geven en de leden toe te voegen.</p>'
      + knop(link, 'Open de app')
      + veld('link', 'Of kopieer de opzetlink', link)
      + geldig);
  }
  return pagina('<p>Open de app, kies Groep opzetten en plak deze twee gegevens in de wizard.</p>'
    + veld('code', 'Setupcode', code)
    + (webappId ? veld('url', 'Webapp-URL', scriptUrl(webappId)) : '<p>De webapp-URL vind je in Apps Script bij Implementeren, Implementaties beheren. Hij eindigt op /exec.</p>')
    + geldig);
}

// GRP-8: de volledige beheerlink met kopieerveld.
export function beheerDialoog({ appAdres, webappId, token, voornaam }) {
  const link = beheerlinkVan(appAdres, webappId, token);
  return pagina(`<p>Geef deze beheerlink door aan ${esc(voornaam)}. Hij is alleen nu zichtbaar. ${esc(voornaam)} kiest bij eerste gebruik een eigen wachtwoord.</p>`
    + veld('link', 'Beheerlink', link)
    + '<p class="klein">Kwijt? Kies opnieuw Beheerlink maken.</p>');
}
