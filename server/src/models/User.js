/**
 * User model.
 *
 * Stores the account details for both roles. A password is never stored in
 * plain text: it is hashed with bcrypt before the document is saved, and the
 * hash is excluded from query results by default.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/** Cost factor for bcrypt. 12 is slow enough to resist brute force. */
const BCRYPT_ROUNDS = 12;

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

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    avatarUrl: {
      type: String,
      default: '',
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
 *            avatarUrl: string, status: string, createdAt: Date}}
 */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    avatarUrl: this.avatarUrl,
    status: this.status,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
export default User;
