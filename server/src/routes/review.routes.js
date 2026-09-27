/**
 * Review routes.
 *
 * The listing is public, because the home page shows testimonials to
 * visitors who are not logged in. Everything else requires a session.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { listPublicReviews, getMyReview, saveReview } from '../controllers/review.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Public: the home page testimonials.
router.get('/', asyncHandler(listPublicReviews));

// Everything below needs a session.
router.use(requireAuth);

router.get('/mine', asyncHandler(getMyReview));

router.post(
  '/',
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Please choose a rating between 1 and 5 stars'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 400 })
      .withMessage('Please keep your comment under 400 characters'),
    body('context').optional().trim().isLength({ max: 120 }),
  ],
  validate,
  asyncHandler(saveReview),
);

export default router;
