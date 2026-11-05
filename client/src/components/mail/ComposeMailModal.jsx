import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { previewCoverLetter } from '../../api/coverLetters.js';
import { createGmailDraft, sendGmailMessage } from '../../api/gmail.js';
import { useToast } from '../../context/useToast.js';
import EmailPreview from './EmailPreview.jsx';
import ComposeProgress from './ComposeProgress.jsx';
import Button from '../ui/Button.jsx';
import TextField from '../ui/TextField.jsx';
import Alert from '../ui/Alert.jsx';

/**
 * Below this, the server refuses a job description: there is too little
 * text to weight anything from. The same floor as the match analyser.
 */
const MIN_DESCRIPTION = 50;

/**
 * How long the progress panel stays up, at minimum.
 *
 * The composer is fast — a local request comes back in well under a
 * second — so without a floor the panel appears and vanishes inside one
 * frame and the press reads as having done nothing at all. This holds it
 * long enough for the steps to be seen and for the letter's arrival to
 * register as a change.
 *
 * It is a real delay added to a real wait, which is only worth paying
 * because the alternative is a button that looks broken. Kept short
 * enough to stay under the threshold where a wait feels like one.
 */
const MIN_PROGRESS_MS = 1400;

/**
 * Writes a cover letter and puts it in the user's Gmail.
 *
 * Split in two: the letter as the employer will see it on the left, the
 * form that produces it on the right. The preview is the point of the
 * screen, so on a narrow display it stacks *above* the form rather than
 * below it, where it would never be seen.
 *
 * The letter is written on an explicit press of **Generate cover
 * letter**, never automatically. Composing as the user typed meant the
 * letter rewrote itself mid-sentence and spent a TF-IDF pass on every
 * half-typed word; and once somebody has edited a letter, replacing
 * their sentences because they corrected a company name is the fastest
 * way to make a tool untrustworthy. Generating again is offered, with a
 * warning first when there are edits to lose.
 *
 * Validation appears when an action is pressed rather than as the form
 * is filled in, and the action buttons stay enabled while something is
 * missing: a disabled button says "no" without ever saying why.
 *
 * @param {{isOpen: boolean, onClose: () => void, cvs: Array<object>,
 *          initialCvId?: string, gmail: {connected: boolean, email: string,
 *          canCompose: boolean}, onSent?: () => void}} props
 */
