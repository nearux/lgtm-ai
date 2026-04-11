import HttpStatus from 'http-status';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { filter, map, pipe } from 'remeda';
import { AppError } from '../errors/AppError.js';
import { ProjectGitRemoteDto } from '../dtos/projectGitInfoDto.js';
import { GitHubRepoDto } from '../dtos/gitHubRepoDto.js';
import * as projectRepository from '../repositories/projectRepository.js';
import { git } from '../utils/git.js';
import type {
  Project,
  ProjectDetail,
  ProjectGitInfo,
  CreateProjectBody,
  UpdateProjectBody,
} from '../types/projects.js';

/**
 * Returns a function that catches errors from a promise, logs them, and
 * returns the given fallback value instead.
 */
const withFallback =
  <T>(label: string, fallback: T) =>
  (promise: Promise<T>): Promise<T> =>
    promise.catch((error) => {
      console.error(`[getGitInfo] ${label}:`, error);
      return fallback;
    });

async function getGitInfo(workingDir: string): Promise<ProjectGitInfo> {
  const [remoteUrl, remotes, currentBranch, branches] = await Promise.all([
    withFallback(
      'Failed to resolve origin remote URL',
      null as string | null
    )(
      git(workingDir, ['remote', 'get-url', 'origin']).then((out) => out.trim())
    ),
    withFallback(
      'Failed to list git remotes',
      [] as Array<{ name: string; url: string }>
    )(
      git(workingDir, ['remote', '-v']).then((raw) =>
        ProjectGitRemoteDto.fromGitRemoteList(raw)
      )
    ),
    withFallback(
      'Failed to get current branch',
      null as string | null
    )(
      git(workingDir, ['branch', '--show-current']).then(
        (out) => out.trim() || null
      )
    ),
    withFallback(
      'Failed to list branches',
      [] as string[]
    )(
      git(workingDir, ['branch']).then((raw) =>
        pipe(
          raw.split('\n'),
          map((line) => line.replace(/^\*?\s+/, '').trim()),
          filter((line) => line.length > 0)
        )
      )
    ),
  ]);

  return { remoteUrl, currentBranch, branches, remotes };
}

export async function create(input: CreateProjectBody): Promise<Project> {
  const { name, description, working_dir } = input;

  if (!existsSync(working_dir)) {
    throw new AppError(
      'working_dir does not exist on the filesystem',
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }

  const now = new Date();
  return projectRepository.create({
    id: randomUUID(),
    name: name.trim(),
    description: description?.trim() ?? null,
    working_dir: working_dir.trim(),
    created_at: now,
    updated_at: now,
  });
}

export async function findAll(): Promise<Project[]> {
  return projectRepository.findAll();
}

export async function findById(id: string): Promise<ProjectDetail> {
  const project = await projectRepository.findById(id);
  if (!project) throw new AppError('Project not found', HttpStatus.NOT_FOUND);
  const gitInfo = await getGitInfo(project.working_dir);

  return { ...project, gitInfo };
}

export async function update(
  id: string,
  input: UpdateProjectBody
): Promise<Project> {
  const existing = await projectRepository.findById(id);
  if (!existing) throw new AppError('Project not found', HttpStatus.NOT_FOUND);

  const { name, description, working_dir } = input;

  if (working_dir !== undefined && !existsSync(working_dir)) {
    throw new AppError(
      'working_dir does not exist on the filesystem',
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }

  return projectRepository.updateById(id, {
    ...(name !== undefined && { name: name.trim() }),
    ...(description !== undefined && {
      description: description.trim() || null,
    }),
    ...(working_dir !== undefined && { working_dir: working_dir.trim() }),
    updated_at: new Date(),
  });
}

export async function remove(id: string): Promise<void> {
  const existing = await projectRepository.findById(id);
  if (!existing) throw new AppError('Project not found', HttpStatus.NOT_FOUND);

  await projectRepository.deleteById(id);
}

/**
 * Resolves the GitHub "owner/repo" string for a project, using the specified
 * remote name (defaults to "origin"). Throws an AppError on invalid input.
 */
const REMOTE_NAME_RE = /^[\w.-]+$/;

export async function resolveGitHubRepo(
  projectId: string,
  remoteName: string
): Promise<string> {
  if (!REMOTE_NAME_RE.test(remoteName)) {
    throw new AppError('Invalid remote name', HttpStatus.BAD_REQUEST);
  }

  const project = await projectRepository.findById(projectId);
  if (!project) throw new AppError('Project not found', HttpStatus.NOT_FOUND);

  try {
    const remoteUrl = (
      await git(project.working_dir, ['remote', 'get-url', remoteName])
    ).trim();
    return GitHubRepoDto.fromRemoteUrl(remoteUrl).toString();
  } catch {
    throw new AppError(
      `Project does not have a configured Git remote named '${remoteName}'`,
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}
