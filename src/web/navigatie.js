// De enige plek in src/web met vaste externe links (AAN-37, bronregels NFR-3).
// De tekst gaat URL-gecodeerd mee; er wordt niets naar WhatsApp gestuurd voordat de gebruiker op delen tikt.
// PRG-2: een adres opent als kaartlink.
export function kaartLink(adres) {
  return `https://maps.google.com/?q=${encodeURIComponent(adres)}`;
}

export function waLink(tekst) {
  return `https://wa.me/?text=${encodeURIComponent(tekst)}`;
}
