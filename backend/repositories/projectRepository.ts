import type { Prisma, Project } from '@prisma/client';
import prisma from '../prismaClient.js';

export async function create(
  data: Prisma.ProjectUncheckedCreateInput
): Promise<Project> {
  return prisma.project.create({
    data,
  });
}

export async function findAll(): Promise<Project[]> {
  return prisma.project.findMany({
    orderBy: { created_at: 'desc' },
  });
}

export async function findById(id: string): Promise<Project | null> {
  return prisma.project.findUnique({
    where: { id },
  });
}

export async function findWorkingDirectoryById(
  id: string
): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      working_dir: true,
    },
  });

  return project?.working_dir ?? null;
}

export async function updateById(
  id: string,
  data: Prisma.ProjectUncheckedUpdateInput
): Promise<Project> {
  return prisma.project.update({
    where: { id },
    data,
  });
}

export async function deleteById(id: string): Promise<void> {
  await prisma.project.delete({
    where: { id },
  });
}
