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
import { INDUSTRY_VALUES, EMPLOYMENT_TYPE_VALUES } from '../data/industries.js';

const router = Router();

router.use(requireAuth);

router.put(
  '/me',
  [
    // Optional, because the candidate profile form below posts to the same
    // route and sends only its own fields. The controller leaves the name
    // alone when it is not in the body.
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters'),

    // The candidate profile. Every field is optional, because the name and
    // the profile are separate forms and each sends only its own fields,
    // but anything that is sent is checked.
    body('jobSeekerProfile.position')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Position must be at most 100 characters'),
    body('jobSeekerProfile.industry')
      .optional()
      .isIn([...INDUSTRY_VALUES, ''])
      .withMessage('Please choose an industry from the list'),
    body('jobSeekerProfile.yearsExperience')
      .optional()
      .isInt({ min: 0, max: 60 })
      .withMessage('Years of experience must be between 0 and 60'),
    body('jobSeekerProfile.openToWork')
      .optional()
      .isBoolean()
      .withMessage('Open to work must be yes or no'),
    body('jobSeekerProfile.employmentTypes')
      .optional()
      .isArray({ max: EMPLOYMENT_TYPE_VALUES.length })
      .withMessage('Please choose from the listed kinds of work'),
    body('jobSeekerProfile.employmentTypes.*')
      .isIn(EMPLOYMENT_TYPE_VALUES)
      .withMessage('Unknown kind of work'),
    body('jobSeekerProfile.location')
      .optional()
      .trim()
      .isLength({ max: 120 })
      .withMessage('Location must be at most 120 characters'),
    body('jobSeekerProfile.about')
      .optional()
      .trim()
      .isLength({ max: 600 })
      .withMessage('About must be at most 600 characters'),
  ],
  validate,
  asyncHandler(updateProfile),
);

router.put(
  '/me/password',
  [
    // Not asked of a Google-only account, which has no password yet.
    body('currentPassword')
      .if((_value, { req }) => req.user.hasPassword !== false)
      .notEmpty()
      .withMessage('Please enter your current password'),
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
