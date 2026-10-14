/**
 * Company model.
 *
 * Any user may create one company, which then lets them post jobs. There
 * is deliberately no separate "employer" role: **ownership of a company is
 * what grants the right to post**, so the existing user/admin model is
 * untouched and there is no approval queue to build or explain.
 *
 * One company per user keeps the permission question simple — given a job,
 * the person allowed to manage it is the owner of its company, or an admin.
 */
import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: [true, 'Please give your company a name'],
      trim: true,
      maxlength: [120, 'Company name must be at most 120 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must be at most 2000 characters'],
      default: '',
    },

    website: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    logoUrl: { type: String, default: '' },

    // --- Verification details, checked by the admin before approval -----

    /** Official registration / PAN / VAT number. */
    registrationNumber: { type: String, trim: true, maxlength: 60, default: '' },

    /** Company contact details. */
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },

    /**
     * File name of the registration certificate, stored in the private
     * company-documents folder (never under the public /uploads). Read only
     * through the owner/admin download route.
     */
    documentFile: { type: String, default: '' },

    // --- Approval ---------------------------------------------------------

    /**
     * A new company starts `pending`. Only an `approved` company can post
     * jobs, and only its jobs are shown on the board. A `rejected` one
     * carries the admin's reason; editing and resubmitting returns it to
     * `pending`.
     */
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: Date.now },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

companySchema.index({ isDeleted: 1, createdAt: -1 });
companySchema.index({ status: 1, isDeleted: 1, submittedAt: -1 });

/**
 * The company as the public and the job board see it: no owner id, no
 * registration document, no internal review fields.
 */
companySchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.documentFile;
    return ret;
  },
});

export const Company = mongoose.model('Company', companySchema);
export default Company;
