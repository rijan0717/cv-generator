/**
 * Job-Tailored CV Rewrite controller.
 *
 * Two requests, and the split between them is the point of the feature:
 *
 *   - `preview` runs the rewrite and stores **nothing**. The draft goes
 *     back to the user with every change it made and the reason for each,
 *     and they edit it.
 *   - `save` takes the draft they ended up with and creates a new CV.
 *
 * Generating straight into a saved CV would be faster to build and worse
 * to use: the rewrite is a suggestion made by an algorithm that cannot
 * read, and nothing it writes should reach a real document without the
 * user having seen it. It also means a user can try the rewrite against
 * five adverts without five half-finished CVs appearing in their list.
 *
 * The rewrite itself lives in `algorithms/cvTailor.js` and is pure. This
 * file checks ownership, assembles the corpus, and writes to the database.
 */
import { CV } from '../models/CV.js';
import { Job } from '../models/Job.js';
import { JobMatch } from '../models/JobMatch.js';
import { tailorCV } from '../algorithms/cvTailor.js';
import { analyseMatch } from '../algorithms/jobMatcher.js';
import { scoreCV } from '../algorithms/cvStrengthScorer.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * How many previously analysed adverts join the TF-IDF corpus.
 *
 * The same figure the match analyser uses, and for the same reason: past
 * this point each extra document costs processing time on every request
 * and changes the weights barely at all. Matching it also means the
 * tailor and the analyser weight this advert identically, so the "before"
 * score shown next to the draft is the same number the user would get by
 * running the analysis themselves.
 */
const MAX_CORPUS_HISTORY = 200;

/**
 * Fields a saved draft may set. Anything else in the body is ignored.
 *
 * The same whitelist as `cv.controller.js`, because this route creates a
 * CV and a user editing a draft must not be able to set fields the
 * builder would refuse — the owner, the primary flag or the score.
 */
const DRAFT_FIELDS = [
  'templateKey',
  'settings',
  'personal',
  'summary',
  'education',
  'experience',
  'skills',
  'projects',
  'certifications',
  'languages',
  'references',
  'referencesOnRequest',
];

/**
 * Loads a CV that belongs to the given user, or throws 404.
 *
 * 404 rather than 403 for someone else's id, as everywhere else in the
 * project: 403 would confirm the id is real.
 *
 * @param {string} cvId - The CV's id.
 * @param {string} userId - The requesting user's id.
 * @returns {Promise<object>} The CV document.
 */
async function findOwnedCV(cvId, userId) {
  const cv = await CV.findOne({ _id: cvId, user: userId, isDeleted: false });
  if (!cv) throw ApiError.notFound('CV not found');
  return cv;
}

/**
 * Works out which advert to tailor against.
 *
 * It can come from the job board (`jobId`) or be pasted in. A board job's
 * skill tags are appended to its description, because they are part of
 * what the advert asks for even though they sit outside that field —
 * the same assembly the match analyser does, so the two agree.
 *
 * @param {object} body - The request body.
 * @returns {Promise<{jobText: string, jobTitle: string, job: object|null}>}
 */
async function resolveJob(body) {
  const { jobId, jobDescription, jobTitle } = body;

  if (jobId) {
    const job = await Job.findOne({ _id: jobId, isDeleted: false }).populate('company', 'name');
    if (!job) throw ApiError.notFound('Job not found');

    const skillsLine = job.skills?.length ? `\nSkills: ${job.skills.join(', ')}` : '';

    return {
      jobText: `${job.title}\n${job.description}${skillsLine}`,
      jobTitle: jobTitle || job.title,
      job,
    };
  }

  return { jobText: jobDescription, jobTitle: jobTitle || '', job: null };
}

/**
 * The adverts already in the system, used to weight this one.
 * @returns {Promise<string[]>} Their text, newest first.
 */
async function loadCorpusHistory() {
  const previous = await JobMatch.find({})
    .select('jobDescription')
    .sort({ createdAt: -1 })
    .limit(MAX_CORPUS_HISTORY)
    .lean();

  return previous.map((entry) => entry.jobDescription);
}

