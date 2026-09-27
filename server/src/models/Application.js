/**
 * Application model.
 *
 * The important decision here is that an application stores a **snapshot**
 * of the CV as it was when submitted, not a reference to the live one.
 *
 * Three reasons, and they all matter:
 *
 *   1. An employer must assess what was actually sent. If the CV were a
 *      reference, a candidate could edit it while it was under review and
 *      silently change the document being judged.
 *   2. Deleting a CV would otherwise break every application made with it.
 *   3. A candidate who tailors one CV for several jobs expects each
 *      employer to see the version they were sent.
 *
 * The cost is duplicated data. That is the right trade: an application is
 * a record of an event, and a record that changes after the fact is not a
 * record.
 */
import mongoose from 'mongoose';

export const APPLICATION_STATUSES = [
  'submitted',
  'reviewed',
  'shortlisted',
  'rejected',
  'withdrawn',
];

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Denormalised so the employer's list needs no extra lookup. */
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    /** The CV this came from, for the applicant's own reference only. */
    sourceCv: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CV',
      default: null,
    },

    /**
     * The CV exactly as submitted. Stored loosely typed on purpose: it is
     * a frozen copy, and validating it against a schema that may change
     * later would make old applications unreadable.
     */
    cvSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    coverLetter: {
      type: String,
      trim: true,
      maxlength: [4000, 'Cover letter must be at most 4000 characters'],
      default: '',
    },

    status: { type: String, enum: APPLICATION_STATUSES, default: 'submitted' },

    /** Private to the company; never returned to the applicant. */
    employerNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

// One application per person per job. The database enforces it, so a
// double-clicked submit button cannot create two.
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// The employer reviewing a job, and the applicant reviewing their own.
applicationSchema.index({ job: 1, createdAt: -1 });
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ company: 1, createdAt: -1 });

export const Application = mongoose.model('Application', applicationSchema);
export default Application;
