#!/usr/bin/env node

import { checkGitHubCLI } from './validators/check-gh.js';
import { checkClaudeCLI } from './validators/check-claude.js';
import { launchServers } from './launcher.js';
import { INSTALL_MESSAGES, AUTH_MESSAGES } from './utils/messages.js';

const VERSION = '0.0.1';

function displayBanner(): void {
  console.log(`
  _     ____ _____ __  __      _    ___
 | |   / ___|_   _|  \\/  |    / \\  |_ _|
 | |  | |  _  | | | |\\/| |   / _ \\  | |
 | |__| |_| | | | | |  | |  / ___ \\ | |
 |_____\\____| |_| |_|  |_| /_/   \\_\\___|

  Auto-apply PR reviews with Claude Code

  Version: ${VERSION}
  `);
}

export async function main(): Promise<void> {
  displayBanner();

  console.log('Validating required tools...\n');

  const ghResult = await checkGitHubCLI();
  if (!ghResult.success) {
    if (ghResult.needsInstall) {
      console.error('❌ GitHub CLI (gh) is not installed.');
      console.log(INSTALL_MESSAGES.gh);
    }
    if (ghResult.needsAuth) {
      console.error('❌ GitHub CLI is not authenticated.');
      console.log(AUTH_MESSAGES.gh);
    }
    process.exit(1);
  }
  console.log('✅ GitHub CLI: OK');

  const claudeResult = await checkClaudeCLI();
  if (!claudeResult.success) {
    if (claudeResult.needsInstall) {
      console.error('❌ Claude Code CLI is not installed.');
      console.log(INSTALL_MESSAGES.claude);
    }
    if (claudeResult.needsAuth) {
      console.error('❌ Claude Code CLI might not be configured properly.');
      console.log(AUTH_MESSAGES.claude);
    }
    process.exit(1);
  }
  console.log('✅ Claude Code CLI: OK');

  console.log('\n✨ All checks passed!\n');

  await launchServers();
}

// CommonJS compatibility
if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
