// De enige plek in src/web met vaste externe links (AAN-37, bronregels NFR-3).
// De tekst gaat URL-gecodeerd mee; er wordt niets naar WhatsApp gestuurd voordat de gebruiker op delen tikt.
export function waLink(tekst) {
  return `https://wa.me/?text=${encodeURIComponent(tekst)}`;
}
