/**
 * File upload handling with multer.
 *
 * Images are written to local disk in `server/uploads/` — no third-party
 * storage is used. Two checks guard the upload: the MIME type must be one of
 * the three allowed image types, and multer enforces the size limit itself.
 */
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path of the uploads directory (server/uploads). */
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

/** Only these image types may be uploaded. */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },

  /**
   * Builds a unique, safe filename. The original name is discarded entirely,
   * which removes any chance of a path-traversal or overwrite attack through
   * a crafted filename.
   */
  filename(_req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${unique}${extension}`);
  },
});

/**
 * Rejects anything that is not one of the allowed image types.
 * @type {import('multer').Options['fileFilter']}
 */
function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPG, PNG and WEBP images are allowed'));
  }
  cb(null, true);
}

/** Multer instance configured for single image uploads. */
export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
    files: 1,
  },
});

/**
 * Translates multer's own errors into the project's ApiError, so an oversized
 * file produces a clear message instead of a generic 500.
 * @type {import('express').ErrorRequestHandler}
 */
export function handleUploadErrors(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest(`The image must be smaller than ${env.maxUploadSizeMb} MB`));
    }
    return next(ApiError.badRequest(`Upload failed: ${err.message}`));
  }
  next(err);
}
