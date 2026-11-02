/**
 * The public "rewrite your CV" funnel.
 *
 * Someone who has never used the site drops the CV they already have,
 * sees which of the open jobs it fits, picks one, and is shown what the
 * rewrite did to it — then creates an account to read the result.
 *
 * Three requests, in that order:
 *
 *   1. `uploadForRewrite` — read the file, rank the board, open a
 *      session. Nothing is shown that the logged-out board would not
 *      already show.
 *   2. `rewriteForJob` — run the rewrite and store it. The response
 *      carries the scores and a count of each kind of change, and **not
 *      one line of the rewritten CV**.
 *   3. `claimRewrite` — the only handler here that needs a session. It
 *      turns the held draft into a real CV on the account and returns
 *      it in full.
 *
 * The split between 2 and 3 is the whole feature, and it is why the
 * draft is held in `PendingRewrite` rather than sent to the browser and
 * hidden there. A draft in the page is readable with the developer
 * tools, which would make the sign-up prompt a suggestion rather than a
 * gate.
 *
 * Everything here is unauthenticated, which is unusual for this project,
 * so two things are deliberately tighter than elsewhere: the rate limit
 * is per IP and stricter than the one on the signed-in analyses, and the
 * session token is 32 random bytes rather than a document id.
 */
import { CV } from '../models/CV.js';
import { Job } from '../models/Job.js';
import { PendingRewrite, PENDING_REWRITE_TTL_HOURS } from '../models/PendingRewrite.js';
import { scoreJobsAgainstCV, analyseMatch } from '../algorithms/jobMatcher.js';
import { parseCVText } from '../algorithms/cvImportParser.js';
import { scoreCV } from '../algorithms/cvStrengthScorer.js';
import { tailorCV } from '../algorithms/cvTailor.js';
import { extractText } from '../services/documentTextService.js';
import { logActivity } from '../services/activityLogger.js';
import { visibleJobsFilter } from '../services/companyVisibility.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/** Below this, the file was an image or an empty document. */
const MIN_IMPORT_CHARACTERS = 200;

/** How many adverts are ranked. The same ceiling the signed-in page uses. */
const MAX_JOBS_RANKED = 60;

/** How many of the ranked adverts a logged-out visitor is shown. */
const MAX_JOBS_RETURNED = 10;

/**
 * Loads an unclaimed, unexpired session, or throws.
 *
 * A claimed record is refused rather than returned, so a token that has
 * already been spent cannot be replayed to read the draft again from a
 * different account.
 *
 * @param {string} token - The session token from the client.
 * @returns {Promise<object>} The pending rewrite.
 */
async function findOpenSession(token) {
  const pending = await PendingRewrite.findOne({ token, claimedBy: null });

  if (!pending) {
    throw ApiError.notFound(
      'That rewrite has expired or has already been saved. Drop your CV again to start over.',
    );
  }

  return pending;
}

/**
 * What a logged-out visitor is allowed to know about their rewrite.
 *
 * The scores, how many changes there were and what *kind* each one was —
 * never a `before`, an `after` or any of the rewritten text. Built in one
 * place so no handler can leak the draft by returning the wrong object.
 *
 * @param {object} pending - The stored rewrite.
 * @returns {object} The safe summary.
 */
function teaser(pending) {
  // Counted by kind, so the visitor can see the shape of the work —
  // "summary rebuilt, two skills promoted" — without reading any of it.
  const byKind = {};
  for (const change of pending.changes) {
    const key = `${change.section}:${change.kind}`;
    byKind[key] = (byKind[key] ?? 0) + 1;
  }

  return {
    token: pending.token,
    jobTitle: pending.jobTitle,
    changeCount: pending.changes.length,
    changeSummary: Object.entries(byKind).map(([key, count]) => {
      const [section, kind] = key.split(':');
      return { section, kind, count };
    }),
    assumedCount: pending.assumedSkills.length,
    suggestedCount: pending.suggestedSkills.length,
    beforeScore: pending.beforeScore,
    honestScore: pending.honestScore,
    matchScore: pending.matchScore,
    fieldFit: pending.fieldFit,

    // The advice is the user's own CV described back to them, not the
    // rewrite's output, so it is safe to show and it is the part that
    // makes the result feel real rather than like a number.
    notes: pending.notes,
    expiresInHours: PENDING_REWRITE_TTL_HOURS,
  };
}

/**
 * POST /api/public/rewrite/upload
 *
 * Reads a dropped CV, ranks the open jobs against it and opens a
 * session. No account needed.
 *
 * The parsed CV is stored rather than returned, for the same reason the
 * draft is: the next request has to run the rewrite against exactly what
 * was read here, and a CV that travels back through the browser is a CV
 * the browser can edit.
 */
