import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WebSocketServer } from 'ws';
import { RegisterRoutes } from './routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { handleClaudeWebSocket } from './controllers/ClaudeWSController.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5051;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = await import('swagger-ui-express');
  const { readFileSync } = await import('node:fs');
  const swaggerDocument = JSON.parse(
    readFileSync(join(__dirname, 'public', 'swagger.json'), 'utf-8')
  );
  swaggerDocument.servers = [{ url: '/' }];
  app.use(
    '/api-docs',
    swaggerUi.default.serve,
    swaggerUi.default.setup(swaggerDocument)
  );
  console.log(`📖 Swagger docs available at http://0.0.0.0:${PORT}/api-docs`);
}

RegisterRoutes(app);

app.use(errorHandler);

const httpServer = createServer(app);

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
