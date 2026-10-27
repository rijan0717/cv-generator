/**
 * Candidate directory routes.
 *
 * Both guards are applied to the whole router rather than route by route,
 * for the same reason the admin router does it: a route added here later
 * is protected by default, and forgetting to add a guard would expose
 * personal data.
 */
import { Router } from 'express';
import { param, query } from 'express-validator';
import {
  listTalent,
  getTalentProfile,
  getTalentFilters,
} from '../controllers/talent.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApprovedEmployer } from '../middleware/talentAccess.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { INDUSTRY_VALUES, EMPLOYMENT_TYPE_VALUES } from '../data/industries.js';

const router = Router();

router.use(requireAuth, asyncHandler(requireApprovedEmployer));

router.get('/filters', getTalentFilters);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1 to 100'),
    query('industry').optional().isIn(INDUSTRY_VALUES).withMessage('Unknown industry'),
    query('employmentType')
      .optional()
      .isIn(EMPLOYMENT_TYPE_VALUES)
      .withMessage('Unknown employment type'),
    query('openToWork').optional().isIn(['true', 'false']).withMessage('Unknown availability'),
    // The controller ignores this for anyone who is not an admin, but it is
    // still validated so a typo gets a message rather than silently
    // falling back to the job seeker list.
    query('accountType')
      .optional()
      .isIn(['jobseeker', 'employer'])
      .withMessage('Unknown account type'),
    query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term is too long'),
  ],
  validate,
  asyncHandler(listTalent),
);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('That id is not valid')],
  validate,
  asyncHandler(getTalentProfile),
);

export default router;