/**
 * POST /api/cvs/:id/tailor
 *
 * Rewrites one of the caller's CVs for one advert and returns the draft.
 * Nothing is stored.
 *
 * The response carries the before-and-after figures as well as the draft,
 * because a tailored CV that scores no better than the original is worth
 * knowing about — and the user should be able to see that for themselves
 * rather than take the rewrite on trust. The two scores come from
 * `analyseMatch`, the same analyser the match page uses, run over the
 * same corpus: they are directly comparable with each other and with any
 * analysis the user runs afterwards.
 */
export async function previewTailoredCV(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);
  const { jobText, jobTitle, job } = await resolveJob(req.body);

  const priorJobDescriptions = await loadCorpusHistory();

  const { draft, changes, suggestedSkills, notes } = tailorCV(cv, jobText, {
    jobTitle,
    priorJobDescriptions,
  });

  const before = analyseMatch(cv, jobText, { priorJobDescriptions });
  const after = analyseMatch(draft, jobText, { priorJobDescriptions });

  sendSuccess(
    res,
    {
      draft,
      changes,
      suggestedSkills,
      notes,

      // A title is offered rather than imposed; the user edits it before
      // saving, and two CVs tailored for the same role would otherwise
      // be indistinguishable in the list.
      suggestedTitle: buildTitle(cv.title, jobTitle),

      job: job ? { _id: job._id, title: job.title, company: job.company?.name ?? '' } : null,
      jobTitle,

      comparison: {
        before: {
          matchScore: before.matchScore,
          band: before.band,
          skillCoverage: before.skillCoverage,
          strengthScore: cv.strengthScore,
        },
        after: {
          matchScore: after.matchScore,
          band: after.band,
          skillCoverage: after.skillCoverage,
          strengthScore: scoreCV(draft).totalScore,
        },
      },
    },
    changes.length > 0
      ? `Drafted ${changes.length} change${changes.length === 1 ? '' : 's'} for this job`
      : 'This CV already reads well against that advert — nothing was changed',
  );
}

/**
 * POST /api/cvs/:id/tailor/save
 *
 * Saves the draft the user has reviewed as a new CV.
 *
 * The body is whatever they ended up with, not whatever the preview
 * produced: they may have rewritten every line of it, and that is the
 * intended use. The rewrite is therefore not re-run here — doing so would
 * throw away their edits.
 *
 * The new CV is never primary, whatever the source CV was. A CV written
 * for one advert is the wrong default for every other application.
 */
export async function saveTailoredCV(req, res) {
  const source = await findOwnedCV(req.params.id, req.user._id);

  const submitted = req.body.draft ?? {};

  // Start from the source CV so anything the draft leaves out is carried
  // over rather than lost, then overlay the fields the user reviewed.
  const original = source.toObject();
  const content = {};

  for (const field of DRAFT_FIELDS) {
    content[field] = field in submitted ? submitted[field] : original[field];
  }

  const { jobId, jobTitle = '' } = req.body;

  if (jobId) {
    const job = await Job.findOne({ _id: jobId, isDeleted: false }).select('_id');
    if (!job) throw ApiError.notFound('Job not found');
  }

  const cv = await CV.create({
    ...content,
    user: req.user._id,
    // What the user typed in the review step, or the offered title if
    // they left it alone.
    title: (req.body.title?.trim() || buildTitle(source.title, jobTitle)).slice(0, 100),
    isPrimary: false,
    isDeleted: false,
    tailoredFor: {
      job: jobId ?? null,
      jobTitle,
      sourceCv: source._id,
      tailoredAt: new Date(),
    },
  });

  await logActivity({
    userId: req.user._id,
    action: 'CV_TAILOR',
    cvId: cv._id,
    meta: { sourceCv: source._id.toString(), jobTitle, jobId: jobId ?? null },
    ip: req.ip,
  });

  sendCreated(res, { cv }, 'Tailored CV saved');
}

/**
 * The title offered for a tailored CV.
 *
 * The source title and the advertised role, joined. Truncated to the 100
 * characters the model allows, so a long job title cannot make the save
 * fail validation after the user has done all the editing.
 *
 * @param {string} sourceTitle - The CV being tailored.
 * @param {string} jobTitle - The advertised role, if known.
 * @returns {string} A title of at most 100 characters.
 */
function buildTitle(sourceTitle, jobTitle) {
  const proposed = jobTitle ? `${sourceTitle} — ${jobTitle}` : `${sourceTitle} (tailored)`;
  return proposed.slice(0, 100);
}
