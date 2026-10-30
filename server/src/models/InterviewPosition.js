/**
 * Interview position model.
 *
 * A position is the thing a user searches for — "Frontend Developer",
 * "Accounts Assistant" — and the container every interview question
 * belongs to. It carries the exam rules as well, because those are a
 * property of the position rather than of the system: a position with six
 * questions cannot sensibly ask for a ten-question paper.
 *
 * Nothing here is offered to a user until `isActive` is set, and the
 * controller refuses to set it until every offered level has enough
 * active questions to fill an exam. That check is what makes "the exam is
 * automatic once a position is active" safe rather than a promise the
 * system breaks the first time somebody takes it.
 */
import mongoose from 'mongoose';

/** The experience levels a position may be offered at, weakest first. */
export const INTERVIEW_LEVELS = ['junior', 'mid', 'senior'];

/** Defaults for a new position, so the admin can leave the exam alone. */
export const DEFAULT_EXAM_SETTINGS = {
  questionCount: 10,
  passMark: 60,
  timeLimitMinutes: 0,
};

const examSettingsSchema = new mongoose.Schema(
  {
    /** How many questions a paper draws from the pool. */
    questionCount: {
      type: Number,
      default: DEFAULT_EXAM_SETTINGS.questionCount,
      min: [1, 'An exam needs at least one question'],
      max: [50, 'An exam may have at most 50 questions'],
    },

    /** The percentage needed to pass. */
    passMark: {
      type: Number,
      default: DEFAULT_EXAM_SETTINGS.passMark,
      min: [1, 'The pass mark must be at least 1%'],
      max: [100, 'The pass mark may be at most 100%'],
    },

    /** Minutes allowed. Zero means untimed, which is the default. */
    timeLimitMinutes: {
      type: Number,
      default: DEFAULT_EXAM_SETTINGS.timeLimitMinutes,
      min: [0, 'A time limit cannot be negative'],
      max: [180, 'A time limit may be at most 180 minutes'],
    },
  },
  { _id: false },
);

const interviewPositionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title must be at most 120 characters'],
    },

    /**
     * The URL the user sees, derived from the title.
     *
     * Stored rather than computed on every request so that renaming a
     * position does not silently break a link somebody has bookmarked —
     * the slug only changes when the controller decides it should.
     */
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
    },

    /** Kept in step with `server/src/data/industries.js` so filters agree. */
    industry: { type: String, trim: true, default: '' },

    /**
     * The family this position belongs to, from `builtInPositions.json`.
     *
     * It is what makes 700 positions workable. A question may be written
     * against a category rather than a single position, and every
     * position in that category draws on it — so "Software Engineering"
     * is authored once instead of fifty times for fifty nearly identical
     * roles. A position can still have questions of its own.
     */
    category: { type: String, trim: true, default: '', index: true },

    /**
     * Shipped with the application rather than created by an admin.
     *
     * Built-in positions come from `builtInPositions.json`, which is in
     * the repository, so they appear on every machine that pulls the
     * branch without anybody re-entering them. An admin may rename one,
     * reword it, add questions and switch it off — but **not delete it**,
     * because the next seed would simply bring it back, and a delete that
     * silently undoes itself is worse than one that is refused.
     */
    isBuiltIn: { type: Boolean, default: false },

    /** Searchable keywords: "react", "vat", "ledger". */
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: [],
    },

    /**
     * Which levels this position is offered at. A position need not offer
     * all three — a graduate scheme has no senior paper.
     */
    levels: {
      type: [{ type: String, enum: INTERVIEW_LEVELS }],
      default: INTERVIEW_LEVELS,
      validate: {
        validator: (levels) => levels.length > 0,
        message: 'A position must offer at least one level',
      },
    },

    examSettings: { type: examSettingsSchema, default: () => ({}) },

    /** Whether the position appears in the user's search. */
    isActive: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/** The user's search asks for active, undeleted positions on every load. */
interviewPositionSchema.index({ isActive: 1, isDeleted: 1 });

/** The admin list and the search both sort by title. */
interviewPositionSchema.index({ title: 1 });

export const InterviewPosition = mongoose.model('InterviewPosition', interviewPositionSchema);
export default InterviewPosition;
