// Bouwt de voorkant naar dist/web en het Apps Script naar dist/gas (spec §3, NFR-20).
import { build as esbuild } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { INGANGEN } from '../src/server/gas/ingangen.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function build() {
  const out = path.join(root, 'dist', 'web');
  await rm(path.join(root, 'dist'), { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(path.join(root, 'src/web/index.html'), path.join(out, 'index.html'));
  await esbuild({
    entryPoints: [path.join(root, 'src/web/app.js')],
    outfile: path.join(out, 'app.js'),
    bundle: true,
    format: 'esm',
    target: 'es2022',
    legalComments: 'none',
    logLevel: 'warning',
  });
  await buildGas();
}

// Apps Script kent geen modules: één IIFE-bestand met globalName WW en top-level stubs per ingang.
export async function buildGas(out = path.join(root, 'dist', 'gas')) {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(path.join(root, 'appsscript.json'), path.join(out, 'appsscript.json'));
  await esbuild({
    entryPoints: [path.join(root, 'src/server/gas/main.js')],
    outfile: path.join(out, 'Code.js'),
    bundle: true,
    format: 'iife',
    globalName: 'WW',
    target: 'es2019',
    legalComments: 'none',
    logLevel: 'warning',
    footer: { js: INGANGEN.map((n) => `function ${n}(e){return WW.${n}(e)}`).join('\n') },
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
  console.log('build: dist/web en dist/gas klaar');
}
