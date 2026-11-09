// Bouwt de voorkant naar dist/web. dist/gas volgt zodra src/server bestaat.
import { build as esbuild } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
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
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
  console.log('build: dist/web klaar');
}
