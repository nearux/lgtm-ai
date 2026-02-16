export const INSTALL_MESSAGES = {
  gh: `
❌ GitHub CLI (gh) is not installed.

Installation instructions:
  macOS:    brew install gh
  Windows:  winget install --id GitHub.cli
  Linux:    See https://github.com/cli/cli/blob/trunk/docs/install_linux.md

After installation, run: gh auth login
`,
  claude: `
❌ Claude Code CLI is not installed.

Installation instructions:
  Visit: https://docs.anthropic.com/en/docs/claude-code

After installation, authenticate with your API key.
`,
};

export const AUTH_MESSAGES = {
  gh: `
❌ GitHub CLI is installed but not authenticated.

Run the following command to authenticate:
  gh auth login

Follow the prompts to complete authentication.
`,
  claude: `
❌ Claude Code CLI is installed but not authenticated.

Run the following command to authenticate:
  claude auth login

Follow the prompts to complete authentication.
`,
};
