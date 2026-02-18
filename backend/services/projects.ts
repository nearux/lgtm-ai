import HttpStatus from 'http-status';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import prisma, {
  Project,
  ProjectDetail,
  ProjectGitInfo,
} from '../prismaClient.js';
import { AppError } from '../errors/AppError.js';
import { CreateProjectInput, UpdateProjectInput } from '../schemas/projects.js';

function getGitInfo(workingDir: string): ProjectGitInfo {
  let remoteUrl: string | null = null;
  let currentBranch: string | null = null;
  let branches: string[] = [];

  try {
    remoteUrl = execSync('git remote get-url origin', {
      cwd: workingDir,
      encoding: 'utf8',
    }).trim();
  } catch {
    remoteUrl = null;
  }

  try {
    currentBranch =
      execSync('git branch --show-current', {
        cwd: workingDir,
        encoding: 'utf8',
      }).trim() || null;
  } catch {
    currentBranch = null;
  }

  try {
    const raw = execSync('git branch -a', {
      cwd: workingDir,
      encoding: 'utf8',
    });
    branches = raw
      .split('\n')
      .map((line) => line.replace(/^\*?\s+/, '').trim())
      .filter((line) => line.length > 0);
  } catch {
    branches = [];
  }

  return { remoteUrl, currentBranch, branches };
}

export async function create(input: CreateProjectInput): Promise<Project> {
  const { name, description, working_dir } = input;

  if (!existsSync(working_dir)) {
    throw new AppError(
      'working_dir does not exist on the filesystem',
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }

  const now = new Date().toISOString();
  return prisma.project.create({
    data: {
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() ?? null,
      working_dir: working_dir.trim(),
      created_at: now,
      updated_at: now,
    },
  });
}

export async function findAll(): Promise<Project[]> {
  return prisma.project.findMany({
    orderBy: { created_at: 'desc' },
  });
}

export async function findById(id: string): Promise<ProjectDetail> {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new AppError('Project not found', HttpStatus.NOT_FOUND);

  return { ...project, gitInfo: getGitInfo(project.working_dir) };
}

export async function update(
  id: string,
  input: UpdateProjectInput
): Promise<Project> {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new AppError('Project not found', HttpStatus.NOT_FOUND);

  const { name, description, working_dir } = input;

  if (working_dir !== undefined && !existsSync(working_dir)) {
    throw new AppError(
      'working_dir does not exist on the filesystem',
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }

  return prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description.trim() || null,
      }),
      ...(working_dir !== undefined && { working_dir: working_dir.trim() }),
      updated_at: new Date().toISOString(),
    },
  });
}

export async function remove(id: string): Promise<void> {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new AppError('Project not found', HttpStatus.NOT_FOUND);

  await prisma.project.delete({ where: { id } });
}
