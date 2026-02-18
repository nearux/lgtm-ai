import path from 'path';
import os from 'os';
import { mkdirSync } from 'fs';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';

const dbDir = path.join(os.homedir(), '.lgtmai');
mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'lgtmai.db');
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

export default prisma;
