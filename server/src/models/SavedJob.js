/**
 * A job a user has bookmarked.
 *
 * Kept as its own collection rather than an array on the user, so the
 * list can be paginated and so saving a job is one small insert instead of
 * rewriting a growing array on the user document.
 */
import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
  },
  { timestamps: true },
);

// Saving the same job twice is a no-op rather than a duplicate row.
savedJobSchema.index({ user: 1, job: 1 }, { unique: true });
savedJobSchema.index({ user: 1, createdAt: -1 });

export const SavedJob = mongoose.model('SavedJob', savedJobSchema);
export default SavedJob;
