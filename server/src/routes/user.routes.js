/**
 * Profile routes. Every route here requires a session, and every one acts on
 * the logged-in user only.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import {
  updateProfile,
  changePassword,
  uploadAvatar,
  setAccountType,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImage, handleUploadErrors } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.put(
  '/me',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters'),
  ],
  validate,
  asyncHandler(updateProfile),
);

router.put(
  '/me/password',
  [
    body('currentPassword').notEmpty().withMessage('Please enter your current password'),
    body('newPassword')
      .isString()
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long'),
    body('newPassword')
      .matches(/[A-Za-z]/)
      .withMessage('New password must contain at least one letter'),
    body('newPassword')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number'),
  ],
  validate,
  asyncHandler(changePassword),
);

// The one-time "I'm an employer / I'm a job seeker" choice.
router.patch(
  '/me/account-type',
  [
    body('accountType')
      .isIn(['jobseeker', 'employer'])
      .withMessage('Choose either job seeker or employer'),
  ],
  validate,
  asyncHandler(setAccountType),
);

router.post(
  '/me/avatar',
  uploadImage.single('avatar'),
  handleUploadErrors,
  asyncHandler(uploadAvatar),
);

export default router;
