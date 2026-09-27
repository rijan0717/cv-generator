/**
 * Application routes.
 *
 * Every route requires a session, and the controller decides whether the
 * caller is the applicant, the employer or an admin. A CV snapshot holds
 * personal data, so nothing here is public.
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listMyApplications,
  getApplication,
  updateApplicationStatus,
  downloadApplicationCV,
} from '../controllers/application.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { APPLICATION_STATUSES } from '../models/Application.js';

const router = Router();

router.use(requireAuth);

const validId = param('id').isMongoId().withMessage('That application id is not valid');

router.get('/mine', asyncHandler(listMyApplications));

router.get('/:id', [validId], validate, asyncHandler(getApplication));

router.patch(
  '/:id/status',
  [
    validId,
    body('status').isIn(APPLICATION_STATUSES).withMessage('Unknown status'),
    body('employerNote').optional().trim().isLength({ max: 2000 }),
  ],
  validate,
  asyncHandler(updateApplicationStatus),
);

router.get(
  '/:id/download/:format',
  [validId, param('format').isIn(['pdf', 'docx']).withMessage('Format must be pdf or docx')],
  validate,
  asyncHandler(downloadApplicationCV),
);

export default router;
