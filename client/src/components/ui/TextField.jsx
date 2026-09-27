import { useId, useState } from 'react';

/**
 * A labelled text input with an error message.
 *
 * Every field is given a real `<label htmlFor>` and, when invalid,
 * `aria-invalid` plus `aria-describedby` pointing at the message. That is
 * what lets a screen reader read the error out with the field.
 *
 * A field of `type="password"` automatically gains a show/hide button, so
 * every password box in the application behaves the same way without each
 * form having to ask for it.
 *
 * @param {{label: string, error?: string, hint?: string, className?: string,
 *          type?: string}} props
 */
export default function TextField({
  label,
  error,
  hint,
  className = '',
  id,
  type = 'text',
  ...rest
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const [isRevealed, setIsRevealed] = useState(false);

  const isPassword = type === 'password';
  // Only the rendered type changes; `isPassword` still drives the button, so
  // revealing the text does not make the toggle disappear.
  const inputType = isPassword && isRevealed ? 'text' : type;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>

      <div className="relative mt-1">
        <input
          id={fieldId}
          type={inputType}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          className={[
            'block w-full rounded-lg px-3 py-2 text-sm shadow-sm ring-1',
            'text-slate-900 dark:bg-slate-800 dark:text-slate-100',
            'placeholder:text-slate-400 focus:outline-none focus:ring-2',
            // Room for the button, so long text never runs underneath it.
            isPassword ? 'pr-10' : '',
            error
              ? 'ring-red-400 focus:ring-red-500'
              : 'ring-slate-300 focus:ring-slate-900 dark:ring-slate-600 dark:focus:ring-slate-100',
          ].join(' ')}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsRevealed((shown) => !shown)}
            // The input already has a label; this button needs its own, and
            // it must say what will happen, not what is showing.
            aria-label={isRevealed ? 'Hide password' : 'Show password'}
            aria-pressed={isRevealed}
            // Skipped in the tab order: it is a convenience, and stopping
            // between every password field and the next control would be
            // more annoying than helpful.
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {isRevealed ? (
              // Crossed-out eye: clicking hides the password again.
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.7 3.9" />
                <path d="M6.2 6.7A11.6 11.6 0 003 12c0 2.5 4 7 9 7a9.7 9.7 0 003.6-.7" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
