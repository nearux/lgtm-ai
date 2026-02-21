import { spawn, ChildProcess } from 'node:child_process';
import { FRONTEND_URL } from './utils/ports.js';
import open from 'open';

export async function launchServers(): Promise<void> {
  console.log('\n🚀 Starting servers...\n');

  const processes: ChildProcess[] = [];

  const backend = spawn('node', ['backend/dist/index.js'], {
    stdio: 'inherit',
  });
  processes.push(backend);

  const frontend = spawn('pnpm', ['--filter', 'frontend', 'run', 'preview'], {
    stdio: 'inherit',
  });
  processes.push(frontend);

  // Wait a bit for servers to start, then open browser
  setTimeout(async () => {
    console.log(`\n🌐 Opening browser at ${FRONTEND_URL}...\n`);
    try {
      await open(FRONTEND_URL);
    } catch (error) {
      console.log('Could not auto-open browser. Please visit:', FRONTEND_URL);
    }
  }, 3000);

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
