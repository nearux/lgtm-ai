import { Router } from 'express';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projects.js';

const router = Router();

router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
