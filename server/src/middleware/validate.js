/**
 * Turns express-validator results into the project's standard error response.
 *
 * Validation rules live next to each route; this middleware runs after them
 * and stops the request if any rule failed, so controllers can assume their
 * input is already valid.
 */
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/**
 * Collects any validation errors and rejects the request with 400.
 * @type {import('express').RequestHandler}
 */
export function validate(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  // The first message is used as the headline so a simple client can show
  // one sentence, while `errors` carries the per-field detail for forms.
  next(ApiError.badRequest(details[0].message, details));
}

export default validate;
