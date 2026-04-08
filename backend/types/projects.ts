export interface Project {
  id: string;
  name: string;
  description: string | null;
  working_dir: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectGitInfo {
  remoteUrl: string | null;
  currentBranch: string | null;
  branches: string[];
  remotes: ProjectGitRemote[];
}

export interface ProjectGitRemote {
  name: string;
  url: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
}

export interface ProjectDetail extends Project {
  gitInfo: ProjectGitInfo;
}

export interface CreateProjectBody {
  /** Project name */
  name: string;
  /** Optional description */
  description?: string;
  /** Absolute path to the project working directory */
  working_dir: string;
}

export interface UpdateProjectBody {
  /** Project name */
  name?: string;
  /** Optional description */
  description?: string;
  /** Absolute path to the project working directory */
  working_dir?: string;
}

export interface ErrorResponse {
  message: string;
}

export interface GenerateCommitMessageBody {
  prContext?: {
    title: string;
    body: string;
    reviewComment: string;
  };
}

export interface CommitMessageResponse {
  message: string;
}

export interface CommitAndPushBody {
  commitMessage: string;
  push?: boolean;
}

export interface CommitAndPushResponse {
  success: boolean;
  commitHash?: string;
  error?: string;
}
