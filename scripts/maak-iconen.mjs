// Eenmalig: rendert docs/design/icon*.svg naar PNG in src/web/icons (RON-6). Gebruik: node scripts/maak-iconen.mjs
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const taken = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
];
const browser = await chromium.launch();
for (const [bron, doel, maat] of taken) {
  const svg = (await readFile(path.join(root, 'docs/design', bron), 'utf8')).replace(/<metadata>[\s\S]*?<\/metadata>/, '');
  const page = await browser.newPage({ viewport: { width: maat, height: maat } });
  await page.setContent(`<body style="margin:0">${svg.replace(/<\?xml[^>]*>/, '').replace(/width="512" height="512"/, `width="${maat}" height="${maat}"`)}</body>`);
  await writeFile(path.join(root, 'src/web/icons', doel), await page.screenshot({ omitBackground: true }));
  await page.close();
}
await browser.close();
