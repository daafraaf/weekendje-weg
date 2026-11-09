// Hashen en willekeurige geheimen (spec §7.1.3, §7.1.4, NFR-1).
// Puur: de SHA-256 en de bron van willekeur komen van de adapter.
//   sha256(bytes: number[0..255]) -> number[0..255] (32 bytes)
//   random.bytes(n) -> number[0..255] (n bytes)

// AAN-32: tokens SHA-256 zonder salt; pincode en wachtwoord iteratief met salt.
// Het aantal iteraties wordt in fase 20 in Apps Script gemeten (login onder 1 seconde).
export const ITERATIES = 1000;

export function utf8(tekst) {
  const uit = [];
  const s = String(tekst);
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
    }
    if (c < 0x80) uit.push(c);
    else if (c < 0x800) uit.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) uit.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else uit.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return uit;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function base64url(bytes) {
  let uit = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    uit += B64[a >> 2];
    uit += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) uit += B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) uit += B64[c & 63];
  }
  return uit;
}

export function hashToken(sha256, token) {
  return base64url(sha256(utf8(token)));
}

export function hashGeheim(sha256, geheim, salt, iteraties = ITERATIES) {
  const zout = utf8(salt);
  let h = sha256(zout.concat(utf8(':'), utf8(geheim)));
  for (let i = 1; i < iteraties; i++) h = sha256(h.concat(zout));
  return base64url(h);
}

// Vergelijkt twee hashes zonder vroeg te stoppen.
export function gelijk(a, b) {
  const x = String(a), y = String(b);
  let verschil = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) verschil |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return verschil === 0;
}

export const maakToken = (random) => base64url(random.bytes(16)); // 22 tekens, 128 bits
export const maakId = (random) => base64url(random.bytes(12)); // 16 tekens
export const maakSalt = (random) => base64url(random.bytes(16));

// AAN-36: het script kiest de pincode, zes cijfers met rejection sampling (geen modulo-bias).
export function maakPincode(random) {
  const grens = Math.floor(0x100000000 / 1e6) * 1e6;
  for (;;) {
    const [a, b, c, d] = random.bytes(4);
    const x = ((a << 24) >>> 0) + (b << 16) + (c << 8) + d;
    if (x < grens) return String(x % 1e6).padStart(6, '0');
  }
}
