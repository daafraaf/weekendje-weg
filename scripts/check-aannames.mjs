// Telt de aannames (docs/04-aannames.md): elke AAN-xx die niet vervallen is, staat met zijn ID in de code
// (src/ of scripts/) en heeft minstens één test met het ID in de naam (test/unit, test/e2e). Faalt anders.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eigen = fileURLToPath(import.meta.url);

function bestanden(map, patroon) {
  const uit = [];
  for (const naam of readdirSync(map)) {
    const p = path.join(map, naam);
    if (statSync(p).isDirectory()) uit.push(...bestanden(p, patroon));
    else if (patroon.test(naam)) uit.push(p);
  }
  return uit;
}

// Rijen van de tabel: | AAN-xx | ... | status |
export function leesAannames(tekst) {
  return tekst.split('\n').filter((r) => /^\| AAN-\d+ \|/.test(r)).map((r) => {
    const cellen = r.split('|').map((c) => c.trim());
    return { id: cellen[1], status: cellen[cellen.length - 2] };
  });
}

// Namen van test(...)-aanroepen in een testbestand.
export function testnamen(tekst) {
  const namen = [];
  const re = /\btest(?:\.(?:only|skip))?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (let m = re.exec(tekst); m; m = re.exec(tekst)) namen.push(m[2]);
  return namen;
}

const heeftId = (tekst, id) => new RegExp(`${id}(?!\\d)`).test(tekst);

export function controleer(root) {
  // "gepland fase NN": vastgelegd in een plan, nog niet gebouwd; de bouwende fase zet de status op open.
  const aannames = leesAannames(readFileSync(path.join(root, 'docs', '04-aannames.md'), 'utf8'))
    .filter((a) => a.status !== 'vervallen' && !a.status.startsWith('gepland'));
  const code = [...bestanden(path.join(root, 'src'), /\.(m?js|html|css)$/), ...bestanden(path.join(root, 'scripts'), /\.m?js$/)]
    .filter((p) => p !== eigen).map((p) => readFileSync(p, 'utf8')).join('\n');
  const namen = bestanden(path.join(root, 'test'), /\.(test|spec)\.mjs$/).flatMap((p) => testnamen(readFileSync(p, 'utf8')));
  const fouten = [];
  for (const { id } of aannames) {
    if (!heeftId(code, id)) fouten.push(`${id}: staat nergens in src/ of scripts/`);
    if (!namen.some((n) => heeftId(n, id))) fouten.push(`${id}: geen test met het ID in de naam`);
  }
  return { aantal: aannames.length, fouten };
}

if (process.argv[1] && path.resolve(process.argv[1]) === eigen) {
  const { aantal, fouten } = controleer(root);
  if (fouten.length) {
    for (const f of fouten) console.error(f);
    console.error(`Aannames: ${fouten.length} fout(en) bij ${aantal} aannames.`);
    process.exit(1);
  }
  console.log(`Aannames: alle ${aantal} hebben een codeplek en een test met het ID in de naam.`);
}
