// Haalt de schoolvakanties op uit de open data van de Rijksoverheid en schrijft data/vakanties.json (KAL-6).
// AAN-13: de bron is de open data van de Rijksoverheid; dit script is de enige plek die ernaar vraagt.
import { get } from 'node:https';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { vanOpenData } from '../src/shared/vakanties.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASIS = 'https://opendata.rijksoverheid.nl/v1/sources/rijksoverheid/infotypes/schoolholidays/schoolyear/';

function haal(url) {
  return new Promise((klaar, mis) => {
    get(url, { headers: { Accept: 'application/json' } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); mis(new Error(`HTTP ${res.statusCode}`)); return; }
      let tekst = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { tekst += d; });
      res.on('end', () => { try { klaar(JSON.parse(tekst)); } catch (e) { mis(e); } });
    }).on('error', mis).setTimeout(20000, function stop() { this.destroy(new Error('time-out')); });
  });
}

// Het lopende schooljaar en de twee daarna.
export function schooljaren(nu = new Date()) {
  const start = nu.getUTCMonth() >= 7 ? nu.getUTCFullYear() : nu.getUTCFullYear() - 1;
  return [0, 1, 2].map((i) => `${start + i}-${start + i + 1}`);
}

async function main() {
  const antwoorden = [];
  for (const sj of schooljaren()) {
    try {
      antwoorden.push(await haal(`${BASIS}${sj}?output=json`));
      console.log(`${sj}: opgehaald`);
    } catch (e) {
      console.warn(`${sj}: niet opgehaald (${e.message})`);
    }
  }
  const data = vanOpenData(antwoorden);
  if (!data.vakanties.length) {
    console.error('Geen vakanties gevonden; data/vakanties.json is niet aangepast.');
    process.exit(1);
  }
  const uit = { bron: 'open data Rijksoverheid (npm run vakanties)', opgehaald: new Date().toISOString().slice(0, 10), ...data };
  await writeFile(path.join(root, 'data', 'vakanties.json'), `${JSON.stringify(uit, null, 2)}\n`);
  console.log(`data/vakanties.json: ${data.vakanties.length} vakanties in ${data.schooljaren.length} schooljaren`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
