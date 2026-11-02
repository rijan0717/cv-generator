/**
 * A rewrite produced for someone who is not signed in yet.
 *
 * The public funnel runs in three steps — drop a CV, pick a job, see what
 * the rewrite did — and the third step is the one the visitor has to
 * create an account for. That only means anything if the rewritten CV is
 * genuinely out of their reach until they do: a draft sent to the browser
 * and hidden with CSS is readable by anyone who opens the developer
 * tools, which would make the sign-up prompt a formality rather than a
 * gate. So the draft is held here and never leaves the server until the
 * record is claimed.
 *
 * Holding it also means the visitor can leave the page, register, confirm
 * an email and come back without the work being lost — which is the
 * journey the funnel actually asks them to make.
 *
 * Nothing here belongs to a user until `claimedBy` is set. The documents
 * delete themselves after `expiresAt`, so an abandoned funnel leaves
 * nothing behind.
 */
import mongoose from 'mongoose';
import crypto from 'node:crypto';

/**
 * How long an unclaimed rewrite is kept.
 *
 * Long enough to register, read a confirmation email and come back;
 * short enough that a stranger's CV is not sitting in the database for
 * weeks because they changed their mind. These documents hold a real
 * person's name, phone number and address, uploaded by someone who never
 * created an account, so the shortest workable life is the right one.
 */
export const PENDING_REWRITE_TTL_HOURS = 24;

/**
 * An opaque handle for one anonymous session.
 *
 * The `_id` would work, but a Mongo id is guessable in a way a random
 * 32-byte token is not, and this is the only thing standing between an
 * unclaimed rewrite and whoever asks for it.
 *
 * @returns {string} A URL-safe random token.
 */
export function newRewriteToken() {
  return crypto.randomBytes(32).toString('base64url');
}

const pendingRewriteSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, default: newRewriteToken },

    /**
     * The CV as the parser read it out of the uploaded file. Stored
     * loosely because it comes from `parseCVText` rather than from the
     * builder, and a parse that half-succeeds should still be usable.
     */
    sourceCv: { type: mongoose.Schema.Types.Mixed, required: true },

    /** The advert the rewrite was run against, once one is chosen. */
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    jobTitle: { type: String, trim: true, default: '' },

    /**
     * The rewritten CV. This is the part the visitor is not allowed to
     * see, so no controller may put it in a response before the record
     * is claimed.
     */
    draft: { type: mongoose.Schema.Types.Mixed, default: null },

    /**
     * What the rewrite did, in the same shape `tailorCV` returns. Only
     * the counts and the scores are ever shown before the claim.
     */
    changes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    assumedSkills: { type: [String], default: [] },
    suggestedSkills: { type: [String], default: [] },
    focusTerms: { type: [String], default: [] },
    notes: { type: [String], default: [] },

    beforeScore: { type: Number, default: 0 },
    honestScore: { type: Number, default: 0 },
    matchScore: { type: Number, default: 0 },
    fieldFit: { type: String, default: '' },

    /** Set when an account takes ownership. A record is claimed once. */
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    claimedAt: { type: Date, default: null },

    /** Kept for the rate limit and for tracing abuse, never shown. */
    ip: { type: String, default: '' },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + PENDING_REWRITE_TTL_HOURS * 60 * 60 * 1000),
    },
  },
  { timestamps: true },
);

// MongoDB removes the document itself once `expiresAt` passes, so an
// abandoned funnel needs no clean-up job of our own.
pendingRewriteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingRewrite =
  mongoose.models.PendingRewrite ?? mongoose.model('PendingRewrite', pendingRewriteSchema);
