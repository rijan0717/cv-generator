import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createGmailDraft,
  updateGmailDraft,
  sendGmailMessage,
  getGmailDraft,
} from '../../api/gmail.js';
import { useToast } from '../../context/useToast.js';
import EmailPreview from './EmailPreview.jsx';
import Button from '../ui/Button.jsx';
import TextField from '../ui/TextField.jsx';
import Alert from '../ui/Alert.jsx';
import Spinner from '../ui/Spinner.jsx';

/**
 * A plain email: typed by the user, not written by the composer.
 *
 * Deliberately separate from `ComposeMailModal`, which writes a cover
 * letter from a CV. The two were one screen, and it meant every message
 * sent from here had to begin as a job application — there was no way to
 * answer an interview invitation, chase a reply or ask a recruiter a
 * question without generating a letter first and deleting it.
 *
 * So the cover letter keeps its own screen, reached from Cover letter,
 * and this one does what a mail client does: a recipient, a subject, a
 * message, and optionally a CV attached.
 *
 * It is also the draft editor. Editing a draft is the same four fields
 * over again, and Gmail's own update call replaces the whole message
 * anyway, so one form serves both: given `draftId` it loads that draft
 * and saves over it; given none it creates a new one.
 *
 * @param {{isOpen: boolean, onClose: () => void, cvs: Array<object>,
 *          gmail: {connected: boolean, email: string, canCompose: boolean},
 *          draftId?: string, initial?: {to?: string, subject?: string, body?: string},
 *          onDone?: () => void}} props
 */
