import Button from '../ui/Button.jsx';

/**
 * Wraps any repeatable CV section (education, experience, and so on) with the
 * add, remove and reorder controls, so each individual section only has to
 * describe its own fields.
 *
 * Entries are keyed by their MongoDB `_id` where one exists. New entries have
 * no id yet, so a locally generated `_key` is used until the next save
 * returns real ids. Using the array index as a key would make React reuse the
 * wrong input when an entry is moved or deleted.
 *
 * @param {{
 *   title: string,
 *   entries: Array<object>,
 *   onChange: (entries: Array<object>) => void,
 *   emptyEntry: () => object,
 *   addLabel?: string,
 *   children: (entry: object, update: (patch: object) => void) => React.ReactNode
 * }} props
 */
export default function RepeatableSection({
  title,
  entries,
  onChange,
  emptyEntry,
  addLabel = 'Add entry',
  children,
}) {
  /**
   * Replaces one entry with a patched copy.
   * @param {number} index - Position of the entry.
   * @param {object} patch - Fields to change.
   */
  function updateEntry(index, patch) {
    const next = entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    onChange(next);
  }

  /** Appends a blank entry. */
  function addEntry() {
    onChange([...entries, { ...emptyEntry(), _key: crypto.randomUUID() }]);
  }

  /**
   * Removes one entry.
   * @param {number} index - Position of the entry.
   */
  function removeEntry(index) {
    onChange(entries.filter((_, i) => i !== index));
  }

  /**
   * Moves an entry up or down.
   * @param {number} index - Current position.
   * @param {number} direction - -1 for up, +1 for down.
   */
  function moveEntry(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;

    const next = [...entries];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <Button variant="secondary" size="sm" onClick={addEntry} type="button">
          {addLabel}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Nothing added yet.</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {entries.map((entry, index) => (
            <li
              key={entry._id ?? entry._key ?? index}
              className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {title} {index + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveEntry(index, -1)}
                    disabled={index === 0}
                    className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                  >
                    <span className="sr-only">Move up</span>
                    <span aria-hidden="true">&uarr;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveEntry(index, 1)}
                    disabled={index === entries.length - 1}
                    className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                  >
                    <span className="sr-only">Move down</span>
                    <span aria-hidden="true">&darr;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    className="rounded p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <span className="sr-only">Remove</span>
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
              </div>

              {children(entry, (patch) => updateEntry(index, patch))}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
