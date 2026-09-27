/**
 * Mounts every feature router under the `/api` prefix. New routers added in
 * later phases (auth, cvs, job-match, templates, admin) are registered here.
 */
import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/health', healthRoutes);

export default router;
