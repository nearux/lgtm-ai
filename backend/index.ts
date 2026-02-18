import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { RegisterRoutes } from './routes/routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const swaggerDocument = JSON.parse(
  readFileSync(join(__dirname, 'public', 'swagger.json'), 'utf-8')
);

const app = express();
const PORT = 5051;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

RegisterRoutes(app);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📖 Swagger docs available at http://localhost:${PORT}/api-docs`);
});
