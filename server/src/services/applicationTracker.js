/**
 * Turns a letter that has been sent into an application the user can track.
 *
 * Somebody who emails their CV to a company has applied for a job, in
 * every sense that matters to them. Until now that left no trace outside
 * their mailbox: the Applications screen listed only the posts applied
 * to through the board, so the half of a job hunt that happens by email
 * was invisible exactly where the user went to look for it.
 *
 * Three rules shape what this module does, and each is worth being able
 * to defend:
 *
 *   1. **Only a real send creates one.** A draft has not been applied
 *      for. It may never be sent, and a row that appears when a letter
 *      is saved would have to be removed again when it is not.
 *   2. **Only with a CV.** An application is the CV that was sent; a
 *      note to a recruiter asking about openings is not one. No CV, no
 *      application — and the compose form asks before creating one
 *      either way.
 *   3. **A follow-up is not a second application.** Writing again about
 *      the same role at the same company updates the row the user is
 *      already watching. Two rows for one job would make the list a
 *      record of letters instead of a record of applications, which is
 *      what the Mail screen's Sent list is already for.
 */
import { Application } from '../models/Application.js';
import { CV } from '../models/CV.js';

/**
 * The longest letter kept on the application row.
 *
 * The full text lives in `SentMail`, which is the record of what was
 * sent. What is stored here is for the one line of context the
 * Applications screen shows, so the schema's own 4000-character limit is
 * met by trimming rather than by refusing to track the application.
 */
const COVER_LETTER_LIMIT = 4000;

/**
 * Normalises a name for comparison.
 *
 * "Sagarmatha Supply", "sagarmatha supply" and "Sagarmatha  Supply " are
 * one employer, and a follow-up typed in a hurry should still find the
 * application it belongs to. Case and spacing go; nothing else is
 * touched, because the stored value is still what the user typed.
 *
 * @param {string} value - A company name or job title.
 * @returns {string} The comparable form.
 */
export function normaliseName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Finds the emailed application a new letter belongs to, if any.
 *
 * Matched on the company *and* the role, so applying for a second job at
 * a company the user has already written to is a new application rather
 * than an update of the first — which is right: they are two jobs.
 *
 * The comparison is done in JavaScript over this user's own emailed
 * applications rather than with a case-insensitive query, because the
 * set is small (one person's job hunt) and the normalisation rule then
 * lives in one readable function instead of in a regular expression
 * built from user input.
 *
 * @param {string} userId - The applicant.
 * @param {string} companyName - The company written to.
 * @param {string} jobTitle - The role applied for, possibly ''.
 * @returns {Promise<object|null>} The existing application, or null.
 */
export async function findExistingEmailApplication(userId, companyName, jobTitle) {
  const company = normaliseName(companyName);
  if (!company) return null;

  const role = normaliseName(jobTitle);

  const candidates = await Application.find({
    applicant: userId,
    source: 'email',
    // A withdrawn application is finished with. Writing again after
    // withdrawing is a fresh start, not an update of the one that was
    // abandoned.
    status: { $ne: 'withdrawn' },
  })
    .sort({ createdAt: -1 })
    .limit(100);

  return (
    candidates.find(
      (application) =>
        normaliseName(application.external?.companyName) === company &&
        normaliseName(application.external?.jobTitle) === role,
    ) ?? null
  );
}

/**
 * Records a sent letter as an application, or updates the one it follows up.
 *
 * Never throws for a reason the caller cannot act on: the letter has
 * already gone by the time this runs, and failing the request afterwards
 * would tell the user their mail did not send when it did. A problem
 * here costs the tracking row, not the letter — so the caller logs it
 * and carries on.
 *
 * @param {object} options - What was sent.
 * @param {object} options.user - The sender.
 * @param {string} options.cvId - The CV that was attached or written from.
 * @param {string} options.companyName - The company written to.
 * @param {string} [options.jobTitle] - The role, if one was named.
 * @param {string} options.to - The recipient address.
 * @param {string} [options.body] - The letter, for the row's preview.
 * @returns {Promise<{application: object, isFollowUp: boolean}|null>}
 *   Null when there is nothing to track.
 */
export async function trackEmailedApplication({
  user,
  cvId,
  companyName,
  jobTitle = '',
  to,
  body = '',
}) {
  if (!cvId || !normaliseName(companyName)) return null;

  const existing = await findExistingEmailApplication(user._id, companyName, jobTitle);

  if (existing) {
    // A follow-up moves the date, never the status: whether the employer
    // has replied is the user's to say, and a chaser letter is not news
    // about their decision.
    existing.lastContactedAt = new Date();
    await existing.save();
    return { application: existing, isFollowUp: true };
  }

  const cv = await CV.findOne({ _id: cvId, user: user._id, isDeleted: false });
  if (!cv) return null;

  // The same frozen copy a board application takes, for the same reason:
  // this is a record of what was sent, and editing the CV afterwards
  // must not change it.
  const cvSnapshot = cv.toObject();
  delete cvSnapshot._id;
  delete cvSnapshot.user;

  const application = await Application.create({
    job: null,
    company: null,
    source: 'email',
    applicant: user._id,
    sourceCv: cv._id,
    cvSnapshot,
    coverLetter: String(body ?? '').slice(0, COVER_LETTER_LIMIT),
    external: {
      companyName: String(companyName).trim(),
      jobTitle: String(jobTitle ?? '').trim(),
      to: String(to ?? '').trim(),
    },
    lastContactedAt: new Date(),
  });

  return { application, isFollowUp: false };
}

export default trackEmailedApplication;
