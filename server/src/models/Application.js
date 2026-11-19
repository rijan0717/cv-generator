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

/**
 * Every stage an application can be at.
 *
 * `interview` and `selected` exist for the applications that were sent
 * by email rather than through the board: nobody on the employer's side
 * is moving those along, so the person tracking their own job hunt needs
 * the two stages that actually matter to them — being called in, and
 * getting the job — and not only the three an employer uses.
 */
export const APPLICATION_STATUSES = [
  'submitted',
  'reviewed',
  'shortlisted',
  'interview',
  'selected',
  'rejected',
  'withdrawn',
];

/**
 * Where the application came from.
 *
 * `board` is a job posted here, applied to with the Apply button: the
 * employer has an account, sees it in their list and moves it along.
 *
 * `email` is a letter the user sent from the Mail screen to a company
 * that may not use this system at all. There is no employer to update
 * it, so the applicant owns the status themselves — see
 * `updateApplicationStatus`.
 */
export const APPLICATION_SOURCES = ['board', 'email'];

const applicationSchema = new mongoose.Schema(
  {
    /**
     * The posting applied to — absent for an emailed application, where
     * there is no posting in this system to point at. What the user was
     * applying for is then held in `external` instead.
     */
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },

    source: {
      type: String,
      enum: APPLICATION_SOURCES,
      default: 'board',
      index: true,
    },

    /**
     * The role and the company as the user typed them, for an
     * application that has no `job` behind it.
     *
     * Plain strings, deliberately: the company is not a `Company` record
     * here, because it has no account on this system. Inventing one from
     * a name typed into an email form would put unverified companies
     * beside the approved ones an administrator has checked.
     */
    external: {
      companyName: { type: String, trim: true, default: '', maxlength: 200 },
      jobTitle: { type: String, trim: true, default: '', maxlength: 200 },
      /** The address it was sent to, so the row can say where it went. */
      to: { type: String, trim: true, default: '', maxlength: 320 },
    },

    /**
     * When the user last wrote to them about this application.
     *
     * Set on the first letter and again on every follow-up, so a chaser
     * updates the row the user is already watching instead of creating a
     * second application for the same job.
     */
    lastContactedAt: {
      type: Date,
      default: null,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * Denormalised so the employer's list needs no extra lookup. Null
     * for an emailed application: the company is a name, not a record.
     */
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
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
//
// Partial, and that is not a detail: an emailed application has no job,
// and a plain unique index treats every missing value as the same value
// — so the second letter a user ever sent would be refused as a
// duplicate of the first. Restricting the index to documents that really
// do have a job keeps the guarantee where it belongs and leaves the
// emailed ones out of it. Their own duplicate rule is in
// `applicationTracker.js`, which matches on the company and the role.
applicationSchema.index(
  { job: 1, applicant: 1 },
  { unique: true, partialFilterExpression: { job: { $type: 'objectId' } } },
);

// The employer reviewing a job, and the applicant reviewing their own.
applicationSchema.index({ job: 1, createdAt: -1 });
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ company: 1, createdAt: -1 });

// The duplicate check an emailed application uses: this person's own
// emailed applications, looked up by company and role.
applicationSchema.index({ applicant: 1, source: 1, 'external.companyName': 1 });

export const Application = mongoose.model('Application', applicationSchema);
export default Application;
