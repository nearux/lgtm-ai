export interface GitHubAccount {
  username: string;
  active: boolean;
}

export interface GitHubAuthStatus {
  activeAccount: string;
  accounts: GitHubAccount[];
}

export interface SwitchAccountBody {
  /** GitHub username to switch to */
  username: string;
}
