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

/**
 * Limits job-match analyses to 20 per 15 minutes per IP address.
 *
 * Unlike the account limiters this is not about abuse but about cost: one
 * analysis processes the whole seed corpus plus every advert analysed
 * before it, which is the most CPU-intensive request the server serves.
 */
export const jobMatchLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        success: false,
        data: null,
        message: 'Too many analyses. Please try again in a few minutes',
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

/**
 * Limits the public rewrite funnel to 6 attempts per hour per IP.
 *
 * Tighter than `jobMatchLimiter` on purpose. That one protects a
 * signed-in route, where an abusive caller has an account to block; this
 * one is open to anyone passing, and each call reads an uploaded file,
 * weights every open advert against it and then runs a full rewrite —
 * the most expensive sequence the server offers, behind no session at
 * all. Six is enough to try it, fix a typo and try again; it is not
 * enough to use the site as a free rewriting API.
 */
export const publicRewriteLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 6,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        success: false,
        data: null,
        message:
          'That is as many rewrites as we can run for one visitor in an hour. ' +
          'Create a free account to carry on without the limit.',
      },
    });

/**
 * Limits mail operations to 20 per hour per account.
 *
 * Unlike the others this one guards something that leaves the building.
 * A draft is harmless, but `/gmail/send` puts a real email in a real
 * stranger's inbox under the user's own name, and a loop that got loose
 * would spend their reputation rather than our CPU. Twenty is far above
 * what a person applying for jobs needs in an hour and far below what
 * would embarrass them.
 *
 * Keyed by user rather than IP: these routes require a session, and two
 * flatmates applying for jobs over one connection should not throttle
 * each other.
 */
export const gmailMailLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 20,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      keyGenerator: (req) => String(req.user?._id ?? req.ip),
      message: {
        success: false,
        data: null,
        message: 'That is as many emails as we can handle in an hour. Please try again later.',
      },
    });
