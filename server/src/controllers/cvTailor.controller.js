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
 * POST /api/cvs/primary/tailor
 *
 * The same rewrite against the caller's **primary** CV.
 *
 * This exists for the job page, where the user has chosen an advert and
 * not a CV. Making the client find the primary CV first would mean
 * loading their whole CV list to pick one id out of it, and would leave
 * the client deciding which CV is primary — a rule the server already
 * owns.
 *
 * Having no primary CV is an ordinary state rather than an error, but
 * unlike the match badges there is nothing useful to return without one,
 * so it is a 400 with a message the page can show as a prompt.
 */
export async function previewTailoredPrimaryCV(req, res) {
  const primary = await CV.findOne({ user: req.user._id, isPrimary: true, isDeleted: false });

  if (!primary) {
    throw ApiError.badRequest(
      'You have not chosen a primary CV yet. Open My CVs and star the one to tailor from.',
    );
  }

  await respondWithPreview(req, res, primary);
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
  await respondWithPreview(req, res, cv);
}

/**
 * Runs the rewrite against an already-authorised CV and answers.
 *
 * Shared by the two preview routes, which differ only in how they find
 * the CV. Keeping the body here means the job page and the tailor page
 * cannot drift apart in what they return.
 *
 * The response carries the before-and-after figures as well as the draft,
 * because a tailored CV that scores no better than the original is worth
 * knowing about — and the user should be able to see that for themselves
 * rather than take the rewrite on trust. The two scores come from
 * `analyseMatch`, the same analyser the match page uses, run over the
 * same corpus: they are directly comparable with each other and with any
 * analysis the user runs afterwards.
 *
 * @param {object} req - The request.
 * @param {object} res - The response.
 * @param {object} cv - A CV already confirmed to belong to the caller.
 */
async function respondWithPreview(req, res, cv) {
  const { jobText, jobTitle, job } = await resolveJob(req.body);

  const priorJobDescriptions = await loadCorpusHistory();

  const { draft, changes, suggestedSkills, assumedSkills, notes } = tailorCV(cv, jobText, {
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
      assumedSkills,
      notes,

      // The job page starts from the primary CV and so does not know
      // which CV was used until it is told; it needs the id to save.
      sourceCv: { _id: cv._id, title: cv.title },

      // A title is offered rather than imposed; the user edits it before
      // saving, and two CVs tailored for the same role would otherwise
      // be indistinguishable in the list.
      suggestedTitle: buildTitle(req.user.name, jobTitle),

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

  const { baselineMatchScore, matchScore } = await measureAgainstAdvert(req.body, source, content);

  const cv = await CV.create({
    ...content,
    user: req.user._id,
    // What the user typed in the review step, or the offered title if
    // they left it alone.
    title: (req.body.title?.trim() || buildTitle(req.user.name, jobTitle)).slice(0, 100),
    isPrimary: false,
    isDeleted: false,
    tailoredFor: {
      job: jobId ?? null,
      jobTitle,
      sourceCv: source._id,
      // Recorded on the new CV only. The source keeps whatever scores it
      // had: tailoring a CV is not a judgement on the original, and
      // re-marking it would make the figure on the dashboard change for
      // a document nobody edited.
      baselineMatchScore,
      matchScore,
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
 * Scores the source CV and the saved draft against the advert.
 *
 * Measured here, at save time, rather than taken from the preview
 * response. The user spends the review step editing: removing an assumed
 * skill, rewriting the focus line, cutting a sentence they do not like.
 * The preview's "after" figure describes the draft the algorithm wrote,
 * not the one they kept, and storing it would overstate the result of
 * every rewrite a careful user trims. Trusting a number sent by the
 * client would be worse again.
 *
 * Both figures come from `analyseMatch` over the same corpus, so they are
 * comparable with each other and with any analysis run later.
 *
 * Returns nulls when there is no advert text to score against — a draft
 * saved without a job is a legitimate thing to do, and a fabricated
 * score would be worse than none.
 *
 * @param {object} body - The request body, carrying `jobId` or `jobDescription`.
 * @param {object} source - The CV that was tailored.
 * @param {object} content - The draft being saved.
 * @returns {Promise<{baselineMatchScore: number|null, matchScore: number|null}>}
 */
async function measureAgainstAdvert(body, source, content) {
  if (!body.jobId && !body.jobDescription) {
    return { baselineMatchScore: null, matchScore: null };
  }

  const { jobText } = await resolveJob(body);
  if (!jobText) return { baselineMatchScore: null, matchScore: null };

  const priorJobDescriptions = await loadCorpusHistory();

  return {
    baselineMatchScore: analyseMatch(source, jobText, { priorJobDescriptions }).matchScore,
    matchScore: analyseMatch(content, jobText, { priorJobDescriptions }).matchScore,
  };
}

/**
 * The title offered for a tailored CV.
 *
 * The name on the account and the advertised role, joined — not the
 * source CV's title. A tailored CV exists to be sent to one employer, so
 * the person and the post are what identify it. Building the title from
 * the source instead produced "My CV — Backend Developer": it carried a
 * private working title into a document meant to leave the system, and
 * it read as a variant of an existing CV rather than an application for
 * a job.
 *
 * Truncated to the 100 characters the model allows, so a long job title
 * cannot make the save fail validation after the user has done all the
 * editing. The title is only ever offered — the review step lets the
 * user replace it before saving.
 *
 * @param {string} userName - The name on the account the CV belongs to.
 * @param {string} jobTitle - The advertised role, if known.
 * @returns {string} A title of at most 100 characters.
 */
function buildTitle(userName, jobTitle) {
  // An account always has a name, but a blank one must not leave a title
  // that is nothing but a hyphen.
  const name = userName?.trim() || 'CV';
  const position = jobTitle?.trim();

  return (position ? `${name}-${position}` : `${name}-tailored`).slice(0, 100);
}
