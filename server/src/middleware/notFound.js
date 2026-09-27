import { ApiError } from '../utils/ApiError.js';

/**
 * Catches any request that did not match a route and turns it into a 404
 * ApiError so it is formatted by the central error handler.
 * @type {import('express').RequestHandler}
 */
export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
