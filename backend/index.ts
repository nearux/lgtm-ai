import express from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const PORT = 5051;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/projects', projectsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
