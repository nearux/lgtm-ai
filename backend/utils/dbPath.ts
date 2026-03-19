import path from 'node:path';
import os from 'node:os';

export function resolveDbPath(): string {
  const defaultDbPath = path.join(os.homedir(), '.lgtmai', 'lgtmai.db');
  const rawPath = process.env.DB_PATH ?? defaultDbPath;
  const expandedPath = rawPath.replace(/^~/, os.homedir());
  return path.resolve(expandedPath);
}
