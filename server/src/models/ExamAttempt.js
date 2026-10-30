/**
 * One sitting of an exam.
 *
 * The paper is stored as a **frozen snapshot**, not as references to the
 * questions. This is the same decision as `Application.cv` in CLAUDE.md
 * §6 and for the same reason: an admin correcting a question afterwards
 * must not change what somebody was actually asked, or a result from last
 * month becomes impossible to explain. The shuffled option order is
 * stored too, so the review screen can show the paper as it was taken.
 *
 * `startedAt` is the server's clock. A time limit checked against a time
 * the browser reports would be trivially defeated by changing it.
 */
import mongoose from 'mongoose';
import { INTERVIEW_LEVELS } from './InterviewPosition.js';

const paperEntrySchema = new mongoose.Schema(
  {
    /** The question this came from, kept only so a retake can weight it. */
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion' },

    text: { type: String, required: true },
    options: [{ text: { type: String, required: true } }],

    /** The correct answer **within the shuffled order stored above**. */
    correctIndex: { type: Number, required: true },

    explanation: { type: String, default: '' },
    topic: { type: String, default: 'general' },
  },
  { _id: false },
);

const examAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewPosition',
      required: true,
    },

    /** Copied so a result still reads correctly if the title changes. */
    positionTitle: { type: String, default: '' },

    /**
     * 'mixed' is a paper drawn from every level at once, which is the
     * default — a real interview does not separate its junior questions
     * from its senior ones. A single level is still possible, for
     * practising one band deliberately.
     */
    level: { type: String, enum: [...INTERVIEW_LEVELS, 'mixed'], required: true },

    paper: { type: [paperEntrySchema], default: [] },

    /** The option chosen per question; null where none was. */
    answers: { type: [mongoose.Schema.Types.Mixed], default: [] },

    /** The rules this sitting was taken under, frozen with the paper. */
    passMark: { type: Number, required: true },
    timeLimitMinutes: { type: Number, default: 0 },

    score: { type: Number, default: null },
    passed: { type: Boolean, default: null },
    correctCount: { type: Number, default: null },

    /** The per-topic analysis from `examScorer`. */
    breakdown: { type: [mongoose.Schema.Types.Mixed], default: [] },
    weakestTopics: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },

    startedAt: { type: Date, default: Date.now },

    /** Null while the attempt is still open. */
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** The history list asks for one user's attempts, newest first. */
examAttemptSchema.index({ user: 1, createdAt: -1 });

/** Weighting a retake needs this user's attempts at this position. */
examAttemptSchema.index({ user: 1, position: 1, level: 1, createdAt: -1 });

export const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
export default ExamAttempt;
