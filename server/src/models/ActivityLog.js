/**
 * ActivityLog model.
 *
 * Records the key events in the system so the admin panel can show an audit
 * trail (Phase 6) and so download and job-match counts can be reported.
 * Writing a log entry must never break the action it is recording, so the
 * logger that creates these documents swallows its own errors.
 */
import mongoose from 'mongoose';

/** Every action the application is allowed to record. */
export const ACTIVITY_ACTIONS = [
  'REGISTER',
  'LOGIN',
  'CV_CREATE',
  'CV_UPDATE',
  'CV_DELETE',
  'DOWNLOAD_PDF',
  'DOWNLOAD_DOCX',
  'DOWNLOAD_EXCEL',
  'CV_IMPORT',
  'JOB_MATCH',
  'COMPANY_CREATE',
  'JOB_CREATE',
  'JOB_DELETE',
  'JOB_APPLY',
  'ADMIN_ACTION',
];

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true,
    },

    cv: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CV',
      default: null,
    },

    /** Free-form extra detail, e.g. which template was used. */
    meta: {
      type: Object,
      default: {},
    },

    ip: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

/** The admin activity list is sorted newest-first and filtered by action. */
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
