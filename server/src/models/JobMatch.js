/**
 * JobMatch model.
 *
 * One document per analysis the user runs. Storing them serves three
 * purposes: the user gets a history they can return to, the corpus the
 * TF-IDF weights are built from grows with every real advert analysed,
 * and the admin dashboard can report which skills candidates most often
 * lack.
 *
 * The advert text is kept in full, which is what makes the corpus growth
 * possible — a stored score alone could not be re-analysed.
 */
import mongoose from 'mongoose';

const keywordSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: true },
    /** The TF-IDF weight, kept so the report can show why it mattered. */
    weight: { type: Number, default: 0 },
  },
  { _id: false },
);

const jobMatchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    cv: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CV',
      required: true,
    },

    /** Set when the advert came from the job board rather than a paste. */
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },

    jobTitle: { type: String, trim: true, default: '', maxlength: 140 },

    jobDescription: {
      type: String,
      required: [true, 'A job description is needed to analyse a match'],
      trim: true,
      maxlength: [8000, 'Job description must be at most 8000 characters'],
    },

    /** The headline figure, 0–100. */
    matchScore: { type: Number, required: true, min: 0, max: 100 },

    /** Raw cosine similarity, before scaling. Kept so nothing is hidden. */
    cosineSimilarity: { type: Number, default: 0 },

    /** Null when the advert named no skill our dictionary knows. */
    skillCoverage: { type: Number, default: null },

    matchedKeywords: { type: [keywordSchema], default: [] },
    missingKeywords: { type: [keywordSchema], default: [] },

    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },

    suggestions: { type: [String], default: [] },
  },
  { timestamps: true },
);

// The history list: one user's analyses, newest first.
jobMatchSchema.index({ user: 1, createdAt: -1 });
// Growing the corpus reads every stored advert; this keeps it to an index.
jobMatchSchema.index({ createdAt: -1 });

export const JobMatch = mongoose.model('JobMatch', jobMatchSchema);
export default JobMatch;
