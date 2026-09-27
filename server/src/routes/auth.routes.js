/**
 * Authentication routes, with their validation rules and rate limits.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, logout, getCurrentUser } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * Password policy from the requirements: at least 8 characters, containing
 * at least one letter and at least one number. It is expressed as two
 * separate checks so the user is told precisely what is missing.
 */
const passwordRules = (field) => [
  body(field)
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body(field)
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter'),
  body(field).matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

router.post(
  '/register',
  registerLimiter,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail({ gmail_remove_dots: false }),
    ...passwordRules('password'),
  ],
  validate,
  asyncHandler(register),
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').trim().isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Please enter your password'),
  ],
  validate,
  asyncHandler(login),
);

router.post('/logout', logout);

router.get('/me', requireAuth, getCurrentUser);

export default router;
