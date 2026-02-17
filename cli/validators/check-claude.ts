import { exec } from 'child_process';
import { promisify } from 'util';
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
    return {
      success: false,
      message: 'Claude Code CLI is not installed.',
      installUrl: 'https://docs.anthropic.com/en/docs/claude-code',
    };
  }

  const isAuthenticated = await isClaudeCLIAuthenticated();
  if (!isAuthenticated) {
    return {
      success: false,
      message: 'Claude Code CLI might not be configured properly.',
      authUrl: 'Please ensure Claude Code CLI is set up correctly',
    };
  }

  return { success: true };
}
