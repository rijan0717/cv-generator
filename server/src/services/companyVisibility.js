/**
 * Which companies' jobs the public may see.
 *
 * A company must be approved by the admin before its jobs appear anywhere
 * a job seeker looks: the board, a job page, the upload ranking and the
 * match scores. Kept in one place so every one of those applies the same
 * rule.
 */
import { Company } from '../models/Company.js';

/**
 * The ids of every approved, not-deleted company.
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 */
export async function approvedCompanyIds() {
  return Company.distinct('_id', { status: 'approved', isDeleted: false });
}

/**
 * A Job query filter limited to approved companies' jobs.
 * @param {object} [filter] - Any other conditions.
 * @returns {Promise<object>}
 */
export async function visibleJobsFilter(filter = {}) {
  return { ...filter, company: { $in: await approvedCompanyIds() } };
}
