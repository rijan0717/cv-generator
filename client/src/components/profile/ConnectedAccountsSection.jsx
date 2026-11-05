import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/useToast.js';
import * as gmailApi from '../../api/gmail.js';
import { useConfirm } from '../../context/useConfirm.js';
import Button from '../ui/Button.jsx';

/**
 * The "Connected accounts" card on the profile page.
 *
 * Connecting leaves the application entirely — Google's consent screen is a
 * page the user must see, and it cannot be framed or fetched in the
 * background. So the outcome comes back as `?gmail=…` on the URL when Google
 * returns the user here, and this component turns that into a toast and then
 * cleans the query string, so a refresh does not repeat the message.
 */

/**
 * Why a connection attempt failed, in words the user can act on.
 *
 * `access_denied` is the one worth spelling out. It usually does not mean the
 * user pressed Cancel: composing mail is a Google *restricted* scope, so
 * while the app is unverified only accounts on its test-user list may consent
 * at all. Reported as "Google refused" with no explanation, it looks exactly
 * like a bug in this application.
 */
const FAILURE_MESSAGES = {
  access_denied:
    'Google refused the connection. If you did not press Cancel, this account is probably not on the app’s test-user list in Google Cloud Console.',
  'not-configured': 'Connecting Gmail is not set up on this server yet.',
  'bad-state': 'That connection link had expired. Please try again.',
  'no-code': 'Google did not return a connection code. Please try again.',
  'exchange-failed': 'Google would not complete the connection. Please try again.',
};

/**
 * The green or red marker that says whether something is connected.
 *
 * A dot alone would carry the whole meaning in colour, which is lost to a
 * colour-blind reader and to anyone using a screen reader, so the word
 * beside it says the same thing. The dot is then decoration and is hidden
 * from assistive technology rather than read out twice.
 *
 * @param {{isOn: boolean, onLabel?: string, offLabel?: string}} props
 */
function StatusDot({ isOn, onLabel = 'Connected', offLabel = 'Not connected' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${isOn ? 'bg-emerald-500' : 'bg-red-500'}`}
      />
      <span
        className={`text-xs font-medium ${
          isOn ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
        }`}
      >
        {isOn ? onLabel : offLabel}
      </span>
    </span>
  );
}

/**
 * @param {{user: object}} props - The signed-in user, for the Google row.
 */
export default function ConnectedAccountsSection({ user }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setStatus(await gmailApi.getGmailStatus());
    } catch (error) {
      // A page that failed to load says so in the page, not in a toast.
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Report the result of a round trip through Google, once.
  useEffect(() => {
    const outcome = searchParams.get('gmail');
    if (!outcome) return;

    if (outcome === 'connected') {
      toast.success('Your Gmail account is connected');
    } else {
      const reason = searchParams.get('reason') ?? '';
      toast.error(FAILURE_MESSAGES[reason] ?? 'Your Gmail account could not be connected.');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('gmail');
    next.delete('reason');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  async function handleDisconnect() {
    // Losing a connection silently would be worse than one extra click.
    // The shared dialog, not `window.confirm`: it is themed, it keeps the
    // card visible behind it, and it is how every other destructive
    // action in the application asks.
    const confirmed = await confirm({
      title: 'Disconnect Gmail?',
      message: status?.email
        ? `${status.email} will be disconnected. Drafts already in Gmail stay there, and you can connect again at any time.`
        : 'Drafts already in Gmail stay there, and you can connect again at any time.',
      confirmLabel: 'Disconnect',
      danger: true,
    });
    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      const { revokedAtGoogle } = await gmailApi.disconnectGmail();
      if (revokedAtGoogle) {
        toast.success('Your Gmail account has been disconnected');
      } else {
        toast.error(
          'Disconnected here, but Google could not be reached. Please also remove the app at myaccount.google.com/permissions',
        );
      }
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDisconnecting(false);
    }
  }

  // A server with no Google credentials cannot offer this, and a button that
  // silently does nothing would be worse than none at all.
  //
  // In production the card simply disappears: an end user has no way to fix
  // somebody else's server configuration, so the offer is noise to them.
  // In development it stays and says what is missing — hiding it there turns
  // a one-line `.env` mistake into a hunt through the React tree.
  const isUnconfigured = !isLoading && !loadError && status && !status.configured;
  if (isUnconfigured && !import.meta.env.DEV) return null;

  return (
    <section className="rounded-xl bg-white dark:bg-navy-900 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-navy-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-50">Connected accounts</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-100">
        Connect Gmail to write a cover letter straight into a draft in your own mailbox.
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-100">Checking your connection…</p>
      )}

      {!isLoading && loadError && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 font-medium underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {isUnconfigured && (
        <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">Not set up on this server</p>
          <p className="mt-1">
            This note only appears in development. Add{' '}
            <code className="font-mono">GOOGLE_CLIENT_ID</code>,{' '}
            <code className="font-mono">GOOGLE_CLIENT_SECRET</code>,{' '}
            <code className="font-mono">GOOGLE_REDIRECT_URI</code> and{' '}
            <code className="font-mono">GMAIL_TOKEN_KEY</code> to{' '}
            <code className="font-mono">server/.env</code>, then restart the server — a running
            server does not pick up a changed <code className="font-mono">.env</code>.
          </p>
        </div>
      )}

      {/* Signing in with Google and connecting Gmail are two different
          grants — a person can have either without the other — so they are
          two rows with the same marker rather than one combined line.
          Sign-in comes first because it is the one that already happened. */}
      {user?.hasGoogle && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-50 p-4 dark:bg-navy-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-900 dark:text-slate-50">Google sign-in</p>
              <StatusDot isOn onLabel="Connected" />
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-100">
              Signed in as {user.email}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !loadError && status?.configured && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-50 p-4 dark:bg-navy-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-900 dark:text-slate-50">Gmail</p>
              <StatusDot isOn={Boolean(status.connected)} />
            </div>

            {/* The marker above already says connected or not, so this line
                adds only what it cannot: which account. The address comes
                from Google rather than from anything the user typed, so it
                is how someone spots that they authorised the wrong one. It
                is blank when the optional email scope was not granted,
                which is not worth an error. */}
            {status.connected && status.email && (
              <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-100">
                {status.email}
              </p>
            )}

            {status.connected && !status.canCompose && (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Permission to compose mail was not granted. Please connect again and leave that box
                ticked.
              </p>
            )}
          </div>

          {status.connected ? (
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              isLoading={isDisconnecting}
              disabled={isDisconnecting}
            >
              Disconnect
            </Button>
          ) : (
            <Button onClick={gmailApi.startGmailConnect}>Connect Gmail</Button>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-100">
        We ask only for permission to create and send drafts. This app cannot read your inbox.
      </p>
    </section>
  );
}
