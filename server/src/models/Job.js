/**
 * Job model.
 *
 * A job belongs to a company, and through it to the user who owns that
 * company. Both references are stored: `company` for display, `postedBy`
 * so a permission check never has to load the company as well.
 */
import mongoose from 'mongoose';

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
export const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];
export const JOB_STATUSES = ['open', 'closed'];

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    /** Denormalised so ownership can be checked without a second query. */
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: [true, 'Please give the job a title'],
      trim: true,
      maxlength: [140, 'Title must be at most 140 characters'],
    },

    description: {
      type: String,
      required: [true, 'Please describe the job'],
      trim: true,
      maxlength: [8000, 'Description must be at most 8000 characters'],
    },

    location: { type: String, trim: true, default: '' },
    jobType: { type: String, enum: JOB_TYPES, default: 'Full-time' },
    workMode: { type: String, enum: WORK_MODES, default: 'On-site' },

    /** Free text rather than a number, because adverts write it that way. */
    salaryRange: { type: String, trim: true, default: '' },

    /** Used by the job matcher and shown as tags on the listing. */
    skills: { type: [String], default: [] },

    /** Applications are refused after this date, if one is set. */
    closingDate: { type: Date, default: null },

    status: { type: String, enum: JOB_STATUSES, default: 'open' },

    /** Kept in step by the application controller, for cheap list display. */
    applicationCount: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// The public board: open, not deleted, newest first.
jobSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
// A company owner listing their own jobs.
jobSchema.index({ postedBy: 1, isDeleted: 1 });
// Free-text search across the fields a seeker would search on.
jobSchema.index({ title: 'text', description: 'text', location: 'text' });

/**
 * Whether this job is still accepting applications.
 * @returns {boolean}
 */
jobSchema.methods.isAcceptingApplications = function isAcceptingApplications() {
  if (this.isDeleted || this.status !== 'open') return false;
  if (this.closingDate && this.closingDate < new Date()) return false;
  return true;
};

export const Job = mongoose.model('Job', jobSchema);
export default Job;
