/**
 * Company routes. The public profile is open; managing a company is not.
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getMyCompany,
  createCompany,
  updateMyCompany,
  uploadLogo,
  removeLogo,
  getCompany,
  uploadDocument,
  downloadDocument,
} from '../controllers/company.controller.js';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { requireAccountType } from '../middleware/role.js';
import { uploadImage, uploadCompanyDocument } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/** Shared rules. `name` is required on create, optional on update. */
const companyRules = (isCreate) => [
  body('name')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Company name must be between 2 and 120 characters'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('website').optional().trim().isLength({ max: 200 }),
  body('location')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Please give the company location'),
  body('industry').optional().trim().isLength({ max: 80 }),

  // The details the admin verifies. Required when the company is created;
  // optional on an edit, but never allowed to be emptied.
  body('registrationNumber')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .trim()
    .isLength({ min: 3, max: 60 })
    .withMessage('Please give the registration / PAN / VAT number'),
  body('phone')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .trim()
    .matches(/^\+?[0-9\s-]{7,20}$/)
    .withMessage('Please give a valid phone number'),
  body('email')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please give a valid company email')
    .normalizeEmail(),
];

/** Turns a too-large registration document into a clear 400. */
function documentUploadErrors(err, _req, _res, next) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return next(ApiError.badRequest('The registration document must be smaller than 5 MB'));
  }
  if (err instanceof multer.MulterError) return next(ApiError.badRequest(err.message));
  next(err);
}

/** Company management belongs to employer accounts (and admins). */
const employerOnly = [requireAuth, requireAccountType('employer')];

// Declared before /:id so "mine" is not read as an id.
router.get('/mine', ...employerOnly, asyncHandler(getMyCompany));
router.post('/', ...employerOnly, companyRules(true), validate, asyncHandler(createCompany));
router.put('/mine', ...employerOnly, companyRules(false), validate, asyncHandler(updateMyCompany));

// The registration certificate: private, uploaded by the owner and read
// only by the owner or an admin.
router.post(
  '/mine/document',
  ...employerOnly,
  uploadCompanyDocument.single('document'),
  documentUploadErrors,
  asyncHandler(uploadDocument),
);
router.get(
  '/:id/document',
  requireAuth,
  [param('id').isMongoId().withMessage('That company id is not valid')],
  validate,
  asyncHandler(downloadDocument),
);

// The logo is the one part of a company profile jobseekers always see, so
// it gets its own endpoint rather than riding along with the text fields:
// a multipart upload and a JSON patch have nothing in common.
router.post('/mine/logo', ...employerOnly, uploadImage.single('logo'), asyncHandler(uploadLogo));
router.delete('/mine/logo', ...employerOnly, asyncHandler(removeLogo));

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('That company id is not valid')],
  validate,
  asyncHandler(getCompany),
);

export default router;
