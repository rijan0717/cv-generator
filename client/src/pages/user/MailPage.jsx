import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getGmailStatus,
  startGmailConnect,
  listGmailDrafts,
  listGmailSent,
  getGmailSent,
  sendGmailDraft,
  deleteGmailDraft,
} from '../../api/gmail.js';
import * as cvApi from '../../api/cvs.js';
import { useToast } from '../../context/useToast.js';
import { useConfirm } from '../../context/useConfirm.js';
import ComposeMessageModal from '../../components/mail/ComposeMessageModal.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * A date and time a person can read, to the minute.
 *
 * Gmail hands back an RFC 2822 header — "Thu, 5 Nov 2026 05:30:12 -0600"
 * — which is precise and unreadable. Seconds and the UTC offset are
 * dropped because neither tells the user anything about a letter they
 * wrote, and the time is rendered in their own timezone rather than the
 * sender's. `en-GB` matches the date format used everywhere else in the
 * application; `hour12` is the one deviation, because a 12-hour clock is
 * what people read a mailbox in.
 *
 * @param {string|Date} value - A date header, or an ISO timestamp.
 * @returns {string} e.g. "05/11/2026, 5:30 am", or '' if unparseable.
 */
function formatMailDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Turns Gmail's snippet back into the text it came from.
 *
 * Snippets arrive HTML-escaped, so an address quoted in a reply reads as
 * "&lt;rijan@example.com&gt;" on screen. Decoded through the browser's
 * own parser rather than a list of replacements, so every entity is
 * handled; `textContent` is read back, so nothing in the snippet can
 * render as markup.
 *
 * @param {string} snippet - The snippet from Gmail.
 * @returns {string} The same text, readable.
 */
function decodeSnippet(snippet) {
  if (!snippet) return '';

  const element = document.createElement('textarea');
  element.innerHTML = snippet;
  return element.textContent ?? '';
}

/**
 * The top line of a sent letter: subject, recipient, when, and what went with it.
 *
 * Its own component because it is rendered twice — inside a button when
 * the letter can be opened, and as plain markup when it cannot — and the
 * two must not drift apart.
 *
 * @param {{letter: object, isOpen: boolean}} props
 */
function SentHeader({ letter, isOpen }) {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{letter.subject || '(no subject)'}</p>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Sent
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatMailDate(letter.sentAt)}
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        To {letter.to || '—'}
        {letter.attached && ` · ${letter.cvTitle || 'CV'} attached`}
        {letter.hasBody ? (
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            {isOpen ? 'Hide letter' : 'Read letter'}
          </span>
        ) : (
          // Honest about the gap rather than silently showing nothing:
          // these went out before a copy was kept, and Gmail will not
          // give them back under the permission held here.
          <span className="ml-2 text-xs text-slate-400">no copy kept</span>
        )}
      </p>
    </>
  );
}

/**
 * "Mail": what this application has put in, and sent from, the user's Gmail.
 *
 * Two lists, and neither is an inbox. The permission held here,
 * `gmail.compose`, covers writing drafts, reading them back and sending
 * them; it cannot read the mailbox, so:
 *
 *   - **Drafts** comes from Gmail itself, and is every draft in the
 *     mailbox. Gmail gives no way to tell ours apart from the user's own,
 *     and filtering on something like the subject would hide their drafts
 *     from them — worse than showing one more than they expected.
 *   - **Sent** comes from our own activity log, because the Sent folder
 *     cannot be read. It is therefore what went out from here, which the
 *     page says plainly rather than implying it is the whole story.
 */
