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

  // HTTPS format
  const httpsMatch = remoteUrl.match(
    /https:\/\/github\.com\/([^/]+)\/([^/.]+)/
  );
  if (httpsMatch) {
    return `https://github.com/${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  // SSH format
  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
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
