import HttpStatus from 'http-status';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { filter, map, pipe } from 'remeda';
import { inject, injectable } from 'inversify';
import { AppError } from '../../errors/AppError.js';
import { ProjectGitRemoteDto } from './dto/project-git-info.dto.js';
import { GitHubRepoDto } from './dto/github-repo.dto.js';
import { ProjectRepository } from './project.repository.js';
import { git } from './git.util.js';
import type {
  Project,
  ProjectDetail,
  ProjectGitInfo,
  CreateProjectBody,
  UpdateProjectBody,
} from './project.types.js';

const REMOTE_NAME_RE = /^[\w.-]+$/;

@injectable()
export class ProjectsService {
  constructor(
    @inject(ProjectRepository)
    private readonly projectRepository: ProjectRepository
  ) {}

  async create(input: CreateProjectBody): Promise<Project> {
    const { name, description, working_dir } = input;

    if (!existsSync(working_dir)) {
      throw new AppError(
        'working_dir does not exist on the filesystem',
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    const now = new Date();
    return this.projectRepository.create({
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() ?? null,
      working_dir: working_dir.trim(),
      created_at: now,
      updated_at: now,
    });
  }

  async findAll(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  async findById(id: string): Promise<ProjectDetail> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new AppError('Project not found', HttpStatus.NOT_FOUND);
    const gitInfo = await this.getGitInfo(project.working_dir);
    return { ...project, gitInfo };
  }

  async update(id: string, input: UpdateProjectBody): Promise<Project> {
    const existing = await this.projectRepository.findById(id);
    if (!existing)
      throw new AppError('Project not found', HttpStatus.NOT_FOUND);

    const { name, description, working_dir } = input;

    if (working_dir !== undefined && !existsSync(working_dir)) {
      throw new AppError(
        'working_dir does not exist on the filesystem',
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    return this.projectRepository.updateById(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description.trim() || null,
      }),
      ...(working_dir !== undefined && { working_dir: working_dir.trim() }),
      updated_at: new Date(),
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.projectRepository.findById(id);
    if (!existing)
      throw new AppError('Project not found', HttpStatus.NOT_FOUND);
    await this.projectRepository.deleteById(id);
  }

  async resolveGitHubRepo(
    projectId: string,
    remoteName: string
  ): Promise<string> {
    if (!REMOTE_NAME_RE.test(remoteName)) {
      throw new AppError('Invalid remote name', HttpStatus.BAD_REQUEST);
    }

    const project = await this.projectRepository.findById(projectId);
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

  private async getGitInfo(workingDir: string): Promise<ProjectGitInfo> {
    const [remoteUrl, remotes, currentBranch, defaultBranch, branches] =
      await Promise.all([
        this.withFallback(
          'Failed to resolve origin remote URL',
          null as string | null
        )(
          git(workingDir, ['remote', 'get-url', 'origin']).then((out) =>
            out.trim()
          )
        ),
        this.withFallback(
          'Failed to list git remotes',
          [] as Array<{ name: string; url: string }>
        )(
          git(workingDir, ['remote', '-v']).then((raw) =>
            ProjectGitRemoteDto.fromGitRemoteList(raw)
          )
        ),
        this.withFallback(
          'Failed to get current branch',
          null as string | null
        )(
          git(workingDir, ['branch', '--show-current']).then(
            (out) => out.trim() || null
          )
        ),
        this.withFallback(
          'Failed to get default branch',
          null as string | null
        )(
          git(workingDir, ['symbolic-ref', 'refs/remotes/origin/HEAD']).then(
            (out) => {
              const ref = out.trim();
              return ref.replace('refs/remotes/origin/', '') || null;
            }
          )
        ),
        this.withFallback(
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

    return { remoteUrl, currentBranch, defaultBranch, branches, remotes };
  }

  private withFallback<T>(label: string, fallback: T) {
    return (promise: Promise<T>): Promise<T> =>
      promise.catch((error) => {
        console.error(`[getGitInfo] ${label}:`, error);
        return fallback;
      });
  }
}
