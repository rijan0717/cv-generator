/**
 * Helpers that keep every successful JSON response in the documented shape
 * `{ success, data, message }`.
 */

/**
 * Sends a successful JSON response.
 * @param {import('express').Response} res - Express response object.
 * @param {*} data - Payload to return to the client.
 * @param {string} [message] - Short human-readable message.
 * @param {number} [statusCode] - HTTP status code (defaults to 200).
 * @returns {import('express').Response}
 */
export function sendSuccess(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message });
}

/**
 * Sends a created (201) JSON response.
 * @param {import('express').Response} res - Express response object.
 * @param {*} data - The newly created resource.
 * @param {string} [message] - Short human-readable message.
 * @returns {import('express').Response}
 */
export function sendCreated(res, data, message = 'Created') {
  return sendSuccess(res, data, message, 201);
}
