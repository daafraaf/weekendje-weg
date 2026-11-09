// Apparaat en browser herkennen voor de installatie-uitleg (RON-2) en de installatieknop (RON-3).
// herkenPlatform is puur, zodat Node de user agents kan testen.

// Geeft { apparaat: 'iphone' | 'android' | 'laptop', browser, installatie } waarbij installatie een van
// 'ios-safari', 'ios-ander', 'android-chrome', 'desktop-chromium' of 'bladwijzer' is.
// iPadOS meldt zich als Macintosh; maxTouchPoints onderscheidt hem van een Mac.
export function herkenPlatform(ua = '', maxTouchPoints = 0) {
  const u = String(ua);
  const ios = /iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && maxTouchPoints > 1);
  if (ios) {
    const ander = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//.test(u);
    const browser = /CriOS/.test(u) ? 'chrome' : /FxiOS/.test(u) ? 'firefox' : /EdgiOS/.test(u) ? 'edge' : ander ? 'ander' : 'safari';
    return { apparaat: 'iphone', browser, installatie: ander ? 'ios-ander' : 'ios-safari' };
  }
  const vreemd = /OPR\/|Opera|SamsungBrowser|Firefox|Vivaldi|Brave/.test(u);
  const edge = /Edg(e|A)?\//.test(u);
  const chrome = /Chrome\//.test(u) && !vreemd;
  const browser = edge ? 'edge' : chrome ? 'chrome' : /Firefox/.test(u) ? 'firefox' : /SamsungBrowser/.test(u) ? 'samsung' : /Safari\//.test(u) ? 'safari' : 'ander';
  if (/Android/.test(u)) return { apparaat: 'android', browser, installatie: chrome && !edge ? 'android-chrome' : 'bladwijzer' };
  return { apparaat: 'laptop', browser, installatie: chrome || edge ? 'desktop-chromium' : 'bladwijzer' };
}

// Welke uitleg bij het gekozen apparaat hoort: dezelfde als de herkende als die klopt, anders de standaard.
export function installatieVoor(apparaat, herkend) {
  const dezelfde = herkend.apparaat === apparaat;
  if (apparaat === 'iphone') return dezelfde ? herkend.installatie : 'ios-safari';
  if (apparaat === 'android') return dezelfde ? herkend.installatie : 'android-chrome';
  return dezelfde ? herkend.installatie : 'desktop-chromium';
}

// RON-3: beforeinstallprompt komt maar één keer; de app luistert vanaf het begin en bewaart hem.
let uitgesteld = null;
const luisteraars = new Set();

export function luisterNaarInstallatie(doel = globalThis) {
  doel.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    uitgesteld = e;
    luisteraars.forEach((f) => f());
  });
  doel.addEventListener('appinstalled', () => {
    uitgesteld = null;
    luisteraars.forEach((f) => f());
  });
}

export const kanInstalleren = () => uitgesteld !== null;

export function bijInstalleerbaar(f) {
  luisteraars.add(f);
  return () => luisteraars.delete(f);
}

export async function installeer() {
  const e = uitgesteld;
  if (!e) return false;
  uitgesteld = null;
  luisteraars.forEach((f) => f());
  await e.prompt();
  return true;
}
