import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';

export async function launchServers(): Promise<void> {
  console.log('\n🚀 Starting servers...\n');

  const processes: ChildProcess[] = [];

  const backendPath = join(__dirname, '../../backend/dist/index.js');
  const backend = spawn('node', [backendPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'production' },
  });
  processes.push(backend);

  const viteBin = join(__dirname, '../../frontend/node_modules/.bin/vite');
  const frontendRoot = join(__dirname, '../../frontend');
  const frontend = spawn(viteBin, ['preview', frontendRoot], {
    stdio: 'inherit',
  });
  processes.push(frontend);

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
