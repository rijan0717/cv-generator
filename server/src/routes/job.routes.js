/**
 * Job board routes.
 *
 * Browsing is public; everything that acts on behalf of a user requires a
 * session. The public routes still run `optionalAuth`, so a signed-in
 * visitor gets their saved and applied flags without the route being
 * closed to everyone else.
 *
 * Route order matters here: `/mine/posted` and `/mine/saved` are declared
 * before `/:id`, or Express would match "mine" as an id.
 */
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  listJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  listMyJobs,
  saveJob,
  unsaveJob,
  listSavedJobs,
} from '../controllers/job.controller.js';
import { applyToJob, listJobApplications } from '../controllers/application.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { JOB_TYPES, WORK_MODES, JOB_STATUSES } from '../models/Job.js';

const router = Router();

const validId = param('id').isMongoId().withMessage('That job id is not valid');

/** Shared rules for creating and updating a job. */
const jobRules = (isCreate) => [
  body('title')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .trim()
    .isLength({ min: 3, max: 140 })
    .withMessage('Title must be between 3 and 140 characters'),
  body('description')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .trim()
    .isLength({ min: 20, max: 8000 })
    .withMessage('Description must be between 20 and 8000 characters'),
  body('jobType').optional().isIn(JOB_TYPES).withMessage('Unknown job type'),
  body('workMode').optional().isIn(WORK_MODES).withMessage('Unknown work mode'),
  body('status').optional().isIn(JOB_STATUSES).withMessage('Status must be open or closed'),
  body('skills').optional().isArray({ max: 30 }).withMessage('At most 30 skills'),
  body('closingDate').optional({ nullable: true }).isISO8601().withMessage('Invalid closing date'),
];

// --- Public -------------------------------------------------------------

router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('jobType').optional().isIn(JOB_TYPES),
    query('workMode').optional().isIn(WORK_MODES),
    query('search').optional().isLength({ max: 120 }),
    query('location').optional().isLength({ max: 120 }),
  ],
  validate,
  asyncHandler(listJobs),
);

// --- The caller's own lists, before the /:id route ------------------------

router.get('/mine/posted', requireAuth, asyncHandler(listMyJobs));
router.get('/mine/saved', requireAuth, asyncHandler(listSavedJobs));

// --- One job (public) -----------------------------------------------------

router.get('/:id', optionalAuth, [validId], validate, asyncHandler(getJob));

// --- Posting and managing -------------------------------------------------

router.post('/', requireAuth, jobRules(true), validate, asyncHandler(createJob));
router.put('/:id', requireAuth, [validId, ...jobRules(false)], validate, asyncHandler(updateJob));
router.delete('/:id', requireAuth, [validId], validate, asyncHandler(deleteJob));

// --- Saving ---------------------------------------------------------------

router.post('/:id/save', requireAuth, [validId], validate, asyncHandler(saveJob));
router.delete('/:id/save', requireAuth, [validId], validate, asyncHandler(unsaveJob));

// --- Applying -------------------------------------------------------------

router.post(
  '/:id/apply',
  requireAuth,
  [
    validId,
    body('cvId').isMongoId().withMessage('Please choose a CV to apply with'),
    body('coverLetter')
      .optional()
      .trim()
      .isLength({ max: 4000 })
      .withMessage('Cover letter must be at most 4000 characters'),
  ],
  validate,
  asyncHandler(applyToJob),
);

router.get(
  '/:id/applications',
  requireAuth,
  [validId],
  validate,
  asyncHandler(listJobApplications),
);

export default router;