export default function ComposeMessageModal({
  isOpen,
  onClose,
  cvs,
  gmail,
  draftId = '',
  initial = null,
  onDone,
}) {
  const dialogRef = useRef(null);
  const toast = useToast();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  // '' means no attachment, which is the default here: most plain
  // messages are not applications and should not carry a CV.
  const [cvId, setCvId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState('');

  const isConnected = gmail?.connected && gmail?.canCompose;
  const chosenCv = cvs.find((cv) => cv._id === cvId);
  const isEditing = Boolean(draftId);

  // Open and close the native dialog in step with the prop, which gives
  // focus trapping and Escape without writing either by hand.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!isOpen && dialog.open) {
      dialog.close?.();
    }
  }, [isOpen]);

  /**
   * Fills the form when it opens.
   *
   * Three cases: a draft to load from Gmail, values handed in (reusing a
   * sent letter), or an empty message. The fields are reset on every
   * open, so a cancelled message does not reappear inside the next one.
   */
  useEffect(() => {
    if (!isOpen) return undefined;

    setError('');
    setShowValidation(false);
    setConfirmSend(false);
    setTo(initial?.to ?? '');
    setSubject(initial?.subject ?? '');
    setBody(initial?.body ?? '');
    setCvId('');

    if (!draftId) return undefined;

    let isActive = true;
    setIsLoading(true);

    getGmailDraft(draftId)
      .then((draft) => {
        if (!isActive) return;
        setTo(draft.to ?? '');
        setSubject(draft.subject ?? '');
        setBody(draft.body ?? '');
      })
      .catch((err) => {
        if (isActive) setError(err.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
    // `initial` is a fresh object on each render of the parent, so it is
    // read when the dialog opens rather than depended on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftId]);

  /** What is still missing, field by field. */
  const problems = {
    to: !to.trim()
      ? 'Enter the recipient’s email address'
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())
        ? ''
        : 'That does not look like an email address',
    subject: subject.trim() ? '' : 'Enter a subject',
    body: body.trim() ? '' : 'Write a message',
  };

  const isValid = Object.values(problems).every((message) => !message);

  /**
   * Saves or sends what has been typed.
   *
   * @param {'draft'|'send'} action - Which of the two.
   * @returns {Promise<void>}
   */
  async function submit(action) {
    if (!isValid) {
      setShowValidation(true);
      setConfirmSend(false);
      setError('Some details are still missing. Check the fields marked below.');
      return;
    }

    setIsSaving(true);
    setError('');

    // An attachment needs a CV to render; without one the message goes
    // on its own, which is the normal case for a plain email.
    const message = { to, subject, body, cvId: cvId || undefined, attachCv: Boolean(cvId) };

    try {
      if (action === 'send') {
        // No company name is sent, so nothing here is recorded as an
        // application: a plain email is not one, and guessing an
        // employer from an address would put rows on the Applications
        // screen that the user never applied for.
        await sendGmailMessage(message);
        toast.success(`Sent to ${to}`);
      } else if (isEditing) {
        await updateGmailDraft(draftId, message);
        toast.success('Draft updated');
      } else {
        await createGmailDraft(message);
        toast.success('Draft saved to Gmail');
      }

      onDone?.();
      onClose();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSaving(false);
      setConfirmSend(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="compose-message-title"
      className="w-[min(1000px,calc(100vw-2rem))] max-w-none rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 dark:bg-navy-900 dark:text-slate-50"
    >
      <div className="flex max-h-[calc(100vh-4rem)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-navy-700">
          <div>
            <h2 id="compose-message-title" className="text-lg font-bold">
              {isEditing ? 'Edit draft' : 'New email'}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {isEditing
                ? 'Saving replaces the draft in your Gmail.'
                : 'A plain message from your own Gmail. For a letter written from your CV, use Cover letter.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>

        {!isConnected ? (
          <div className="p-6">
            <Alert variant="info">
              <p className="font-semibold">Gmail is not connected</p>
              <p className="mt-1">
                Sending a message, or saving one as a draft, needs your Gmail account connected
                first.
              </p>
              <p className="mt-2">
                <Link to="/profile" className="font-medium underline">
                  Connect it on your profile
                </Link>
                , then come back.
              </p>
            </Alert>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner label="Loading the draft" />
          </div>
        ) : (
          <div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-2">
            <EmailPreview
              from={gmail.email}
              to={to}
              subject={subject}
              body={body}
              attachmentName={chosenCv ? `${chosenCv.title || 'CV'}.pdf` : ''}
              emptyHint="What you type appears here, as the recipient will see it."
            />

            <div className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <TextField
                label="To"
                type="email"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="someone@example.com"
                error={showValidation ? problems.to : ''}
                required
              />

              <TextField
                label="Subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                error={showValidation ? problems.subject : ''}
                required
              />

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Message</span>
                <textarea
                  rows={12}
                  value={body}
                  aria-invalid={showValidation && Boolean(problems.body)}
                  onChange={(event) => setBody(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800"
                />
                {showValidation && problems.body && (
                  <span className="mt-1 block text-sm text-red-600 dark:text-red-400">
                    {problems.body}
                  </span>
                )}
              </label>

              {/* Off by default, and a choice rather than a tick: a plain
                  email usually carries no CV, and when it does the user
                  has to say which one. */}
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Attach a CV (optional)</span>
                <select
                  value={cvId}
                  onChange={(event) => setCvId(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800"
                >
                  <option value="">No attachment</option>
                  {cvs.map((cv) => (
                    <option key={cv._id} value={cv._id}>
                      {cv.title}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Attached as a PDF, exactly as it downloads.
                </span>
              </label>
            </div>
          </div>
        )}

        {isConnected && !isLoading && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 p-5 dark:border-navy-700">
            {confirmSend ? (
              <>
                <p className="mr-auto text-sm text-slate-700 dark:text-slate-200">
                  Send this to <strong>{to}</strong> now? This cannot be undone.
                </p>
                <Button variant="secondary" onClick={() => setConfirmSend(false)}>
                  Cancel
                </Button>
                <Button variant="danger" isLoading={isSaving} onClick={() => submit('send')}>
                  Yes, send it
                </Button>
              </>
            ) : (
              // Left enabled while something is missing: pressing one
              // explains what is wrong, which a disabled button cannot.
              <>
                <Button
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => {
                    if (!isValid) {
                      setShowValidation(true);
                      setError('Some details are still missing. Check the fields marked below.');
                      return;
                    }
                    setConfirmSend(true);
                  }}
                >
                  Send now
                </Button>
                <Button
                  variant="primary"
                  isLoading={isSaving}
                  disabled={isSaving}
                  onClick={() => submit('draft')}
                >
                  {isEditing ? 'Save draft' : 'Save as draft'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
