/**
 * Records events in the ActivityLog collection.
 *
 * Logging is deliberately "best effort": if writing the log fails, the action
 * the user asked for must still succeed. A failed audit write is reported to
 * the console but never turned into an HTTP error.
 */
import { ActivityLog } from '../models/ActivityLog.js';

/**
 * Writes one activity log entry.
 * @param {object} entry - The event to record.
 * @param {string} entry.userId - Id of the user who performed the action.
 * @param {string} entry.action - One of ACTIVITY_ACTIONS.
 * @param {string} [entry.cvId] - Related CV, when the action concerns one.
 * @param {object} [entry.meta] - Any extra detail worth keeping.
 * @param {string} [entry.ip] - The requesting IP address.
 * @returns {Promise<void>} Always resolves, even when the write fails.
 */
export async function logActivity({ userId, action, cvId = null, meta = {}, ip = '' }) {
  try {
    await ActivityLog.create({ user: userId, action, cv: cvId, meta, ip });
  } catch (error) {
    console.error('[activityLogger] could not write log entry:', error.message);
  }
}
