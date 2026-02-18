import path from 'node:path';
import os from 'node:os';
import { mkdirSync } from 'node:fs';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '.prisma/client';

const dbDir = path.join(os.homedir(), '.lgtmai');
mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'lgtmai.db');
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

export default prisma;

export interface ProjectGitInfo {
  remoteUrl: string | null;
  currentBranch: string | null;
  branches: string[];
}

export type { Project } from '.prisma/client';

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  working_dir: string;
  created_at: string;
  updated_at: string;
  gitInfo: ProjectGitInfo;
}
