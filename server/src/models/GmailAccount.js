/**
 * One user's connected Gmail account.
 *
 * Kept in its own collection rather than as fields on the user, for three
 * reasons worth being able to say out loud:
 *
 *   1. The user document is read on nearly every request and is returned to
 *      the browser. Secrets do not belong on it.
 *   2. Disconnecting is then a delete, not a scatter of fields to unset,
 *      so "disconnected" cannot be half-true.
 *   3. Supporting a second provider later (Outlook) is a new collection,
 *      not a migration of the user.
 *
 * What is NOT stored here: the access token. Those last about an hour and are
 * minted on demand from the refresh token, so holding one in the database
 * would add a second secret at rest in exchange for nothing.
 */
import mongoose from 'mongoose';

const gmailAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    /**
     * The Gmail address that was connected.
     *
     * Read from the `openid`/`userinfo.email` part of the consent, not typed
     * by the user, so it is the address mail will actually come from. Shown
     * in the profile card as "Connected as …", which is how someone notices
     * they authorised the wrong account.
     */
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    /**
     * Google's permanent id for the account (`sub`). The email address on a
     * Google account can change; this cannot, so a reconnect is matched on
     * this rather than on the address.
     */
    googleId: {
      type: String,
      required: true,
    },

    // --- The refresh token, encrypted ---------------------------------------
    // Produced by services/gmailTokenCrypto.js (AES-256-GCM). All three parts
    // are needed to decrypt; none of them is useful without GMAIL_TOKEN_KEY
    // from server/.env, which is never in the database.
    //
    // `select: false` so an ordinary query cannot pull them out by accident —
    // reading them has to be deliberate (`.select('+refreshTokenCipher …')`).

    refreshTokenCipher: {
      type: String,
      required: true,
      select: false,
    },

    iv: {
      type: String,
      required: true,
      select: false,
    },

    authTag: {
      type: String,
      required: true,
      select: false,
    },

    /**
     * The scopes Google actually granted, as a space-separated string.
     *
     * Stored because a user can untick a scope on the consent screen. Checking
     * this before composing turns a confusing 403 from the Gmail API into a
     * clear "reconnect and allow drafting" message.
     */
    scope: {
      type: String,
      default: '',
    },

    connectedAt: {
      type: Date,
      default: Date.now,
    },

    /** Last time a draft or send used this account. Shown in the admin report. */
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/**
 * Never let the secret parts reach a JSON response, even if a future
 * controller forgets the `select: false` above and asks for them explicitly.
 * Two independent guards, because one of them only has to be forgotten once.
 */
gmailAccountSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.refreshTokenCipher;
    delete ret.iv;
    delete ret.authTag;
    return ret;
  },
});

export const GmailAccount = mongoose.model('GmailAccount', gmailAccountSchema);
export default GmailAccount;
