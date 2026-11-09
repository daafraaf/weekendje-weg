import test from 'node:test';
import assert from 'node:assert/strict';
import { herkenPlatform, installatieVoor } from '../../src/web/platform.js';

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  ipadMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
};

test('RON-2 iOS Safari krijgt de iOS-uitleg', () => {
  assert.deepEqual(herkenPlatform(UA.iosSafari), { apparaat: 'iphone', browser: 'safari', installatie: 'ios-safari' });
});

test('RON-2 iOS Chrome krijgt de uitleg voor een andere browser op iOS', () => {
  assert.deepEqual(herkenPlatform(UA.iosChrome), { apparaat: 'iphone', browser: 'chrome', installatie: 'ios-ander' });
});

test('RON-2 Android Chrome', () => {
  assert.deepEqual(herkenPlatform(UA.androidChrome), { apparaat: 'android', browser: 'chrome', installatie: 'android-chrome' });
});

test('RON-2 Windows Edge en desktop Chrome zijn Chromium', () => {
  assert.deepEqual(herkenPlatform(UA.windowsEdge), { apparaat: 'laptop', browser: 'edge', installatie: 'desktop-chromium' });
  assert.equal(herkenPlatform(UA.windowsChrome).installatie, 'desktop-chromium');
});

test('RON-2 macOS Firefox en Samsung Internet krijgen een bladwijzer', () => {
  assert.deepEqual(herkenPlatform(UA.macFirefox), { apparaat: 'laptop', browser: 'firefox', installatie: 'bladwijzer' });
  assert.equal(herkenPlatform(UA.samsung).installatie, 'bladwijzer');
});

test('RON-2 een iPad die zich als Mac meldt geldt als iOS, een echte Mac niet', () => {
  assert.equal(herkenPlatform(UA.ipadMac, 5).installatie, 'ios-safari');
  assert.equal(herkenPlatform(UA.ipadMac, 0).apparaat, 'laptop');
});

test('RON-2 een gekozen ander apparaat krijgt de standaarduitleg, het eigen apparaat de herkende', () => {
  const mac = herkenPlatform(UA.macFirefox);
  assert.equal(installatieVoor('laptop', mac), 'bladwijzer');
  assert.equal(installatieVoor('iphone', mac), 'ios-safari');
  assert.equal(installatieVoor('android', mac), 'android-chrome');
  assert.equal(installatieVoor('iphone', herkenPlatform(UA.iosChrome)), 'ios-ander');
});

test('AAN-73 de rondleiding is gezien zodra de vlag in de opslag staat', async () => {
  const { rondleidingGezien, zetRondleidingGezien } = await import('../../src/web/screens/rondleiding.js');
  const opslag = new Map();
  const o = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, v) };
  assert.equal(rondleidingGezien(o), false);
  zetRondleidingGezien(o);
  assert.equal(rondleidingGezien(o), true);
});
