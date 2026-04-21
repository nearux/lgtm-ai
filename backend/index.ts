import 'reflect-metadata';
import './container.js';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { handleClaudeWebSocket } from './controllers/ClaudeWSController.js';
import { createApp } from './app.js';
import { runStartupMigrations } from './startup/runMigrations.js';

const PORT = Number(process.env.PORT ?? 5051);

await runStartupMigrations();

const app = await createApp();
const httpServer = createServer(app);

if (process.env.NODE_ENV !== 'production') {
  console.log(`📖 Swagger docs available at http://0.0.0.0:${PORT}/api-docs`);
}

const claudeWss = new WebSocketServer({ noServer: true });
claudeWss.on('connection', handleClaudeWebSocket);

httpServer.on('upgrade', (req, socket, head) => {
  if (req.url === '/api/claude/execute') {
    claudeWss.handleUpgrade(req, socket, head, (ws) => {
      claudeWss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://0.0.0.0:${PORT}/api/claude/execute`);
});
