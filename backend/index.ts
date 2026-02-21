import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RegisterRoutes } from './routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server running on http://0.0.0.0:${PORT}`);
});
