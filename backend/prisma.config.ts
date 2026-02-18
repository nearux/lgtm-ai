import path from 'path';
import os from 'os';
import { defineConfig } from 'prisma/config';

const dbPath = path.join(os.homedir(), '.lgtmai', 'lgtmai.db');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: `file:${dbPath}`,
  },
});
