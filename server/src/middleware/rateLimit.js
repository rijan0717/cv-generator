/**
 * Rate limiters.
 *
 * These protect the account endpoints from password guessing and from someone
 * creating accounts in bulk. Limits are disabled while testing, otherwise a
 * test suite that logs in repeatedly would start failing part-way through.
 */
import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env.js';

/** A limiter that does nothing, used in the test environment. */
const passThrough = (_req, _res, next) => next();

/**
 * Limits login attempts to 10 per 15 minutes per IP address.
 * Successful logins are not counted, so a legitimate user who signs in
 * several times is never locked out.
 */
export const loginLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      skipSuccessfulRequests: true,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        success: false,
        data: null,
        message: 'Too many login attempts. Please try again in 15 minutes',
      },
    });

/** Limits new accounts to 5 per hour per IP address. */
export const registerLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        success: false,
        data: null,
        message: 'Too many accounts created from this address. Please try again later',
      },
    });
