import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import open from 'open';
import { FRONTEND_URL } from './utils/ports.js';

async function waitForBackend(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok || res.status < 500) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

export async function launchServers(): Promise<void> {
  console.log('\n🚀 Starting servers...\n');

  const processes: ChildProcess[] = [];

  const backendPath = join(__dirname, '../../backend/dist/index.js');
  const backend = spawn('node', [backendPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'production' },
  });
  processes.push(backend);

  // Poll until backend is ready, then open browser
  waitForBackend(FRONTEND_URL).then(() => {
    open(FRONTEND_URL);
  });

  const cleanup = () => {
    console.log('\n\n🛑 Shutting down servers...');
    processes.forEach((proc) => {
      if (proc && !proc.killed) {
        proc.kill();
      }
    });
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
