// The server (Deno) cannot import from src/, so supabase/functions/nudge/nudges.ts is a generated copy of src/lib/nudges.ts
// with its two type-only imports replaced by inline types. Run `node scripts/sync-nudge-copy.mjs` after editing nudges.ts;
// a unit test fails if the copy is out of date.
import { readFileSync, writeFileSync } from 'node:fs';

export function build() {
  const src = readFileSync(new URL('../src/lib/nudges.ts', import.meta.url), 'utf8');
  const head = `// GENERATED from src/lib/nudges.ts by scripts/sync-nudge-copy.mjs. Do not edit by hand.\n`;
  const types = `type Role = 'arpan' | 'priya';\ntype L = { en: string; hi: string };\ntype DiscConfig = { nudgeEvery: 15 | 30 | 60; role: Role; eveningCheckin: string; detoxCutoff: string };\n`;
  const out = src
    .replace("import type { DiscConfig, Role } from './discipline';\n", '')
    .replace("import type { L } from './wisdom';\n", types);
  if (out === src || out.includes("from './discipline'") || out.includes("from './wisdom'")) throw new Error('nudges.ts imports changed: update scripts/sync-nudge-copy.mjs');
  return head + out;
}
if (process.argv[1] && process.argv[1].endsWith('sync-nudge-copy.mjs')) {
  writeFileSync(new URL('../supabase/functions/nudge/nudges.ts', import.meta.url), build());
  console.log('nudges.ts copied');
}
