/**
 * Parse a git remote URL and extract the GitHub base URL
 * Supports:
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo
 * - git@github.com:owner/repo.git
 * - git@github.com:owner/repo
 */
export const parseGitHubUrl = (remoteUrl: string | null): string | null => {
  if (!remoteUrl) return null;

  // HTTPS format (allows optional userinfo like `user:token@`)
  const httpsMatch = remoteUrl.match(
    /^https:\/\/(?:[^@/]+@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/
  );
  if (httpsMatch) {
    return `https://github.com/${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  // SSH format (supports both SCP-like `git@github.com:owner/repo` and `ssh://git@github.com/owner/repo`)
  const sshMatch = remoteUrl.match(
    /^(?:ssh:\/\/)?git@github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/
  );
  if (sshMatch) {
    return `https://github.com/${sshMatch[1]}/${sshMatch[2]}`;
  }

  return null;
};

/**
 * Convert issue/PR references (#123) to GitHub links in markdown text
 */
export const linkifyIssueReferences = (
  text: string,
  githubBaseUrl: string | null
): string => {
  if (!githubBaseUrl) return text;

  // Replace #123 patterns with markdown links
  // Negative lookbehind to avoid matching URLs or already linked references
  return text.replace(
    /(?<![[\w/])#(\d+)(?!\])/g,
    `[#$1](${githubBaseUrl}/issues/$1)`
  );
};

/**
 * Convert commit SHA references to GitHub links
 * Matches 7-40 character hex strings that look like commit SHAs
 */
export const linkifyCommitReferences = (
  text: string,
  githubBaseUrl: string | null
): string => {
  if (!githubBaseUrl) return text;

  // Match 7-40 char hex strings not inside URLs, links, or code blocks
  // Negative lookbehind for common prefixes that indicate it's not a standalone SHA
  return text.replace(
    /(?<![[\w/`])([a-f0-9]{7,40})(?![a-f0-9\]`])/gi,
    `[\`$1\`](${githubBaseUrl}/commit/$1)`
  );
};

/**
 * Convert @username mentions to GitHub profile links
 */
export const linkifyUserMentions = (text: string): string => {
  // Match @username patterns (GitHub usernames: alphanumeric and hyphens)
  // Negative lookbehind to avoid matching email addresses or already linked
  return text.replace(
    /(?<![[\w.])@([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)(?!\])/g,
    '[@$1](https://github.com/$1)'
  );
};

/**
 * Apply all GitHub-style linkifications to text
 */
export const linkifyGitHubReferences = (
  text: string,
  githubBaseUrl: string | null
): string => {
  let result = text;
  result = linkifyIssueReferences(result, githubBaseUrl);
  result = linkifyCommitReferences(result, githubBaseUrl);
  result = linkifyUserMentions(result);
  return result;
};
