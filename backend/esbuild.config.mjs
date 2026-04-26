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
  minify: true,
  loader: {
    // Inline .gql files as string constants so no runtime file reads are needed
    '.gql': 'text',
  },
  external: [
    // Prisma and libsql use native binaries and must remain external
    '@prisma/client',
    '@prisma/adapter-libsql',
    '@libsql/client',
    // tsoa and @tsoa/cli are build-time tools
    'tsoa',
    '@tsoa/cli',
    // swagger-ui-express is dev-only
    'swagger-ui-express',
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
