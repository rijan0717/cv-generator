/**
 * Reads the message out of a failed download.
 *
 * A download asks Axios for `responseType: 'blob'`, and Axios applies that
 * to the error response too. The server's `{ success, message }` JSON
 * therefore arrives as a Blob, and `err.message` is the useless generic
 * "Request failed with status code 404". This digs the real message out.
 *
 * It is deliberately forgiving: a blob that is not JSON, or a browser
 * that cannot read it, falls back to whatever message came with the
 * error. A download failing is bad enough without the error handler
 * throwing on top of it.
 *
 * @param {Error & {response?: {data?: unknown}}} err - The rejected request.
 * @returns {Promise<string>} The best message available.
 */
export async function readBlobError(err) {
  if (!(err.response?.data instanceof Blob)) return err.message;

  try {
    return JSON.parse(await err.response.data.text()).message ?? err.message;
  } catch {
    // Not JSON, or unreadable. The original message will have to do.
    return err.message;
  }
}

export default readBlobError;
