/** The two form controls the review is built from. */

/**
 * A titled card around one editable part of the draft.
 * @param {{title: string, hint?: string, children: React.ReactNode}} props
 */
export function EditableSection({ title, hint, children }) {
  return (
    <section className="rounded-xl bg-white dark:bg-navy-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-navy-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500 dark:text-slate-100">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * A labelled multi-line field, matching `TextField` for a single line.
 *
 * `TextField` renders an `<input>`, and a rewritten description is
 * several sentences long, so it needs its own component rather than a
 * taller input.
 *
 * @param {{label: string, value: string, rows?: number,
 *          onChange: (value: string) => void}} props
 */
export function TextArea({ label, value, rows = 4, onChange }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-100">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 dark:bg-navy-800 dark:text-slate-50 dark:ring-slate-600 dark:focus:ring-slate-100"
      />
    </label>
  );
}
