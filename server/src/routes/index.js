/**
 * Mounts every feature router under the `/api` prefix. New routers added in
 * later phases (cvs, job-match, templates, admin) are registered here.
 */
import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import cvRoutes from './cv.routes.js';
import adminRoutes from './admin.routes.js';
import reviewRoutes from './review.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cvs', cvRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);

export default router;
