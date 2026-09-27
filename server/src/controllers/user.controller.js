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
 * PUT /api/users/me
 * Updates the display name. Email and role are deliberately not editable
 * here: the email identifies the account, and the role is an admin concern.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function updateProfile(req, res) {
  const { name } = req.body;

  req.user.name = name;
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

  if (!(await user.comparePassword(currentPassword))) {
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
