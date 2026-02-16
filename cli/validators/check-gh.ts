import { exec } from "child_process";
import { promisify } from "util";
import { isCommandInstalled, ValidationResult } from "./utils.js";

const execAsync = promisify(exec);

async function isGitHubCLIAuthenticated(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("gh auth status");
    return stdout.includes("Logged in");
  } catch {
    return false;
  }
}

export async function checkGitHubCLI(): Promise<ValidationResult> {
  const isInstalled = await isCommandInstalled("gh");
  if (!isInstalled) {
    return {
      success: false,
      message: "GitHub CLI (gh) is not installed.",
      installUrl: "https://cli.github.com/manual/installation",
    };
  }

  const isAuthenticated = await isGitHubCLIAuthenticated();
  if (!isAuthenticated) {
    return {
      success: false,
      message: "GitHub CLI is not authenticated.",
      authUrl: "Run: gh auth login",
    };
  }

  return { success: true };
}
