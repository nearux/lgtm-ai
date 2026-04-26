import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';
import { resolveDbPath } from './dbPath.js';

const dbPath = resolveDbPath();
const dbDir = path.dirname(dbPath);
mkdirSync(dbDir, { recursive: true });

const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

export default prisma;
