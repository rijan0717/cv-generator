/** One action button in the content list. */

/**
 * One of the small links under a row's title.
 *
 * A button rather than a link, because every one of them acts on the
 * row rather than navigating. They are styled down to look like the
 * row actions they are.
 *
 * @param {{onClick: () => void, danger?: boolean, disabled?: boolean,
 *          children: React.ReactNode}} props
 */
export function RowAction({ onClick, danger, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'disabled:cursor-not-allowed disabled:opacity-50',
        danger
          ? 'text-red-600 hover:underline dark:text-red-600'
          : 'text-slate-600 hover:underline dark:text-slate-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
