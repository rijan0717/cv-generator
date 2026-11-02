/**
 * The public "rewrite your CV" funnel: `/api/public/rewrite`.
 *
 * The only router in the project where the first two routes take no
 * session at all. That is the point of the feature — a visitor who has
 * never signed up drops their CV, sees which jobs it fits and what a
 * rewrite would do to it — but it means this file is the one place where
 * the usual protection has to be re-stated rather than assumed:
 *
 *   - Every route carries `publicRewriteLimiter`, per IP.
 *   - The session token is checked on every call, so the two open routes
 *     are only open to someone who has already uploaded a file.
 *   - `claim` is behind `requireAuth`, because that is the gate.
 */
import { Router } from 'express';
import { param } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { publicRewriteLimiter } from '../middleware/rateLimit.js';
import { uploadDocument, handleUploadErrors } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  uploadForRewrite,
  rewriteForJob,
  claimRewrite,
} from '../controllers/publicRewrite.controller.js';

const router = Router();

/**
 * The session token. Checked for shape before it reaches the database,
 * so a junk value is a 400 rather than a lookup.
 */
const validToken = param('token')
  .isString()
  .isLength({ min: 20, max: 100 })
  .withMessage('That rewrite link is not valid');

router.post(
  '/upload',
  publicRewriteLimiter,
  uploadDocument.single('document'),
  handleUploadErrors,
  asyncHandler(uploadForRewrite),
);

router.post(
  '/:token/job/:jobId',
  publicRewriteLimiter,
  [validToken, param('jobId').isMongoId().withMessage('That job id is not valid')],
  validate,
  asyncHandler(rewriteForJob),
);

router.post(
  '/:token/claim',
  publicRewriteLimiter,
  requireAuth,
  [validToken],
  validate,
  asyncHandler(claimRewrite),
);

export default router;
