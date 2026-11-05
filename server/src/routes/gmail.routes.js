/**
 * Gmail routes: the connection, and what it is for.
 *
 * `/callback` is the only one without `requireAuth`, because Google calls it
 * and cannot present our session cookie reliably. Its protection is the
 * signed `state` parameter instead, checked inside the controller.
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  startConnect,
  handleCallback,
  getStatus,
  disconnect,
} from '../controllers/gmail.controller.js';
import {
  createDraft,
  sendMail,
  listDrafts,
  sendExistingDraft,
  deleteDraft,
  listSent,
} from '../controllers/gmailMail.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { gmailMailLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/connect', requireAuth, startConnect);
router.get('/callback', asyncHandler(handleCallback));
router.get('/status', requireAuth, asyncHandler(getStatus));
router.delete('/disconnect', requireAuth, asyncHandler(disconnect));

/**
 * What a draft and a send have in common.
 *
 * The body is capped well above a cover letter's length but far below
 * anything that would be worth posting through someone else's mailbox.
 */
const messageRules = [
  body('cvId').isMongoId().withMessage('Please choose one of your CVs'),

  body('to').trim().isEmail().withMessage('Enter a valid recipient email address'),

  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Enter a subject of at most 200 characters'),

  body('body')
    .trim()
    .isLength({ min: 1, max: 20000 })
    .withMessage('The letter must not be empty, and must be under 20000 characters'),

  body('attachCv').optional().isBoolean().withMessage('attachCv must be true or false'),
];

router.get('/drafts', requireAuth, asyncHandler(listDrafts));

router.post(
  '/drafts',
  requireAuth,
  gmailMailLimiter,
  messageRules,
  validate,
  asyncHandler(createDraft),
);

/**
 * Sending is the one route here that cannot be undone, so it carries a
 * guard the draft route does not: an explicit `confirm`, checked again in
 * the controller. The dialog in the UI stops a misclick; this stops
 * anything that arrives without one.
 */
router.post(
  '/send',
  requireAuth,
  gmailMailLimiter,
  [
    ...messageRules,
    // A strict `=== true`, not a truthy check: the string "false" and the
    // number 0 are both truthy mistakes waiting to send somebody's mail.
    body('confirm')
      .custom((value) => value === true)
      .withMessage('Sending must be confirmed'),
  ],
  validate,
  asyncHandler(sendMail),
);

/**
 * What was already sent from here.
 *
 * Read from our own activity log rather than from Gmail: the scope we
 * hold cannot see the Sent folder, and buying one that could — only to
 * list what we already recorded sending — would be a second restricted
 * scope for nothing.
 */
router.get('/sent', requireAuth, asyncHandler(listSent));

/** A Gmail draft id, which is an opaque string rather than a Mongo id. */
const validDraftId = param('id')
  .trim()
  .isLength({ min: 1, max: 200 })
  .withMessage('That draft id is not valid');

router.post(
  '/drafts/:id/send',
  requireAuth,
  gmailMailLimiter,
  [
    validDraftId,
    body('confirm')
      .custom((value) => value === true)
      .withMessage('Sending must be confirmed'),
  ],
  validate,
  asyncHandler(sendExistingDraft),
);

router.delete('/drafts/:id', requireAuth, [validDraftId], validate, asyncHandler(deleteDraft));

export default router;
