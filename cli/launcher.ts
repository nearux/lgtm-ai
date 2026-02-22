import { spawn, ChildProcess } from 'node:child_process';

export async function launchServers(): Promise<void> {
  console.log('\n🚀 Starting servers...\n');

  const processes: ChildProcess[] = [];

  const backend = spawn('node', ['backend/dist/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'production' },
  });
  processes.push(backend);

  const frontend = spawn('pnpm', ['--filter', 'frontend', 'run', 'preview'], {
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
