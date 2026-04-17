import express, { type Express } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { RegisterRoutes } from './routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

type CreateAppOptions = {
  enableSwagger?: boolean;
};

export async function createApp(
  options: CreateAppOptions = {}
): Promise<Express> {
  const { enableSwagger = process.env.NODE_ENV !== 'production' } = options;
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (enableSwagger) {
    const swaggerUi = await import('swagger-ui-express');
    const { readFileSync } = await import('node:fs');
    const swaggerDocument = JSON.parse(
      readFileSync(join(__dirname, 'public', 'swagger.json'), 'utf-8')
    ) as Record<string, unknown>;
    swaggerDocument.servers = [{ url: '/' }];
    app.use(
      '/api-docs',
      swaggerUi.default.serve,
      swaggerUi.default.setup(swaggerDocument)
    );
  }

  RegisterRoutes(app);

  const frontendDist = join(__dirname, '../../frontend/dist');
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(join(frontendDist, 'index.html'));
    });
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  frontend/dist not found — UI will not be served');
  }

  app.use(errorHandler);

  return app;
}
