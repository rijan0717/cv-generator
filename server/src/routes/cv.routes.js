/**
 * CV routes. Every route requires a session, and the controller checks that
 * the CV belongs to the requesting user.
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listCVs,
  createCV,
  getCV,
  updateCV,
  deleteCV,
  duplicateCV,
  uploadPhoto,
} from '../controllers/cv.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImage, handleUploadErrors } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

/** Rejects a malformed id before it reaches the database. */
const validId = param('id').isMongoId().withMessage('That CV id is not valid');

router.get('/', asyncHandler(listCVs));

router.post(
  '/',
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Please give this CV a title of at most 100 characters'),
  ],
  validate,
  asyncHandler(createCV),
);

router.get('/:id', [validId], validate, asyncHandler(getCV));

router.put(
  '/:id',
  [
    validId,
    // Autosave sends partial bodies, so the title is only checked when it is
    // actually present.
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters'),
  ],
  validate,
  asyncHandler(updateCV),
);

router.delete('/:id', [validId], validate, asyncHandler(deleteCV));

router.post('/:id/duplicate', [validId], validate, asyncHandler(duplicateCV));

router.post(
  '/:id/photo',
  [validId],
  validate,
  uploadImage.single('photo'),
  handleUploadErrors,
  asyncHandler(uploadPhoto),
);

export default router;
