import { build } from 'esbuild';

await build({
  entryPoints: ['index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/index.js',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: [
    // Prisma and libsql use native binaries and must remain external
    '@prisma/client',
    '@prisma/adapter-libsql',
    '@libsql/client',
  ],
  banner: {
    js: [
      'import { createRequire } from "module";',
      'import { fileURLToPath } from "url";',
      'import { dirname } from "path";',
      'const require = createRequire(import.meta.url);',
      'const __filename = fileURLToPath(import.meta.url);',
      'const __dirname = dirname(__filename);',
    ].join('\n'),
  },
});