export async function uploadForRewrite(req, res) {
  if (!req.file) throw ApiError.badRequest('Please choose a CV file');

  const text = await extractText(req.file);

  if (!text || text.trim().length < MIN_IMPORT_CHARACTERS) {
    throw ApiError.badRequest(
      'Almost no text could be read from that file. If it is a scanned image, the text cannot be extracted.',
    );
  }

  const parsed = parseCVText(text);

  const cv = {
    title: parsed.personal?.fullName ? `${parsed.personal.fullName}'s CV` : 'Uploaded CV',
    templateKey: 'ats',
    personal: parsed.personal,
    summary: parsed.summary,
    experience: parsed.experience,
    education: parsed.education,
    skills: parsed.skills,
    projects: parsed.projects,
    certifications: parsed.certifications,
    languages: parsed.languages,
    references: [],
    settings: {},
  };

  const jobs = await Job.find(await visibleJobsFilter({ isDeleted: false, status: 'open' }))
    .select('title description skills location jobType workMode salaryRange company createdAt')
    .populate('company', 'name logoUrl location')
    .sort({ createdAt: -1 })
    .limit(MAX_JOBS_RANKED)
    .lean();

  const scores = scoreJobsAgainstCV(
    cv,
    jobs.map((job) => ({
      id: job._id.toString(),
      text: `${job.title}\n${job.description}\nSkills: ${(job.skills ?? []).join(', ')}`,
    })),
  );

  const scoreById = new Map(scores.map((score) => [score.id, score]));

  const results = jobs
    .map((job) => ({ job, match: scoreById.get(job._id.toString()) ?? null }))
    .sort((a, b) => (b.match?.matchScore ?? 0) - (a.match?.matchScore ?? 0))
    .slice(0, MAX_JOBS_RETURNED);

  const pending = await PendingRewrite.create({ sourceCv: cv, ip: req.ip });

  sendCreated(
    res,
    {
      token: pending.token,

      // The name the parser found, so the page can say "we read Aayush's
      // CV" rather than leaving them wondering whether it worked.
      readAs: cv.personal?.fullName ?? '',
      strengthScore: scoreCV(cv).totalScore,
      results,
      expiresInHours: PENDING_REWRITE_TTL_HOURS,
    },
    results.length > 0
      ? `Your CV was read and scored against ${results.length} open job${results.length === 1 ? '' : 's'}`
      : 'Your CV was read, but there are no open jobs to match it against yet',
  );
}

/**
 * POST /api/public/rewrite/:token/job/:jobId
 *
 * Runs the rewrite against one advert and stores it.
 *
 * The response is the teaser and nothing else. This is the request the
 * whole feature turns on, so it is worth being explicit: the draft is
 * assigned to the document and the document is saved, and what goes back
 * to the client is built by `teaser` from the scores and the change
 * counts. There is no code path here that puts `draft` in a response.
 */
export async function rewriteForJob(req, res) {
  const pending = await findOpenSession(req.params.token);

  const job = await Job.findOne(
    await visibleJobsFilter({ _id: req.params.jobId, isDeleted: false, status: 'open' }),
  );

  if (!job) throw ApiError.notFound('That job is no longer open');

  const skillsLine = job.skills?.length ? `\nSkills: ${job.skills.join(', ')}` : '';
  const jobText = `${job.title}\n${job.description}${skillsLine}`;

  const result = tailorCV(pending.sourceCv, jobText, { jobTitle: job.title });

  pending.job = job._id;
  pending.jobTitle = job.title;
  pending.draft = result.draft;
  pending.changes = result.changes;
  pending.assumedSkills = result.assumedSkills;
  pending.suggestedSkills = result.suggestedSkills;
  pending.focusTerms = result.focusTerms;
  pending.notes = result.notes;
  pending.beforeScore = analyseMatch(pending.sourceCv, jobText).matchScore;
  pending.honestScore = result.honestScore;
  pending.matchScore = result.matchScore;
  pending.fieldFit = result.fieldFit.level;

  await pending.save();

  sendSuccess(res, teaser(pending), 'Your rewritten CV is ready');
}

/**
 * POST /api/public/rewrite/:token/claim
 *
 * Saves the held rewrite to the signed-in account and returns it in full.
 *
 * This is where the gate opens. The account can be one that has just
 * been created or one that already existed — the funnel does not care
 * which, and making the visitor register when they already have an
 * account would be a worse experience than the one it is replacing.
 *
 * The new CV is never primary: a CV written for one advert is the wrong
 * default for every other application, which is the same rule
 * `saveTailoredCV` follows.
 */
export async function claimRewrite(req, res) {
  const pending = await findOpenSession(req.params.token);

  if (!pending.draft) {
    throw ApiError.badRequest('That rewrite has not been run against a job yet');
  }

  const draft = pending.draft;

  const cv = await CV.create({
    user: req.user._id,
    title: `${req.user.name} — ${pending.jobTitle}`.slice(0, 100),
    templateKey: draft.templateKey ?? 'ats',
    settings: draft.settings ?? {},
    personal: draft.personal ?? {},
    summary: draft.summary ?? '',
    education: draft.education ?? [],
    experience: draft.experience ?? [],
    skills: draft.skills ?? [],
    projects: draft.projects ?? [],
    certifications: draft.certifications ?? [],
    languages: draft.languages ?? [],
    references: draft.references ?? [],
    referencesOnRequest: draft.referencesOnRequest ?? false,
    isPrimary: false,
    tailoredFor: {
      job: pending.job,
      jobTitle: pending.jobTitle,
      sourceCv: null,
      baselineMatchScore: pending.beforeScore,
      matchScore: pending.matchScore,
      tailoredAt: new Date(),
    },
  });

  const score = scoreCV(cv);
  cv.strengthScore = score.totalScore;
  cv.strengthBreakdown = score.breakdown;
  await cv.save();

  // Spent, not deleted: the record stops being claimable but the TTL
  // still clears it, which leaves a short trace for support without
  // keeping a stranger's CV indefinitely.
  pending.claimedBy = req.user._id;
  pending.claimedAt = new Date();
  await pending.save();

  await logActivity({
    userId: req.user._id,
    action: 'CV_TAILOR',
    cvId: cv._id,
    meta: { jobTitle: pending.jobTitle, source: 'public-funnel' },
    req,
  });

  sendCreated(
    res,
    {
      cv,
      changes: pending.changes,
      assumedSkills: pending.assumedSkills,
      suggestedSkills: pending.suggestedSkills,
      notes: pending.notes,
      comparison: {
        before: { matchScore: pending.beforeScore },
        honest: { matchScore: pending.honestScore },
        after: { matchScore: pending.matchScore },
        fieldFit: pending.fieldFit,
      },
    },
    'Your rewritten CV has been saved to your account',
  );
}
