/**
 * Cover letter controller.
 *
 * The composing itself lives in `algorithms/coverLetterComposer.js` and is
 * pure. This file does only what a controller should: check the CV belongs
 * to the caller, assemble the corpus from the database and hand both to
 * the algorithm.
 *
 * Nothing is stored. A preview is a read of the user's own CV phrased
 * differently, so there is no new record to keep, and no activity is
 * logged until the letter actually becomes a draft or a sent message in
 * stage 5.
 */
import { CV } from '../models/CV.js';
import { JobMatch } from '../models/JobMatch.js';
import { composeCoverLetter } from '../algorithms/coverLetterComposer.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * How many previously analysed adverts join the TF-IDF corpus.
 *
 * The same cap, for the same reason, as in `jobMatch.controller.js`: the
 * corpus only has to be big enough for document frequencies to mean
 * something, and past that each extra document costs time on every
 * request while barely moving the weights.
 */
const MAX_CORPUS_HISTORY = 200;

/**
 * Loads a CV that belongs to the given user, or throws 404.
 *
 * Someone else's id gives 404 rather than 403, as everywhere else in the
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
 * POST /api/cover-letters/preview
 *
 * Composes a letter from one of the caller's CVs. The advert is optional:
 * without it the letter is generic but still honest, which is what lets
 * the feature be demonstrated with no job description to hand.
 *
 * @param {import('express').Request} req - cvId, companyName, jobTitle,
 *   jobDescription, recipientName in the body.
 * @param {import('express').Response} res - The response.
 * @returns {Promise<void>}
 */
export async function previewCoverLetter(req, res) {
  const { cvId, companyName, jobTitle, jobDescription, recipientName } = req.body;

  const cv = await findOwnedCV(cvId, req.user._id);

  // Only loaded when there is an advert to weight against it; with no
  // advert the composer never builds a profile, so the query would be
  // work thrown away.
  const previous = jobDescription
    ? await JobMatch.find({})
        .select('jobDescription')
        .sort({ createdAt: -1 })
        .limit(MAX_CORPUS_HISTORY)
        .lean()
    : [];

  const letter = composeCoverLetter(cv, {
    companyName,
    jobTitle,
    jobDescription,
    recipientName,
    priorJobDescriptions: previous.map((entry) => entry.jobDescription),
  });

  return sendSuccess(res, letter, 'Cover letter composed');
}

export default previewCoverLetter;
