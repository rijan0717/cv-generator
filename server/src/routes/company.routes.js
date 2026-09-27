/**
 * Company routes. The public profile is open; managing a company is not.
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getMyCompany,
  createCompany,
  updateMyCompany,
  getCompany,
} from '../controllers/company.controller.js';
import { requireAuth } from '../middleware/auth.js';
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
  body('location').optional().trim().isLength({ max: 120 }),
  body('industry').optional().trim().isLength({ max: 80 }),
];

// Declared before /:id so "mine" is not read as an id.
router.get('/mine', requireAuth, asyncHandler(getMyCompany));
router.post('/', requireAuth, companyRules(true), validate, asyncHandler(createCompany));
router.put('/mine', requireAuth, companyRules(false), validate, asyncHandler(updateMyCompany));

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('That company id is not valid')],
  validate,
  asyncHandler(getCompany),
);

export default router;
