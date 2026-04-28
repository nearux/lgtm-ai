import 'reflect-metadata';
import { Container } from 'inversify';
import prisma from '../database/prismaClient.js';
import type { PrismaClient } from '@prisma/client';
import { authModule } from '../modules/auth/auth.module.js';
import { filesModule } from '../modules/files/files.module.js';
import { projectsModule } from '../modules/projects/projects.module.js';
import { claudeModule } from '../modules/claude/claude.module.js';
import { PRISMA_CLIENT } from './container-tokens.js';

export function createContainer(): Container {
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind<PrismaClient>(PRISMA_CLIENT).toConstantValue(prisma);
  container.load(authModule, filesModule, projectsModule, claudeModule);
  return container;
}

export const container = createContainer();
