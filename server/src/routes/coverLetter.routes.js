/**
 * Cover letter routes. Every route requires a session, and the controller
 * checks that the CV being written from belongs to the caller.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { previewCoverLetter } from '../controllers/coverLetter.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/preview',
  [
    body('cvId').isMongoId().withMessage('Please choose one of your CVs'),

    body('companyName').trim().isLength({ min: 1, max: 140 }).withMessage('Enter the company name'),

    body('jobTitle')
      .optional()
      .trim()
      .isLength({ max: 140 })
      .withMessage('Job title must be at most 140 characters'),

    // Optional, but when given it has to be long enough to weight. The
    // same floor as the match analyser, for the same reason: below about
    // 50 characters there is not enough text to tell anything from.
    body('jobDescription')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 50, max: 8000 })
      .withMessage('Paste a job description of between 50 and 8000 characters'),

    body('recipientName')
      .optional()
      .trim()
      .isLength({ max: 120 })
      .withMessage('Recipient name must be at most 120 characters'),
  ],
  validate,
  asyncHandler(previewCoverLetter),
);

export default router;
