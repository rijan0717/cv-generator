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

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

companySchema.index({ isDeleted: 1, createdAt: -1 });

export const Company = mongoose.model('Company', companySchema);
export default Company;
