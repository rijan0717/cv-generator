/**
 * Interview question model.
 *
 * One multiple-choice question: the text, exactly four options, which one
 * is right, and the explanation shown in study mode and in the exam
 * review. The explanation is the part that makes this preparation rather
 * than a quiz — knowing the answer is worth little without knowing why.
 *
 * A question belongs to one position and one level. Four options is a
 * fixed shape rather than a variable list on purpose: it keeps the admin
 * editor a single form, keeps every paper's marking identical, and means
 * a question can never be saved in a half-written state with one option.
 */
import mongoose from 'mongoose';
import { INTERVIEW_LEVELS } from './InterviewPosition.js';

/** How many options every question carries. */
export const OPTIONS_PER_QUESTION = 4;

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Every option needs text'],
      trim: true,
      maxlength: [400, 'An option must be at most 400 characters'],
    },
  },
  { _id: false },
);

const interviewQuestionSchema = new mongoose.Schema(
  {
    /**
     * The position this question belongs to, when it belongs to one.
     *
     * Null for a **category question** — one written against a whole
     * family of roles rather than a single job title. With 700 positions
     * that is the only arrangement that scales: "Software Engineering"
     * is authored once and fifty roles draw on it, instead of the same
     * question being typed fifty times and edited fifty times.
     *
     * A position's pool is its own questions plus its category's.
     */
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewPosition',
      default: null,
    },

    /** Set instead of `position` for a question shared across a family. */
    category: { type: String, trim: true, default: '' },

    level: {
      type: String,
      enum: INTERVIEW_LEVELS,
      required: [true, 'Level is required'],
    },

    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [1000, 'A question must be at most 1000 characters'],
    },

    options: {
      type: [optionSchema],
      validate: {
        validator: (options) => options.length === OPTIONS_PER_QUESTION,
        message: `A question must have exactly ${OPTIONS_PER_QUESTION} options`,
      },
    },

    /** Which option is correct, as an index into `options`. */
    correctIndex: {
      type: Number,
      required: [true, 'The correct answer must be marked'],
      min: [0, 'The correct answer must be one of the options'],
      max: [OPTIONS_PER_QUESTION - 1, 'The correct answer must be one of the options'],
      validate: {
        validator: Number.isInteger,
        message: 'The correct answer must be one of the options',
      },
    },

    /** Why that answer is right. Shown in study mode and after an exam. */
    explanation: {
      type: String,
      required: [true, 'An explanation is required'],
      trim: true,
      maxlength: [1500, 'An explanation must be at most 1500 characters'],
    },

    /**
     * What the question is about: "hooks", "accessibility", "vat".
     *
     * Used twice over — to spread a paper across topics rather than
     * letting one dominate, and to tell somebody which areas they were
     * weakest in afterwards. Lowercased so the two agree.
     */
    topic: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [40, 'A topic must be at most 40 characters'],
      default: 'general',
    },

    /** Whether the question is used in study mode and drawn into papers. */
    isActive: { type: Boolean, default: true },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/**
 * Building a paper and listing study questions both ask the same thing:
 * the active questions for one position at one level.
 */
interviewQuestionSchema.index({ position: 1, level: 1, isActive: 1, isDeleted: 1 });

/** The same question, asked of a whole category. */
interviewQuestionSchema.index({ category: 1, level: 1, isActive: 1, isDeleted: 1 });

/**
 * A question must belong to exactly one of the two, or it would either
 * be unreachable (neither) or counted twice (both).
 */
interviewQuestionSchema.pre('validate', function requireOwner(next) {
  if (!this.position && !this.category) {
    next(new Error('A question needs either a position or a category'));
    return;
  }

  if (this.position && this.category) {
    next(new Error('A question belongs to a position or a category, not both'));
    return;
  }

  next();
});

export const InterviewQuestion = mongoose.model('InterviewQuestion', interviewQuestionSchema);
export default InterviewQuestion;
