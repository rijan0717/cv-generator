/**
 * Wraps an async Express route handler so any rejected promise is forwarded to
 * the central error-handling middleware instead of crashing the process.
 * This removes the need for a try/catch block in every controller.
 *
 * @param {Function} fn - Async (req, res, next) handler.
 * @returns {import('express').RequestHandler} A safe Express handler.
 */
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
