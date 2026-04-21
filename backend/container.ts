import 'reflect-metadata';
import { Container } from 'inversify';
import prisma from './prismaClient.js';
import type { PrismaClient } from '@prisma/client';

export const PRISMA_CLIENT = Symbol.for('PrismaClient');

export const container = new Container({ defaultScope: 'Singleton' });

container.bind<PrismaClient>(PRISMA_CLIENT).toConstantValue(prisma);

// Module bindings will be added in Steps 2/3/4 via container.load(...)
