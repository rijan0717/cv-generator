/**
 * Profile controller: the things a logged-in user may change about their own
 * account. Every function works on `req.user`, so a user can never modify
 * somebody else's profile.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

/**
 * The job seeker profile fields a user may set on themselves. Listing them
 * explicitly is what stops a `jobSeekerProfile` object in a request body
 * from writing anything else into the sub-document.
 */
const PROFILE_FIELDS = [
  'position',
  'industry',
  'yearsExperience',
  'openToWork',
  'employmentTypes',
  'location',
  'about',
];

/**
 * PUT /api/users/me
 * Updates the display name and, for a job seeker, the profile that
 * employers see. Email and role are deliberately not editable here: the
 * email identifies the account, and the role is an admin concern.
 *
 * The profile is written only for job seekers. An employer has a company
 * profile instead, and letting them fill in a candidate profile would put
 * them in the directory they are supposed to be reading.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function updateProfile(req, res) {
  const { name, jobSeekerProfile } = req.body;

  if (name !== undefined) req.user.name = name;

  if (jobSeekerProfile) {
    if (req.user.accountType !== 'jobseeker') {
      throw ApiError.forbidden('Only job seeker accounts have a candidate profile');
    }

    PROFILE_FIELDS.forEach((field) => {
      if (jobSeekerProfile[field] !== undefined) {
        req.user.jobSeekerProfile[field] = jobSeekerProfile[field];
      }
    });
  }

  await req.user.save();

  sendSuccess(res, { user: req.user.toPublicJSON() }, 'Your profile has been updated');
}

/**
 * PUT /api/users/me/password
 * Changes the password. The current password must be supplied, so somebody
 * using an unattended logged-in browser cannot lock the real owner out.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  // req.user was loaded without the hash, so re-read it with the hash included.
  const user = await req.user.constructor.findById(req.user._id).select('+passwordHash');

  // An account made with Google sign-in has no password yet, so there is
  // no current one to check; this request sets its first password.
  if (user.hasPassword !== false && !(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }

  if (await user.comparePassword(newPassword)) {
    throw ApiError.badRequest('Your new password must be different from the current one');
  }

  // Assigning the plain password is correct: the pre-save hook hashes it.
  user.passwordHash = newPassword;
  await user.save();

  sendSuccess(res, null, 'Your password has been changed');
}

/**
 * POST /api/users/me/avatar
 * Stores an uploaded avatar image and points the account at it. The previous
 * avatar file is deleted so the uploads folder does not grow without limit.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function uploadAvatar(req, res) {
  if (!req.file) {
    throw ApiError.badRequest('Please choose an image to upload');
  }

  const previousAvatarUrl = req.user.avatarUrl;

  req.user.avatarUrl = `/uploads/${req.file.filename}`;
  await req.user.save();

  // Best effort: failing to delete the old file must not fail the request.
  if (previousAvatarUrl?.startsWith('/uploads/')) {
    const oldPath = path.join(UPLOAD_DIR, path.basename(previousAvatarUrl));
    await fs.unlink(oldPath).catch(() => {});
  }

  sendSuccess(res, { user: req.user.toPublicJSON() }, 'Your photo has been updated');
}

/**
 * PATCH /api/users/me/account-type
 *
 * Records whether this account is a job seeker or an employer. It can be
 * set only once: the two kinds of account see different parts of the
 * system, and an employer who could turn into a job seeker would keep a
 * company and job posts they could no longer reach. Admins have no type.
 */
export async function setAccountType(req, res) {
  if (req.user.role === 'admin') {
    throw ApiError.badRequest('Admin accounts do not have an account type');
  }
  if (req.user.accountType) {
    throw ApiError.conflict('Your account type has already been chosen');
  }

  req.user.accountType = req.body.accountType;
  await req.user.save();

  sendSuccess(res, { user: req.user.toPublicJSON() }, 'Account type saved');
}
