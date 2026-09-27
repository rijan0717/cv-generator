import { useId } from 'react';

/**
 * A labelled text input with an error message.
 *
 * Every field is given a real `<label htmlFor>` and, when invalid,
 * `aria-invalid` plus `aria-describedby` pointing at the message. That is
 * what lets a screen reader read the error out with the field.
 *
 * @param {{label: string, error?: string, hint?: string, className?: string}} props
 */
export default function TextField({ label, error, hint, className = '', id, ...rest }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        className={[
          'mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 shadow-sm ring-1',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2',
          error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-slate-900',
        ].join(' ')}
        {...rest}
      />

      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
