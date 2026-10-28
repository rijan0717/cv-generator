/**
 * The public blog and pages.
 *
 * No session required: this is the part of the site a visitor reads
 * before deciding whether to sign up, and the header and footer of
 * every page are built from it.
 */
import { Router } from 'express';
import { param, query } from 'express-validator';
import { getNavigation, listPosts, getBySlug } from '../controllers/content.controller.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Both declared before `/:slug`, or Express would read "nav" and
// "posts" as slugs and look for pages by those names.
router.get('/nav', asyncHandler(getNavigation));

router.get(
  '/posts',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1 to 50'),
  ],
  validate,
  asyncHandler(listPosts),
);

router.get(
  '/:slug',
  [
    param('slug')
      .matches(/^[a-z0-9-]{1,80}$/)
      .withMessage('That address is not valid'),
  ],
  validate,
  asyncHandler(getBySlug),
);

export default router;
