/** The empty state shared by every tab. */

/** Says there is nothing to show, and offers a way out of the filter. */
export function Empty({ message, onClear }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 py-14 text-center dark:border-navy-700">
      <p className="text-sm text-slate-600 dark:text-slate-100">{message}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 text-sm font-semibold text-brand-fuchsia hover:underline dark:text-fuchsia-400"
        >
          Clear the search
        </button>
      )}
    </div>
  );
}
