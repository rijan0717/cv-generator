/**
 * CV–Job Match routes. Every route requires a session, and the controller
 * checks that the CV being analysed belongs to the caller.
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createJobMatch,
  listJobMatches,
  getJobMatch,
  deleteJobMatch,
  scoreJobsForBoard,
} from '../controllers/jobMatch.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { jobMatchLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  jobMatchLimiter,
  [
    body('cvId').isMongoId().withMessage('Please choose one of your CVs'),

    body('jobId').optional().isMongoId().withMessage('That job id is not valid'),

    // Only required when no job was chosen from the board. 50 characters is
    // the point below which there is not enough text to weight anything.
    body('jobDescription')
      .if(body('jobId').not().exists({ values: 'falsy' }))
      .trim()
      .isLength({ min: 50, max: 8000 })
      .withMessage('Paste a job description of between 50 and 8000 characters'),

    body('jobTitle')
      .optional()
      .trim()
      .isLength({ max: 140 })
      .withMessage('Job title must be at most 140 characters'),
  ],
  validate,
  asyncHandler(createJobMatch),
);

/**
 * Declared before `/:id`, or Express would read "scores" as an id.
 *
 * A POST rather than a GET because the list of job ids is a body, not
 * something that belongs in a URL — a page of the board would otherwise
 * make a query string of a dozen ObjectIds.
 */
router.post(
  '/scores',
  [
    body('jobIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Send between 1 and 50 job ids'),
    body('jobIds.*').isMongoId().withMessage('That job id is not valid'),
  ],
  validate,
  asyncHandler(scoreJobsForBoard),
);

router.get('/', asyncHandler(listJobMatches));

const validId = param('id').isMongoId().withMessage('That analysis id is not valid');

router.get('/:id', [validId], validate, asyncHandler(getJobMatch));
router.delete('/:id', [validId], validate, asyncHandler(deleteJobMatch));

export default router;
