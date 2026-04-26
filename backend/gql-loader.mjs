import { readFileSync } from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  if (result.url.endsWith('.gql')) {
    return { ...result, format: 'module', shortCircuit: true };
  }
  return result;
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.gql')) {
    const source = readFileSync(new URL(url).pathname, 'utf-8');
    return {
      format: 'module',
      source: `export default ${JSON.stringify(source)};`,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
