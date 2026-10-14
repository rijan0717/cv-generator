/**
 * Rewrite growth service.
 *
 * A CV produced by the Job-Tailored CV Rewrite is shown with a growth
 * figure: "before → after" for the job it was written for. "After" is the
 * tailored CV's own score, stored when it was saved. "Before" is how the
 * user's **current primary CV** scores on that job, measured now, so the
 * figure always answers "how much better is this rewrite than the CV I
 * would otherwise send?" — and follows the user when they change which CV
 * is primary.
 *
 * The primary CV is measured with `analyseMatch` over the same job text and
 * corpus the rewrite itself uses, so both numbers are on the same scale.
 */
import { CV } from '../models/CV.js';
import { Job } from '../models/Job.js';
import { JobMatch } from '../models/JobMatch.js';
import { analyseMatch } from '../algorithms/jobMatcher.js';

/** How many past job descriptions are added to the TF-IDF corpus. */
const MAX_CORPUS_HISTORY = 200;

/**
 * The advert text used for matching: title, description and skills.
 * @param {{title: string, description: string, skills?: string[]}} job
 * @returns {string}
 */
function jobToText(job) {
  const skillsLine = job.skills?.length ? `\nSkills: ${job.skills.join(', ')}` : '';
  return `${job.title}\n${job.description}${skillsLine}`;
}

/**
 * Replaces each tailored CV's "before" score with the current primary CV's
 * score for the same job.
 *
 * Left unchanged when the user has no primary CV, or when the tailored CV
 * *is* the primary one — comparing a CV with itself says nothing, so the
 * score of the CV it was rewritten from (stored at save time) is kept.
 *
 * @param {string} userId - The owner of the CVs.
 * @param {Array<{jobId: *, cvId: *, baselineMatchScore: number|null}>} items
 *   Tailored CV summaries. Each gets `baselineMatchScore` and
 *   `baselineCvTitle` set in place.
 * @returns {Promise<void>}
 */
export async function applyPrimaryBaselines(userId, items) {
  if (items.length === 0) return;

  const primary = await CV.findOne({ user: userId, isPrimary: true, isDeleted: false }).lean();
  if (!primary) return;

  const pending = items.filter((item) => item.jobId && String(item.cvId) !== String(primary._id));
  if (pending.length === 0) return;
  const jobIds = [...new Set(pending.map((item) => String(item.jobId)))];

  const [jobs, history] = await Promise.all([
    Job.find({ _id: { $in: jobIds } }).select('title description skills').lean(),
    JobMatch.find({})
      .select('jobDescription')
      .sort({ createdAt: -1 })
      .limit(MAX_CORPUS_HISTORY)
      .lean(),
  ]);
  const priorJobDescriptions = history.map((entry) => entry.jobDescription);

  // One analysis per job, however many tailored CVs point at it.
  const scoreByJob = new Map(
    jobs.map((job) => [
      String(job._id),
      analyseMatch(primary, jobToText(job), { priorJobDescriptions }).matchScore,
    ]),
  );

  for (const item of pending) {
    const score = scoreByJob.get(String(item.jobId));
    if (score === undefined) continue; // the job has been removed
    item.baselineMatchScore = score;
    item.baselineCvTitle = primary.title;
  }
}
