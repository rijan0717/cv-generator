/**
 * User model.
 *
 * Stores the account details for both roles. A password is never stored in
 * plain text: it is hashed with bcrypt before the document is saved, and the
 * hash is excluded from query results by default.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { INDUSTRY_VALUES, EMPLOYMENT_TYPE_VALUES } from '../data/industries.js';

/** Cost factor for bcrypt. 12 is slow enough to resist brute force. */
const BCRYPT_ROUNDS = 12;

/**
 * What a job seeker chooses to show employers, beyond their name and photo.
 *
 * It lives on the user rather than on a CV because it describes the person,
 * not a document: someone with five tailored CVs has one current position
 * and one answer to "are you looking?". Keeping it here also means the
 * candidate directory can filter without reading every CV.
 *
 * Employers never see it for an account that is not a job seeker.
 */
const jobSeekerProfileSchema = new mongoose.Schema(
  {
    /** Current or desired job title, e.g. "Junior Accountant". */
    position: { type: String, trim: true, maxlength: 100, default: '' },

    /** One of the fixed industry keys, so the directory filter can group. */
    industry: {
      type: String,
      enum: [...INDUSTRY_VALUES, ''],
      default: '',
    },

    /**
     * Total years of work experience, as the candidate states it. Capped at
     * 60: anything higher is a typo rather than a career.
     */
    yearsExperience: { type: Number, min: 0, max: 60, default: 0 },

    /** Whether the candidate wants to be approached about roles. */
    openToWork: { type: Boolean, default: false },

    /** The kinds of work they will consider. Empty means "not stated". */
    employmentTypes: {
      type: [{ type: String, enum: EMPLOYMENT_TYPE_VALUES }],
      default: [],
    },

    /** Where they are based, shown to employers as free text. */
    location: { type: String, trim: true, maxlength: 120, default: '' },

    /** A short introduction in the candidate's own words. */
    about: { type: String, trim: true, maxlength: 600, default: '' },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },

    // `select: false` keeps the hash out of every query result unless it is
    // asked for explicitly with .select('+passwordHash').
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    /**
     * What this account is, as one word.
     *
     * `user` means the account type has not been chosen yet. Once it is,
     * the role follows it — a job seeker's role reads `jobseeker` and an
     * employer's reads `employer` — so the database says plainly what each
     * account is instead of leaving every row as `user`. The `syncRole`
     * hook below is what keeps the two in step. `admin` is set by the seed
     * script and is never changed by that hook.
     *
     * Permission checks still use `requireAdmin` and `requireAccountType`,
     * so nothing is decided by this field alone.
     */
    role: {
      type: String,
      enum: ['user', 'jobseeker', 'employer', 'admin'],
      default: 'user',
    },

    /**
     * What a `user` account is for, chosen once after registering:
     * a job seeker builds CVs and applies; an employer runs a company and
     * posts jobs. `null` until chosen — the client shows the one-time
     * choice while it is null. Not used for admins.
     */
    accountType: {
      type: String,
      enum: ['jobseeker', 'employer', null],
      default: null,
    },

    avatarUrl: {
      type: String,
      default: '',
    },

    /** Only meaningful for a job seeker; left at its defaults otherwise. */
    jobSeekerProfile: {
      type: jobSeekerProfileSchema,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    // Soft delete: the document stays in the database so that CVs and
    // activity logs referencing it remain readable by the admin.
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

/** Admin lists filter on these two fields, so they are indexed together. */
userSchema.index({ isDeleted: 1, createdAt: -1 });

/**
 * The candidate directory filters on exactly these fields in this order,
 * so one compound index serves the whole list, including the common case
 * of an employer asking only for one industry.
 */
userSchema.index({ accountType: 1, isDeleted: 1, status: 1, 'jobSeekerProfile.industry': 1 });

/**
 * Hashes the password before saving, but only when it has actually changed.
 * Without the `isModified` guard, every profile update would re-hash the
 * existing hash and lock the user out.
 */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, BCRYPT_ROUNDS);
  next();
});

/**
 * Keeps `role` reading the same as `accountType`, so an employer is stored
 * as `employer` rather than as a generic `user`.
 *
 * Done in one hook rather than at each call site: the account type is set
 * by the choice screen, by the seed scripts and by the migration, and
 * three places each remembering to write the role is three chances to
 * forget. An admin is never rewritten — admins have no account type, and
 * losing the admin role would lock the panel.
 */
userSchema.pre('save', function syncRole(next) {
  if (this.role !== 'admin') {
    this.role = this.accountType ?? 'user';
  }
  next();
});

/**
 * Compares a plain-text password against this user's stored hash.
 * @param {string} plainPassword - The password as typed by the user.
 * @returns {Promise<boolean>} True when the password matches.
 */
userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/**
 * Returns the fields that are safe to send to the client.
 * Used everywhere instead of returning the raw document, so a password hash
 * can never leak through a response.
 * @returns {{id: string, name: string, email: string, role: string,
 *            accountType: string|null, avatarUrl: string, status: string,
 *            jobSeekerProfile: object, createdAt: Date}}
 */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    accountType: this.accountType ?? null,
    avatarUrl: this.avatarUrl,
    status: this.status,
    // Sent to its owner so the profile form can show what is saved. The
    // directory builds its own shape rather than reusing this one.
    jobSeekerProfile: {
      position: this.jobSeekerProfile?.position ?? '',
      industry: this.jobSeekerProfile?.industry ?? '',
      yearsExperience: this.jobSeekerProfile?.yearsExperience ?? 0,
      openToWork: this.jobSeekerProfile?.openToWork ?? false,
      employmentTypes: this.jobSeekerProfile?.employmentTypes ?? [],
      location: this.jobSeekerProfile?.location ?? '',
      about: this.jobSeekerProfile?.about ?? '',
    },
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
export default User;