export default function MailPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [gmail, setGmail] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [sent, setSent] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  // Which draft the compose dialog is editing. Empty means it is open on
  // a new message; the dialog loads the draft itself from the id.
  const [editingDraftId, setEditingDraftId] = useState('');
  // The sent letter currently expanded, and its text once fetched. The
  // list carries headers only, so the body is asked for when a row is
  // opened rather than for all twenty-five up front.
  const [openSentId, setOpenSentId] = useState('');
  const [sentBodies, setSentBodies] = useState({});
  // The draft id currently being sent or deleted, so only its own row
  // shows a busy state rather than the whole list freezing.
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const status = await getGmailStatus();
      setGmail(status);

      // The drafts call needs a live connection; asking for it without one
      // would answer 409, which is a worse way to find out than asking the
      // status first.
      if (status.connected && status.canCompose) {
        const [draftList, sentList, cvPage] = await Promise.all([
          listGmailDrafts(),
          listGmailSent(),
          cvApi.listCVs({ limit: 50 }),
        ]);
        setDrafts(draftList.drafts ?? []);
        setSent(sentList.sent ?? []);
        setCvs(cvPage.cvs ?? []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Sends one draft, after the row's own confirmation.
   * @param {object} draft - The draft row.
   * @returns {Promise<void>}
   */
  async function handleSend(draft) {
    // The dialog names the recipient, because the mistake being guarded
    // against is the wrong address rather than the wrong button.
    const confirmed = await confirm({
      title: 'Send this letter now?',
      message: `It will go to ${draft.to || 'the recipient'} from your own Gmail, and cannot be recalled.`,
      confirmLabel: 'Send it',
      danger: true,
    });
    if (!confirmed) return;

    setBusyId(draft.id);
    try {
      await sendGmailDraft(draft.id);
      toast.success(`Sent to ${draft.to || 'the recipient'}`);
      // Gmail removes a sent draft from the drafts list, so the lists are
      // reloaded rather than patched: the draft leaves one and the log
      // entry appears in the other.
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId('');
    }
  }

  /**
   * Opens the compose dialog on a draft, to edit before it goes.
   *
   * Only the id is passed; the dialog fetches the letter itself, so the
   * list is never asked for twenty-five bodies it would not show.
   *
   * @param {object} draft - The draft row.
   * @returns {void}
   */
  function handleEdit(draft) {
    setEditingDraftId(draft.id);
    setIsComposeOpen(true);
  }

  /**
   * Expands a sent letter, fetching its text the first time.
   *
   * Pressing the same row again closes it. Letters sent before this
   * application kept its own copy have no text to show — Gmail cannot be
   * asked for it with the permission held here — and those rows say so
   * instead of opening.
   *
   * @param {object} letter - The sent row.
   * @returns {Promise<void>}
   */
  async function toggleSent(letter) {
    if (openSentId === letter.id) {
      setOpenSentId('');
      return;
    }

    setOpenSentId(letter.id);

    if (!letter.hasBody || sentBodies[letter.id]) return;

    try {
      const full = await getGmailSent(letter.id);
      setSentBodies((current) => ({ ...current, [letter.id]: full.body }));
    } catch (err) {
      toast.error(err.message);
      setOpenSentId('');
    }
  }

  /**
   * Deletes one draft, permanently.
   * @param {object} draft - The draft row.
   * @returns {Promise<void>}
   */
  async function handleDelete(draft) {
    const confirmed = await confirm({
      title: draft.subject ? `Delete "${draft.subject}"?` : 'Delete this draft?',
      message: 'Gmail has no bin for drafts, so it cannot be recovered.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;

    setBusyId(draft.id);
    try {
      await deleteGmailDraft(draft.id);
      setDrafts((current) => current.filter((row) => row.id !== draft.id));
      toast.success('Draft deleted');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId('');
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  // The server has no Google credentials at all, so there is nothing for
  // the user to connect to and a button would be a dead end.
  if (gmail && !gmail.configured) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <h1 className="text-2xl font-bold">Mail</h1>
        <Alert variant="info" className="mt-4">
          Mail is not set up on this installation.
        </Alert>
      </div>
    );
  }

  const isConnected = gmail?.connected && gmail?.canCompose;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mail</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {isConnected
              ? `Drafts in ${gmail.email}. This app can write drafts and send them; it cannot read your inbox.`
              : 'Connect your Gmail to write and send mail without leaving this app.'}
          </p>
          {isConnected && (
            // The two are different jobs and now live in different
            // places: anything can be typed here, but a letter written
            // from a CV belongs on the page built for it.
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Writing to an employer?{' '}
              <Link to="/cover-letter" className="font-medium underline">
                Write a cover letter from your CV
              </Link>
              .
            </p>
          )}
        </div>

        {isConnected && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingDraftId('');
              setIsComposeOpen(true);
            }}
          >
            Compose
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {!isConnected ? (
        <div className="mt-6 rounded-lg border border-slate-200 p-6 text-center dark:border-navy-700">
          <h2 className="text-lg font-semibold">Gmail is not connected</h2>
          <p className="mx-auto mt-2 max-w-prose text-sm text-slate-600 dark:text-slate-300">
            {gmail?.connected
              ? 'Your connection does not include permission to compose. Connecting again will ask for it.'
              : 'Connecting lets this app put a finished cover letter, with your CV attached, straight into your Gmail drafts. It asks for permission to compose only — your inbox is never read.'}
          </p>
          <Button variant="primary" className="mt-4" onClick={startGmailConnect}>
            {gmail?.connected ? 'Connect again' : 'Connect Gmail'}
          </Button>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            You can disconnect at any time from{' '}
            <Link to="/profile" className="underline">
              your profile
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Drafts</h2>

            {drafts.length === 0 ? (
              <div className="mt-3 rounded-lg border border-slate-200 p-6 text-center dark:border-navy-700">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Letters you save appear here, and in Gmail itself.
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-navy-700 dark:border-navy-700">
                {drafts.map((draft) => (
                  <li key={draft.id} className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{draft.subject || '(no subject)'}</p>
                      {draft.date && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatMailDate(draft.date)}
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      To {draft.to || '—'}
                    </p>
                    {draft.snippet && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                        {decodeSnippet(draft.snippet)}
                      </p>
                    )}

                    {/* Both destructive actions go through the shared
                        confirm dialog, so they look and behave like
                        deleting a CV does rather than inventing a second
                        way of asking. */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {/* First, and the only one of the three that is
                          not final: reading a draft back before it goes
                          is the thing a person does most often, and
                          until now it could only be done by leaving for
                          Gmail. */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEdit(draft)}
                        disabled={Boolean(busyId)}
                      >
                        Open
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSend(draft)}
                        isLoading={busyId === draft.id}
                        disabled={Boolean(busyId)}
                      >
                        Send now
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(draft)}
                        disabled={Boolean(busyId)}
                      >
                        Delete
                      </Button>
                      <a
                        href={`https://mail.google.com/mail/u/0/#drafts?compose=${
                          draft.messageId ?? ''
                        }`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium underline"
                      >
                        Open in Gmail
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {sent.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Sent</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Letters sent from here. Your Gmail Sent folder is not read by this app.
              </p>

              <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-navy-700 dark:border-navy-700">
                {sent.map((letter) => (
                  <li key={letter.id} className="p-4">
                    {/* The whole row opens the letter, because the row
                        is what a person aims at. A letter with no stored
                        copy stays a plain row rather than a button that
                        does nothing when pressed. */}
                    {letter.hasBody ? (
                      <button
                        type="button"
                        onClick={() => toggleSent(letter)}
                        aria-expanded={openSentId === letter.id}
                        className="w-full text-left"
                      >
                        <SentHeader letter={letter} isOpen={openSentId === letter.id} />
                      </button>
                    ) : (
                      <SentHeader letter={letter} isOpen={false} />
                    )}

                    {openSentId === letter.id && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-4 dark:bg-navy-800">
                        {sentBodies[letter.id] ? (
                          // Plain text with its line breaks kept: that
                          // spacing is the only formatting the letter
                          // has, and collapsing it would run every
                          // paragraph together.
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                            {sentBodies[letter.id]}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ComposeMessageModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setEditingDraftId('');
        }}
        cvs={cvs}
        gmail={gmail ?? { connected: false, email: '', canCompose: false }}
        draftId={editingDraftId}
        // A new or edited draft should show up without the user
        // reloading the page.
        onDone={load}
      />
    </div>
  );
}
