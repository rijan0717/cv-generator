import mongoose from 'mongoose';
import { isProduction } from '../config/env.js';

/**
 * Central error-handling middleware. Every error in the application ends up
 * here, is translated into a safe HTTP status code and message, and is sent in
 * the standard `{ success, data, message }` response shape.
 *
 * @param {Error} err - The thrown or forwarded error.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details || [];

  // Mongoose: invalid ObjectId in a URL parameter.
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }

  // Mongoose: schema validation failed.
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // MongoDB: unique index violated (e.g. duplicate email).
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    message = `That ${field} is already in use`;
  }

  // Never leak internal details of an unexpected error in production.
  if (statusCode === 500 && isProduction) {
    message = 'Internal server error';
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  const body = { success: false, data: null, message };
  if (details.length > 0) body.errors = details;
  if (!isProduction && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
}
