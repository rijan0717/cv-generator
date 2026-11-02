/**
 * Site search routes. Public: the header search works before signing in.
 */
import { Router } from 'express';
import { query } from 'express-validator';
import { search, SEARCH_TYPES } from '../controllers/search.controller.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  [
    query('q')
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search for 2 to 100 characters'),
    query('type').optional().isIn(SEARCH_TYPES).withMessage('Unknown search type'),
  ],
  validate,
  asyncHandler(search),
);

export default router;
