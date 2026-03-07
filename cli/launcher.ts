import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { FRONTEND_URL } from './utils/ports.js';

export async function launchServers(): Promise<void> {
  console.log('\n🚀 Starting servers...\n');

  const processes: ChildProcess[] = [];

  const backendPath = join(__dirname, '../../backend/dist/index.js');
  const backend = spawn('node', [backendPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'production' },
  });
  processes.push(backend);

  // Wait for backend to be ready, then open browser
  setTimeout(async () => {
    const { default: open } = await import('open');
    open(FRONTEND_URL);
  }, 2000);

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
