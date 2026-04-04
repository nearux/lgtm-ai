import HttpStatus from 'http-status';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/AppError.js';
import { ProjectGitRemoteDto } from '../dtos/projectGitInfoDto.js';
import { GitHubRepoDto } from '../dtos/gitHubRepoDto.js';
import * as projectRepository from '../repositories/projectRepository.js';
import type {
  Project,
  ProjectDetail,
  ProjectGitInfo,
  CreateProjectBody,
  UpdateProjectBody,
} from '../types/projects.js';

const execFileAsync = promisify(execFile);

async function getGitInfo(workingDir: string): Promise<ProjectGitInfo> {
  let remoteUrl: string | null = null;
  let currentBranch: string | null = null;
  let branches: string[] = [];
  let remotes: Array<{ name: string; url: string }> = [];

  try {
    const result = await execFileAsync('git', ['remote', 'get-url', 'origin'], {
      cwd: workingDir,
    });
    remoteUrl = result.stdout.trim();
  } catch (error) {
    console.error('[getGitInfo] Failed to resolve origin remote URL:', error);
    remoteUrl = null;
  }

  try {
    const result = await execFileAsync('git', ['remote', '-v'], {
      cwd: workingDir,
    });
    remotes = ProjectGitRemoteDto.fromGitRemoteList(result.stdout);
  } catch (error) {
    console.error('[getGitInfo] Failed to list git remotes:', error);
    remotes = [];
  }

  try {
    const result = await execFileAsync('git', ['branch', '--show-current'], {
      cwd: workingDir,
    });
    currentBranch = result.stdout.trim() || null;
  } catch (error) {
    console.error('[getGitInfo] Failed to get current branch:', error);
    currentBranch = null;
  }

  try {
    const result = await execFileAsync('git', ['branch'], { cwd: workingDir });
    const raw = result.stdout;
    branches = raw
      .split('\n')
      .map((line) => line.replace(/^\*?\s+/, '').trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    console.error('[getGitInfo] Failed to list branches:', error);
    branches = [];
  }

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
export async function resolveGitHubRepo(
  projectId: string,
  remoteName: string
): Promise<string> {
  const project = await findById(projectId);
  const selectedRemoteUrl = project.gitInfo.remotes.find(
    (remote) => remote.name === remoteName
  )?.url;

  if (!selectedRemoteUrl) {
    throw new AppError(
      `Project does not have a configured Git remote named '${remoteName}'`,
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }

  return GitHubRepoDto.fromRemoteUrl(selectedRemoteUrl).toString();
}
