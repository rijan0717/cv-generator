import { useEffect, useRef, useState } from 'react';

/** The OAuth client ID from client/.env. Empty means Google sign-in is off. */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

/** Google's own sign-in script. Loaded only on pages that show the button. */
const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/** One shared promise, so two buttons never load the script twice. */
let scriptPromise = null;

/**
 * Adds Google's sign-in script to the page once.
 * @returns {Promise<void>} Resolves when `window.google` is ready.
 */
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * "Continue with Google".
 *
 * Google draws the button itself (its branding rules require that) inside
 * the div below. When the person picks an account, Google calls back with
 * a signed ID token — the `credential` — which is handed to `onCredential`
 * for the server to verify. No password and no Google secret ever pass
 * through the browser.
 *
 * Renders nothing when no client ID is configured, so the page looks the
 * same as before on a machine where Google sign-in has not been set up.
 *
 * @param {{onCredential: (credential: string) => void,
 *          text?: 'continue_with'|'signin_with'|'signup_with'}} props
 */
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const container = useRef(null);
  const [error, setError] = useState('');

  // The latest callback, so re-renders of the page do not re-draw the button.
  const callback = useRef(onCredential);
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !container.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callback.current(response.credential),
        });
        window.google.accounts.id.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          width: container.current.offsetWidth || 320,
        });
      })
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;

  return (
    <div>
      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      <div ref={container} className="mt-4 flex min-h-[44px] w-full justify-center" />
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
