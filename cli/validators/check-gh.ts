import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { isCommandInstalled, ValidationResult } from './utils.js';

const execAsync = promisify(exec);

async function isGitHubCLIAuthenticated(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('gh auth status');
    return stdout.includes('Logged in');
  } catch {
    return false;
  }
}

export async function checkGitHubCLI(): Promise<ValidationResult> {
  const isInstalled = await isCommandInstalled('gh');
  if (!isInstalled) {
    return { success: false, needsInstall: true };
  }

  const isAuthenticated = await isGitHubCLIAuthenticated();
  if (!isAuthenticated) {
    return { success: false, needsAuth: true };
  }

  return { success: true };
}
