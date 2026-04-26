import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

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
  external: [
    '@prisma/client',
    '@prisma/adapter-libsql',
    '@libsql/client',
    'tsoa',
    '@tsoa/cli',
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

// .gql 파일을 dist에 복사 (런타임에 readFileSync로 읽음)
mkdirSync('dist/graphql/queries', { recursive: true });
cpSync('graphql/queries', 'dist/graphql/queries', { recursive: true });
