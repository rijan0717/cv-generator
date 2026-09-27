/**
 * Error type used everywhere in the server so the central error handler can
 * tell an expected, reportable problem (e.g. "CV not found") apart from an
 * unexpected crash.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code to send to the client.
   * @param {string} message - Human-readable message, safe to show the user.
   * @param {Array<object>} [details] - Optional field-level validation details.
   */
  constructor(statusCode, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  /** @param {string} [message] @returns {ApiError} 400 Bad Request */
  static badRequest(message = 'Bad request', details = []) {
    return new ApiError(400, message, details);
  }

  /** @param {string} [message] @returns {ApiError} 401 Unauthorised */
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  /** @param {string} [message] @returns {ApiError} 403 Forbidden */
  static forbidden(message = 'You do not have permission to do that') {
    return new ApiError(403, message);
  }

  /** @param {string} [message] @returns {ApiError} 404 Not Found */
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  /** @param {string} [message] @returns {ApiError} 409 Conflict */
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }
}
