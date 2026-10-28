/**
 * Admin routes.
 *
 * The two guards are applied once, to the whole router, rather than being
 * repeated on each route. Any route added below is therefore protected by
 * default, which is the safer way round: forgetting to add a guard would be
 * a security hole, whereas forgetting to remove one is merely inconvenient.
 */
import { Router } from 'express';
import { param, query, body } from 'express-validator';
import {
  getStats,
  listUsers,
  getUser,
  updateUserStatus,
  deleteUser,
  listAllCVs,
  getAnyCV,
  deleteAnyCV,
  listActivity,
} from '../controllers/admin.controller.js';
import {
  listCompanies,
  getCompanyForReview,
  reviewCompany,
  COMPANY_STATUSES,
} from '../controllers/adminCompany.controller.js';
import { getReport, REPORT_TYPES } from '../controllers/adminReport.controller.js';
import { listAllTemplates, updateTemplate } from '../controllers/template.controller.js';
import {
  listAllContent,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  uploadContentImage,
} from '../controllers/content.controller.js';
import { uploadImage, handleUploadErrors } from '../middleware/upload.js';
import { CONTENT_TYPES, CONTENT_STATUSES } from '../models/Content.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { TEMPLATE_KEYS } from '../models/CV.js';
import { ACTIVITY_ACTIONS } from '../models/ActivityLog.js';

const router = Router();

router.use(requireAuth, requireAdmin);

/** Shared validators. */
const validId = param('id').isMongoId().withMessage('That id is not valid');

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1 to 100'),
];

// --- Dashboard -------------------------------------------------------------

router.get('/stats', asyncHandler(getStats));

// --- Users -----------------------------------------------------------------

router.get(
  '/users',
  [
    ...paginationRules,
    query('status').optional().isIn(['active', 'blocked']).withMessage('Unknown status filter'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search term is too long'),
  ],
  validate,
  asyncHandler(listUsers),
);

router.get('/users/:id', [validId], validate, asyncHandler(getUser));

router.patch(
  '/users/:id/status',
  [
    validId,
    body('status').isIn(['active', 'blocked']).withMessage('Status must be active or blocked'),
  ],
  validate,
  asyncHandler(updateUserStatus),
);

router.delete('/users/:id', [validId], validate, asyncHandler(deleteUser));

// --- CVs -------------------------------------------------------------------

router.get(
  '/cvs',
  [
    ...paginationRules,
    query('templateKey').optional().isIn(TEMPLATE_KEYS).withMessage('Unknown template'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search term is too long'),
  ],
  validate,
  asyncHandler(listAllCVs),
);

router.get('/cvs/:id', [validId], validate, asyncHandler(getAnyCV));
router.delete('/cvs/:id', [validId], validate, asyncHandler(deleteAnyCV));

// --- Company review --------------------------------------------------------

router.get(
  '/companies',
  [
    ...paginationRules,
    query('status').optional().isIn(COMPANY_STATUSES).withMessage('Unknown status'),
    query('search').optional().trim().isLength({ max: 120 }),
  ],
  validate,
  asyncHandler(listCompanies),
);

router.get('/companies/:id', [validId], validate, asyncHandler(getCompanyForReview));

router.patch(
  '/companies/:id/status',
  [
    validId,
    body('status')
      .isIn(['approved', 'rejected'])
      .withMessage('Status must be approved or rejected'),
    body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason is too long'),
  ],
  validate,
  asyncHandler(reviewCompany),
);

// --- Templates -------------------------------------------------------------

router.get('/templates', asyncHandler(listAllTemplates));

router.patch(
  '/templates/:id',
  [
    validId,
    body('isActive').optional().isBoolean().withMessage('Active must be yes or no'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('Name must be between 2 and 60 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Description must be at most 300 characters'),
    body('sortOrder').optional().isInt({ min: 0, max: 99 }).withMessage('Order must be 0 to 99'),
  ],
  validate,
  asyncHandler(updateTemplate),
);

// --- Pages and blog posts --------------------------------------------------

/** Shared body rules. Required on create, optional on edit. */
const contentRules = (isCreate) => [
  body('type').optional().isIn(CONTENT_TYPES).withMessage('Choose a page or a post'),
  body('title')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('Title must be between 2 and 160 characters'),
  // The body is a list of blocks whose rules depend on each block's
  // type, so it is checked in the controller rather than here.
  body('bodyHtml')
    [isCreate ? 'exists' : 'optional']()
    .bail()
    .isString()
    .withMessage('The body must be text'),
  body('coverImageUrl')
    .optional()
    .trim()
    .matches(/^(\/uploads\/[\w.-]+)?$/)
    .withMessage('The cover must be an uploaded image'),
  body('excerpt').optional().trim().isLength({ max: 300 }).withMessage('Summary is too long'),
  body('slug')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Address must be at most 80 characters'),
  body('status').optional().isIn(CONTENT_STATUSES).withMessage('Unknown status'),
  body('showInHeader').optional().isBoolean().withMessage('Header must be yes or no'),
  body('showInFooter').optional().isBoolean().withMessage('Footer must be yes or no'),
  body('navLabel').optional().trim().isLength({ max: 40 }).withMessage('Link text is too long'),
  body('sortOrder').optional().isInt({ min: 0, max: 99 }).withMessage('Order must be 0 to 99'),

  // Lengths are checked rather than trusted: these end up in meta tags
  // and a 500-character description helps nobody. The controller
  // trims, de-duplicates and caps the keywords themselves.
  body('seo.metaTitle')
    .optional()
    .trim()
    .isLength({ max: 70 })
    .withMessage('Search title must be at most 70 characters'),
  body('seo.metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Search description must be at most 160 characters'),
  body('seo.keywords').optional().isArray({ max: 30 }).withMessage('Too many keywords'),
];

router.get(
  '/content',
  [
    ...paginationRules,
    query('type').optional().isIn(CONTENT_TYPES).withMessage('Unknown type'),
    query('status').optional().isIn(CONTENT_STATUSES).withMessage('Unknown status'),
    query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term is too long'),
  ],
  validate,
  asyncHandler(listAllContent),
);

// Declared before `/content/:id`, or "images" is read as an id.
router.post(
  '/content/images',
  uploadImage.single('image'),
  handleUploadErrors,
  asyncHandler(uploadContentImage),
);

router.get('/content/:id', [validId], validate, asyncHandler(getContent));
router.post('/content', contentRules(true), validate, asyncHandler(createContent));
router.patch('/content/:id', [validId, ...contentRules(false)], validate, asyncHandler(updateContent));
router.delete('/content/:id', [validId], validate, asyncHandler(deleteContent));

// --- Reports ---------------------------------------------------------------

/**
 * One route for every report and both formats. Without `format` it
 * returns JSON for the on-screen preview; with one it sends the file, so
 * what is previewed and what is downloaded are the same figures.
 */
router.get(
  '/reports/:type',
  [
    param('type').isIn(REPORT_TYPES).withMessage('Unknown report'),
    query('from').optional().isISO8601().withMessage('From must be a date'),
    query('to').optional().isISO8601().withMessage('To must be a date'),
    query('format').optional().isIn(['xlsx', 'pdf']).withMessage('Format must be xlsx or pdf'),
  ],
  validate,
  asyncHandler(getReport),
);

// --- Activity log ----------------------------------------------------------

router.get(
  '/activity',
  [
    ...paginationRules,
    query('action').optional().isIn(ACTIVITY_ACTIONS).withMessage('Unknown action'),
  ],
  validate,
  asyncHandler(listActivity),
);

export default router;
