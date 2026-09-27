/**
 * Admin routes.
 *
 * The two guards are applied once, to the whole router, rather than being
 * repeated on each route. Any route added below is therefore protected by
 * default, which is the safer way round: forgetting to add a guard would be
 * a security hole, whereas forgetting to remove one is merely inconvenient.
 */
import { Router } from 'express';
import { param, query, body } from 'express-validator';
import {
  getStats,
  listUsers,
  getUser,
  updateUserStatus,
  deleteUser,
  listAllCVs,
  getAnyCV,
  deleteAnyCV,
  listActivity,
} from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { TEMPLATE_KEYS } from '../models/CV.js';
import { ACTIVITY_ACTIONS } from '../models/ActivityLog.js';

const router = Router();

router.use(requireAuth, requireAdmin);

/** Shared validators. */
const validId = param('id').isMongoId().withMessage('That id is not valid');

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1 to 100'),
];

// --- Dashboard -------------------------------------------------------------

router.get('/stats', asyncHandler(getStats));

// --- Users -----------------------------------------------------------------

router.get(
  '/users',
  [
    ...paginationRules,
    query('status').optional().isIn(['active', 'blocked']).withMessage('Unknown status filter'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search term is too long'),
  ],
  validate,
  asyncHandler(listUsers),
);

router.get('/users/:id', [validId], validate, asyncHandler(getUser));

router.patch(
  '/users/:id/status',
  [
    validId,
    body('status').isIn(['active', 'blocked']).withMessage('Status must be active or blocked'),
  ],
  validate,
  asyncHandler(updateUserStatus),
);

router.delete('/users/:id', [validId], validate, asyncHandler(deleteUser));

// --- CVs -------------------------------------------------------------------

router.get(
  '/cvs',
  [
    ...paginationRules,
    query('templateKey').optional().isIn(TEMPLATE_KEYS).withMessage('Unknown template'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search term is too long'),
  ],
  validate,
  asyncHandler(listAllCVs),
);

router.get('/cvs/:id', [validId], validate, asyncHandler(getAnyCV));
router.delete('/cvs/:id', [validId], validate, asyncHandler(deleteAnyCV));

// --- Activity log ----------------------------------------------------------

router.get(
  '/activity',
  [
    ...paginationRules,
    query('action').optional().isIn(ACTIVITY_ACTIONS).withMessage('Unknown action'),
  ],
  validate,
  asyncHandler(listActivity),
);

export default router;
