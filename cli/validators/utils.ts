import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ValidationResult {
  success: boolean;
  needsInstall?: boolean;
  needsAuth?: boolean;
}

export async function isCommandInstalled(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}
