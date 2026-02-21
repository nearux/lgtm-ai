import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { isCommandInstalled, ValidationResult } from './utils.js';

const execAsync = promisify(exec);

async function isClaudeCLIAuthenticated(): Promise<boolean> {
  try {
    await execAsync('claude --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function checkClaudeCLI(): Promise<ValidationResult> {
  const isInstalled = await isCommandInstalled('claude');
  if (!isInstalled) {
    return { success: false, needsInstall: true };
  }

  const isAuthenticated = await isClaudeCLIAuthenticated();
  if (!isAuthenticated) {
    return { success: false, needsAuth: true };
  }

  return { success: true };
}
