import { existsSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', 'src');

export async function resolve(specifier, context, nextResolve) {
  const hasExt = /\.(m?[jt]sx?|json|css)$/i.test(specifier);
  if (!hasExt && (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('@/'))) {
    const base = specifier.startsWith('@/')
      ? resolvePath(SRC, specifier.slice(2))
      : resolvePath(dirname(fileURLToPath(context.parentURL ?? import.meta.url)), specifier);
    for (const cand of [`${base}.ts`, `${base}.tsx`, resolvePath(base, 'index.ts')]) {
      if (existsSync(cand)) return { url: pathToFileURL(cand).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
