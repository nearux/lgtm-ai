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
      'const require = (await import("module")).createRequire(import.meta.url);',
      'const __filename = (await import("url")).fileURLToPath(import.meta.url);',
      'const __dirname = (await import("path")).dirname(__filename);',
    ].join('\n'),
  },
});
