// backend/container.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import prisma from './prismaClient.js';
import type { PrismaClient } from '@prisma/client';
import { authModule } from './modules/auth/auth.module.js';
import { filesModule } from './modules/files/files.module.js';

export const PRISMA_CLIENT = Symbol.for('PrismaClient');

export const container = new Container({ defaultScope: 'Singleton' });

container.bind<PrismaClient>(PRISMA_CLIENT).toConstantValue(prisma);

container.load(authModule, filesModule);
