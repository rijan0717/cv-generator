/**
 * Interview preparation routes, user side.
 *
 * Everything here requires a signed-in user. Browsing positions could
 * arguably be public, but study mode gives away every answer, and
 * splitting the two would mean one guard on some routes and not others —
 * the arrangement most likely to end with a guard missing from the one
 * route that needed it.
 */
import { Router } from 'express';
import { param, query, body } from 'express-validator';
import {
  listPositions,
  getPosition,
  getStudyQuestions,
  startExam,
  getExam,
  submitExam,
  listExams,
} from '../controllers/interview.controller.js';
import { INTERVIEW_LEVELS } from '../models/InterviewPosition.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/positions',
  [
    query('search').optional().trim().isLength({ max: 120 }).withMessage('Search term is too long'),
    query('level').optional().isIn(INTERVIEW_LEVELS).withMessage('Unknown level'),
  ],
  validate,
  asyncHandler(listPositions),
);

router.get(
  '/positions/:slug',
  [param('slug').trim().isLength({ min: 1, max: 80 })],
  validate,
  asyncHandler(getPosition),
);

router.get(
  '/positions/:slug/study',
  [
    param('slug').trim().isLength({ min: 1, max: 80 }),
    query('level').isIn(INTERVIEW_LEVELS).withMessage('Choose a level'),
  ],
  validate,
  asyncHandler(getStudyQuestions),
);

router.get('/exams', asyncHandler(listExams));

router.post(
  '/exams',
  [
    body('positionId').isMongoId().withMessage('Invalid position'),
    // Optional: omitting it gives a mixed paper across every level,
    // which is what a real interview looks like.
    body('level').optional().isIn(INTERVIEW_LEVELS).withMessage('Unknown level'),
  ],
  validate,
  asyncHandler(startExam),
);

router.get(
  '/exams/:id',
  [param('id').isMongoId().withMessage('Invalid attempt')],
  validate,
  asyncHandler(getExam),
);

router.post(
  '/exams/:id/submit',
  [
    param('id').isMongoId().withMessage('Invalid attempt'),
    body('answers').isArray({ max: 50 }).withMessage('Answers must be a list'),
  ],
  validate,
  asyncHandler(submitExam),
);

export default router;