export default function ComposeMailModal({
  isOpen,
  onClose,
  cvs,
  initialCvId = '',
  gmail,
  onSent,
}) {
  const dialogRef = useRef(null);
  const toast = useToast();

  const [cvId, setCvId] = useState(initialCvId || cvs[0]?._id || '');
  const [companyName, setCompanyName] = useState('');
  const [to, setTo] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [attachCv, setAttachCv] = useState(true);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState([]);
  // What the composer actually read out of the chosen CV. Shown so the
  // user can see the letter is built from their own document and not
  // from something generic — and so a CV that is emptier than they
  // remember is obvious before the letter goes anywhere.
  const [usedFacts, setUsedFacts] = useState(null);

  // Set the moment the user types in the subject or the body, and never
  // cleared except by an explicit Regenerate.
  const [isEdited, setIsEdited] = useState(false);

  const [isComposing, setIsComposing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);
  // Whether a letter has been generated at all. Separate from `body`
  // being non-empty, because a user may clear the box and still be past
  // the "nothing has happened yet" state.
  const [hasGenerated, setHasGenerated] = useState(false);
  // Set by a failed submit, so the required-field messages appear when
  // the user tries to act rather than while they are still filling in.
  const [showValidation, setShowValidation] = useState(false);

  const isConnected = gmail?.connected && gmail?.canCompose;
  const chosenCv = cvs.find((cv) => cv._id === cvId);
  const attachmentName = attachCv && chosenCv ? `${chosenCv.title || 'CV'}.pdf` : '';

  // Keep the picker pointing at a CV that exists. The list arrives from
  // the server, so on a slow connection the modal can mount before there
  // is anything to choose, and a deleted CV can leave the stored id
  // pointing at nothing.
  useEffect(() => {
    if (cvs.length === 0) return;
    if (!cvs.some((cv) => cv._id === cvId)) setCvId(initialCvId || cvs[0]._id);
  }, [cvs, cvId, initialCvId]);

  // Open and close the native dialog in step with the prop, as the
  // template preview does. `showModal` gives focus trapping and Escape
  // without writing either by hand.
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
   * Composes the letter, on an explicit click.
   *
   * Not debounced and not automatic. Composing on every keystroke meant
   * the letter rewrote itself under the user while they were still
   * typing the company name, and it spent a TF-IDF pass on each draft of
   * a half-typed word. One button, pressed when the inputs are ready, is
   * both calmer to use and cheaper to serve.
   *
   * @returns {Promise<void>}
   */
  const compose = useCallback(async () => {
    // Should be unreachable — the button is disabled without these — but
    // a guard here means a stray call cannot send an invalid request.
    if (!cvId || !companyName.trim()) return;

    setIsComposing(true);
    setError('');

    const startedAt = Date.now();

    try {
      const letter = await previewCoverLetter({
        cvId,
        companyName,
        jobTitle,
        jobDescription:
          jobDescription.trim().length >= MIN_DESCRIPTION ? jobDescription : undefined,
        recipientName,
      });

      // Held back until the panel has had its minimum time, so the
      // letter and the panel change together rather than the text
      // appearing behind a panel still claiming to be writing it.
      const remaining = MIN_PROGRESS_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

      setSubject(letter.subject);
      setBody(letter.body);
      setNotes(letter.notes ?? []);
      setUsedFacts(letter.usedFacts ?? null);
      setIsEdited(false);
      setHasGenerated(true);
    } catch (err) {
      // No delay on the way out: an error should arrive as fast as it
      // happened, not be held back to finish an animation.
      setError(err.message);
    } finally {
      setIsComposing(false);
    }
  }, [cvId, companyName, jobTitle, jobDescription, recipientName]);

  /**
   * Hands the finished letter to Gmail, as a draft or as a real send.
   *
   * @param {'draft'|'send'} action - Which of the two.
   * @returns {Promise<void>}
   */
  async function submit(action) {
    // Reveal the per-field messages instead of failing silently. The
    // buttons stay enabled so that pressing one explains what is wrong,
    // which a disabled button never does.
    if (!isValid) {
      setShowValidation(true);
      setConfirmSend(false);
      setError('Some details are still missing. Check the fields marked below.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const message = { cvId, to, subject, body, attachCv };

      if (action === 'draft') {
        const result = await createGmailDraft(message);
        toast.success(
          result.attached ? 'Draft saved to Gmail with your CV attached' : 'Draft saved to Gmail',
        );
      } else {
        await sendGmailMessage(message);
        toast.success(`Sent to ${to}`);
      }

      onSent?.();
      onClose();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSaving(false);
      setConfirmSend(false);
    }
  }

  /**
   * What is still missing, field by field.
   *
   * Computed on every render rather than stored, so a message clears the
   * moment the field is filled rather than on the next submit. The keys
   * match the fields, so each message sits on its own input instead of
   * all of them piling up in one box at the top.
   */
  const problems = {
    cvId: cvId ? '' : 'Choose which CV to write from',
    companyName: companyName.trim() ? '' : 'Enter the company name',
    to: !to.trim()
      ? 'Enter the recipient’s email address'
      : // A light check only. The server validates properly, and a
        // browser-side rule strict enough to be useful rejects addresses
        // that are perfectly valid.
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())
        ? ''
        : 'That does not look like an email address',
    subject: subject.trim() ? '' : 'The subject cannot be empty',
    body: body.trim() ? '' : 'Generate the letter, or write one, before sending',
    jobDescription:
      jobDescription.trim() && jobDescription.trim().length < MIN_DESCRIPTION
        ? `Paste at least ${MIN_DESCRIPTION} characters, or leave this empty`
        : '',
  };

  const isValid = Object.values(problems).every((message) => !message);
  const canCompose = Boolean(cvId && companyName.trim() && !problems.jobDescription);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="compose-mail-title"
      className="w-[min(1100px,calc(100vw-2rem))] max-w-none rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 dark:bg-navy-900 dark:text-slate-50"
    >
      <div className="relative flex max-h-[calc(100vh-4rem)] flex-col">
        {/* Over the dialog rather than inside it.
            Inline, the panel sat in whichever column had room and moved
            the form around it, and a scrolled form could hide it
            completely. Floating it over the whole dialog puts it in one
            predictable place however the dialog is scrolled, and the
            letter stays legible behind it so the user can see what is
            being replaced. The veil also makes the form unusable while
            it works, which it should be. */}
        {isComposing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 p-6 backdrop-blur-sm dark:bg-navy-900/75">
            <div className="w-full max-w-md">
              <ComposeProgress cvTitle={chosenCv?.title} />
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-navy-700">
          <div>
            <h2 id="compose-mail-title" className="text-lg font-bold">
              Write a cover letter
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Composed from your CV. Edit anything before it goes.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>

        {!isConnected ? (
          // Nothing else on the screen is usable without a connection, so
          // the panel is replaced rather than merely disabled.
          <div className="p-6">
            <Alert variant="info">
              <p className="font-semibold">Gmail is not connected</p>
              <p className="mt-1">
                The letter is written here, but saving it as a draft or sending it needs your Gmail
                account connected first.
              </p>
              <p className="mt-2">
                <Link to="/profile" className="font-medium underline">
                  Connect it on your profile
                </Link>
                , then come back.
              </p>
            </Alert>
          </div>
        ) : (
          <div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-2">
            {/* First in the DOM, so it is also first when the columns
                stack on a narrow screen. It keeps showing the previous
                letter while a new one is written — the progress panel
                lives beside the button that started it, which is where
                the user is looking and, on a scrolled form, the only
                part of the dialog they can see. */}
            <EmailPreview
              from={gmail.email}
              to={to}
              subject={subject}
              body={body}
              attachmentName={attachmentName}
              isBusy={isComposing}
            />

            <div className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Which CV</span>
                <select
                  value={cvId}
                  aria-invalid={showValidation && Boolean(problems.cvId)}
                  onChange={(event) => setCvId(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800"
                >
                  {cvs.map((cv) => (
                    <option key={cv._id} value={cv._id}>
                      {cv.title}
                      {cv.strengthScore ? ` — scores ${cv.strengthScore}/100` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {/* Proof that the letter came out of the chosen CV rather
                  than out of a template. It is also the quickest way to
                  notice the wrong CV is selected, or that the one chosen
                  is emptier than the user remembers. */}
              {usedFacts && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-navy-800">
                  <p className="font-medium">Read from {chosenCv?.title ?? 'this CV'}</p>
                  <dl className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                    {usedFacts.headline && (
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 text-slate-500">Headline</dt>
                        <dd className="truncate">{usedFacts.headline}</dd>
                      </div>
                    )}
                    {usedFacts.position && (
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 text-slate-500">Latest role</dt>
                        <dd className="truncate">
                          {usedFacts.position}
                          {usedFacts.employer ? ` at ${usedFacts.employer}` : ''}
                        </dd>
                      </div>
                    )}
                    {usedFacts.years > 0 && (
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 text-slate-500">Experience</dt>
                        <dd>
                          {usedFacts.years} year{usedFacts.years === 1 ? '' : 's'}
                        </dd>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-slate-500">Skills named</dt>
                      <dd className="truncate">
                        {usedFacts.skills?.length ? usedFacts.skills.join(', ') : 'None'}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-slate-500">Evidence</dt>
                      <dd>
                        {usedFacts.points?.length
                          ? `${usedFacts.points.length} point${
                              usedFacts.points.length === 1 ? '' : 's'
                            } from your CV`
                          : 'Nothing could be cited'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              <TextField
                label="Company"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Sagarmatha Supply"
                error={showValidation ? problems.companyName : ''}
                required
              />

              <TextField
                label="Send to"
                type="email"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="hiring@example.com"
                error={showValidation ? problems.to : ''}
                required
              />

              <TextField
                label="Their name (optional)"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                hint="Used in the greeting. Left out, the letter opens 'Dear Hiring Manager'."
              />

              <TextField
                label="Job title (optional)"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Operations Manager"
              />

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Paste the advert (optional)</span>
                <textarea
                  rows={4}
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the job description to make the letter specific to it."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800"
                />
                {/* Shown as it is typed rather than only on submit: this
                    one blocks the Generate button, so waiting until a
                    submit to explain it would be too late to be useful. */}
                {problems.jobDescription && (
                  <span className="mt-1 block text-sm text-red-600 dark:text-red-400">
                    {problems.jobDescription}
                  </span>
                )}
              </label>

              {/* The generative action, styled like the CV rewrite so the
                  two read as the same kind of thing. Gradient rather than
                  an "AI" label: the composer is a rule-based module, and
                  the claim would have to be defended in the viva. */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={compose}
                  disabled={!canCompose || isComposing}
                  aria-busy={isComposing}
                  className={[
                    'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition',
                    'bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500',
                    'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                  ].join(' ')}
                >
                  <svg
                    className={`h-4 w-4 ${
                      isComposing ? 'animate-pulse motion-reduce:animate-none' : ''
                    }`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5ZM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
                  </svg>
                  {isComposing
                    ? 'Writing…'
                    : hasGenerated
                      ? 'Generate again'
                      : 'Generate cover letter'}
                </button>

                {!canCompose && !isComposing && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose a CV and enter the company name to generate the letter.
                  </p>
                )}

                {hasGenerated && isEdited && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    You have edited the letter. Generating again will replace your changes.
                  </p>
                )}
              </div>

              {/* Hidden until there is a letter. Three empty boxes above
                  the Generate button invited people to type one by hand
                  and then wonder what the button was for. */}
              {hasGenerated && (
                <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-navy-700">
                  <h3 className="text-sm font-semibold">The letter</h3>

                  <TextField
                    label="Subject"
                    value={subject}
                    error={showValidation ? problems.subject : ''}
                    onChange={(event) => {
                      setSubject(event.target.value);
                      setIsEdited(true);
                    }}
                  />

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Letter</span>
                    <textarea
                      rows={10}
                      value={body}
                      aria-invalid={showValidation && Boolean(problems.body)}
                      onChange={(event) => {
                        setBody(event.target.value);
                        setIsEdited(true);
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-navy-600 dark:bg-navy-800"
                    />
                    {showValidation && problems.body && (
                      <span className="mt-1 block text-sm text-red-600 dark:text-red-400">
                        {problems.body}
                      </span>
                    )}
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={attachCv}
                      onChange={(event) => setAttachCv(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Attach my CV as a PDF
                  </label>

                  {/* Not an error — a letter without a CV is a legitimate
                      thing to send, and the PDF render is the one step
                      that can fail on a machine without Chromium. But it
                      is almost never what someone applying for a job
                      means to do, so it is said out loud. */}
                  {!attachCv && (
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Your CV will not be attached. The employer will receive the letter on its own.
                    </p>
                  )}
                </div>
              )}

              {/* What the composer could not evidence from the CV. Advice,
                  not errors — none of it stops the letter being sent. */}
              {notes.length > 0 && (
                <Alert variant="info">
                  <p className="font-semibold">Before you send</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </div>
          </div>
        )}

        {isConnected && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 p-5 dark:border-navy-700">
            {confirmSend ? (
              // The confirmation names the recipient, because the mistake
              // being guarded against is the wrong address, not the wrong
              // button.
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
              // Deliberately not disabled while something is missing: a
              // disabled button says "no" without saying why. Pressing
              // either one reveals the field messages instead.
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
                  Save as draft
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
