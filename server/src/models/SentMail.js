/**
 * This application's own copy of a message it sent for the user.
 *
 * The scope held here, `gmail.compose`, can write drafts and send mail
 * but cannot read the mailbox — and that includes the Sent folder. So
 * once a message has gone, Gmail will not give it back, and the only way
 * the Mail page can show the user what they sent is to have kept a copy
 * at the moment of sending.
 *
 * Buying a second, wider scope purely to read back messages we wrote
 * ourselves would mean a restricted-scope review for something a small
 * collection answers, so the copy lives here.
 *
 * Why it is a collection of its own, and not fields on `ActivityLog`:
 * the activity log is read by an administrator. A covering letter to a
 * named employer is the user's private correspondence and has no place
 * on an admin screen, so the log keeps only the recipient, the subject
 * and the time — as it always has — and the words stay here, readable by
 * the one account that wrote them.
 */
import mongoose from 'mongoose';

const sentMailSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** The recipient, exactly as it was addressed. */
    to: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },

    /** The message as plain text, the same string that was sent. */
    body: {
      type: String,
      default: '',
      maxlength: 20000,
    },

    /**
     * The CV that was attached, if one was.
     *
     * A reference rather than a snapshot: this is a record of what was
     * sent, not a thing the employer will read again, and the user
     * editing that CV afterwards does not change the fact that it was
     * the CV they attached. (An `Application` is the opposite case, and
     * freezes its copy for exactly that reason.)
     */
    cv: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CV',
      default: null,
    },

    attached: {
      type: Boolean,
      default: false,
    },

    /** Gmail's id for the sent message, so the row can link into Gmail. */
    messageId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

/** The Mail page's one query: this user's messages, newest first. */
sentMailSchema.index({ user: 1, createdAt: -1 });

export const SentMail = mongoose.model('SentMail', sentMailSchema);

export default SentMail;
