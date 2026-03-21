import { defineConfig } from 'prisma/config';
import path from 'node:path';
import os from 'node:os';

const defaultDbPath = path.join(os.homedir(), '.lgtmai', 'lgtmai.db');
const rawPath = process.env.DB_PATH ?? defaultDbPath;
const dbPath = path.resolve(rawPath.replace(/^~/, os.homedir()));

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: `file:${dbPath}`,
  },
});
