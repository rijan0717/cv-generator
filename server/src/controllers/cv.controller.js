/**
 * CV controller.
 *
 * Every function here goes through `findOwnedCV`, so a user can only ever
 * reach their own CVs. Passing somebody else's id returns 404 rather than
 * 403, because telling the caller "that exists but is not yours" would leak
 * the fact that the id is real.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { CV } from '../models/CV.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

/** Fields the client may change. Anything else in the body is ignored. */
const EDITABLE_FIELDS = [
  'title',
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
 * @param {string} cvId - The CV's id.
 * @param {string} userId - The requesting user's id.
 * @returns {Promise<import('../models/CV.js').CV>} The CV document.
 */
async function findOwnedCV(cvId, userId) {
  const cv = await CV.findOne({ _id: cvId, user: userId, isDeleted: false });
  if (!cv) throw ApiError.notFound('CV not found');
  return cv;
}

/**
 * GET /api/cvs
 * Lists the user's CVs for the dashboard. Only the fields the list shows are
 * selected, so a user with many long CVs does not transfer all of them.
 */
export async function listCVs(req, res) {
  const cvs = await CV.find({ user: req.user._id, isDeleted: false })
    .select('title templateKey strengthScore isPrimary updatedAt createdAt')
    .sort({ updatedAt: -1 });

  sendSuccess(res, { cvs }, 'Your CVs');
}

/**
 * POST /api/cvs
 * Creates a new, mostly empty CV. The owner's name and email are copied in
 * as a starting point so the first preview is not completely blank.
 */
export async function createCV(req, res) {
  const { title, templateKey } = req.body;

  const cv = await CV.create({
    user: req.user._id,
    title,
    templateKey: templateKey || 'classic',
    personal: {
      fullName: req.user.name,
      email: req.user.email,
    },
  });

  await logActivity({ userId: req.user._id, action: 'CV_CREATE', cvId: cv._id, ip: req.ip });

  sendCreated(res, { cv }, 'CV created');
}

/**
 * GET /api/cvs/:id
 * Returns one complete CV for the builder and preview.
 */
export async function getCV(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);
  sendSuccess(res, { cv }, 'CV loaded');
}

/**
 * PUT /api/cvs/:id
 * Saves the CV. This is the endpoint autosave calls, so it accepts a partial
 * body and only applies the fields that were actually sent.
 */
export async function updateCV(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      cv[field] = req.body[field];
    }
  }

  await cv.save();

  await logActivity({ userId: req.user._id, action: 'CV_UPDATE', cvId: cv._id, ip: req.ip });

  sendSuccess(res, { cv }, 'Saved');
}

/**
 * DELETE /api/cvs/:id
 * Soft delete: the document is kept so the admin reports in Phase 6 still
 * have their history, but it disappears from the user's dashboard.
 */
export async function deleteCV(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);

  cv.isDeleted = true;
  await cv.save();

  await logActivity({ userId: req.user._id, action: 'CV_DELETE', cvId: cv._id, ip: req.ip });

  sendSuccess(res, null, 'CV deleted');
}

/**
 * POST /api/cvs/:id/duplicate
 * Copies a CV so the user can adapt an existing one for a different role.
 */
export async function duplicateCV(req, res) {
  const original = await findOwnedCV(req.params.id, req.user._id);

  // toObject() gives a plain copy; the identity fields are then replaced so
  // Mongoose treats it as a brand new document.
  const copy = original.toObject();
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  copy.title = `${original.title} (copy)`.slice(0, 100);

  const cv = await CV.create(copy);

  await logActivity({ userId: req.user._id, action: 'CV_CREATE', cvId: cv._id, ip: req.ip });

  sendCreated(res, { cv }, 'CV duplicated');
}

/**
 * POST /api/cvs/:id/photo
 * Stores the photo shown on the CV itself, separately from the account
 * avatar. The previous photo is removed so uploads do not accumulate.
 */
export async function uploadPhoto(req, res) {
  if (!req.file) throw ApiError.badRequest('Please choose an image to upload');

  const cv = await findOwnedCV(req.params.id, req.user._id);
  const previous = cv.personal.photoUrl;

  cv.personal.photoUrl = `/uploads/${req.file.filename}`;
  await cv.save();

  if (previous?.startsWith('/uploads/')) {
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(previous))).catch(() => {});
  }

  sendSuccess(res, { cv }, 'Photo updated');
}

/**
 * PATCH /api/cvs/:id/primary
 *
 * Marks one CV as the primary, which is the one offered by default when
 * applying for a job.
 *
 * Only one CV can hold the flag, so every other one belonging to this
 * user is cleared first. The clear runs before the set on purpose: a
 * failure between the two then leaves the user with no primary rather
 * than two, and "apply with my primary CV" stays unambiguous.
 */
export async function setPrimaryCV(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);

  await CV.updateMany({ user: req.user._id, _id: { $ne: cv._id } }, { $set: { isPrimary: false } });

  cv.isPrimary = true;
  await cv.save();

  sendSuccess(res, { cv }, 'Primary CV updated');
}

/**
 * DELETE /api/cvs/:id/primary
 * Clears the flag, leaving the user with no primary CV.
 */
export async function clearPrimaryCV(req, res) {
  const cv = await findOwnedCV(req.params.id, req.user._id);

  cv.isPrimary = false;
  await cv.save();

  sendSuccess(res, { cv }, 'No primary CV set');
}
