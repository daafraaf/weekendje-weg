// WhatsApp-teksten (spec §7.12). Pure functies; delen en kopiëren staan in src/web/delen.js.
// Een tekst bevat nooit een pincode samen met een link (§7.12.3): de uitnodiging heeft de link,
// de pincodetekst alleen de pincode en de naam van de editie.

export function uitnodigingTekst({ voornaam, editieTitel, link }) {
  return `Hoi ${voornaam}, je bent uitgenodigd voor ${editieTitel}. Vul hier je beschikbaarheid en wensen in: ${link}\nDe pincode krijg je in een apart bericht.`;
}

export function pincodeTekst({ voornaam, editieTitel, pin }) {
  if (!/^[0-9]{6}$/.test(String(pin))) throw new Error('pincode van zes cijfers verwacht');
  return `Hoi ${voornaam}, je pincode voor ${editieTitel} is ${pin}. Je hebt hem nodig bij de link die je eerder kreeg.`;
}

// Waakhond voor de regel hierboven: waar of onwaar voor één tekst.
export function heeftLinkEnPincode(tekst) {
  const link = /https?:\/\/|#b=/.test(tekst);
  const pin = /(^|[^0-9A-Za-z_-])[0-9]{6}([^0-9A-Za-z_-]|$)/.test(tekst.replace(/(https?:\/\/\S+|#b=\S+)/g, ''));
  return link && pin;
}
