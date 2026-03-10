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
    // tsoa is a build-time tool only
    'tsoa',
  ],
  banner: {
    js: [
      'import { createRequire } from "module";',
      'const require = createRequire(import.meta.url);',
      'const __filename = new URL(import.meta.url).pathname;',
      'const __dirname = __filename.slice(0, __filename.lastIndexOf("/"));',
    ].join('\n'),
  },
});
