import { defineConfig } from 'prisma/config';
import { resolveDbPath } from './utils/dbPath.js';

const dbPath = resolveDbPath();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: `file:${dbPath}`,
  },
});
