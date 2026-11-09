// Draait alle checks achter elkaar en eindigt met één groene of rode regel (NFR-13).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const pw = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');

const stappen = [
  ['bronregels', [node, 'scripts/check-bronregels.mjs']],
  ['aannames', [node, 'scripts/check-aannames.mjs']],
  ['unittests', [node, '--test', 'test/unit/*.test.mjs']],
  ['build', [node, 'scripts/build.mjs']],
  ['playwright', [node, pw, 'test']],
];

for (const [naam, [cmd, ...args]] of stappen) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    const uit = `${r.stdout || ''}${r.stderr || ''}`.trimEnd().split('\n').slice(-40).join('\n');
    console.error(uit);
    console.error(`CHECK ROOD: stap "${naam}" faalde`);
    process.exit(1);
  }
}
console.log(`CHECK GROEN: ${stappen.map(([n]) => n).join(', ')}`);
