/** What the rewrite changed, line by line, with the before and after. */

import { wordDiff, similarity } from '../../../utils/wordDiff.js';

/**
 * One entry in the list of changes, with its before and after.
 * @param {{change: object}} props
 */
export function ChangeRow({ change }) {
  return (
    <li className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-navy-800">
      <p className="font-medium text-slate-900 dark:text-slate-50">
        <span className="capitalize">{change.section}</span>
        {change.field ? ` · ${change.field}` : ''}
        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-normal capitalize text-slate-700 dark:bg-slate-700 dark:text-slate-100">
          {change.kind}
        </span>
      </p>

      <p className="mt-1 text-slate-600 dark:text-slate-100">{change.reason}</p>

      <ChangeText before={change.before} after={change.after} />
    </li>
  );
}

/**
 * The before and after of one change.
 *
 * When most of the line survived, it is shown once with the edits marked
 * in place — removed words struck through in red, new words in green — so
 * the user sees exactly what was touched. When the text was replaced
 * wholesale (a rebuilt summary), an inline diff would be a wall of colour,
 * so the two versions are shown one above the other instead.
 *
 * @param {{before?: string, after?: string}} props
 */
export function ChangeText({ before, after }) {
  const runs = before && after ? wordDiff(String(before), String(after)) : null;

  if (runs && similarity(runs) >= 0.4) {
    return (
      <p className="mt-2 leading-relaxed text-slate-800 dark:text-slate-50">
        {runs.map((run, index) =>
          run.type === 'same' ? (
            <span key={index}>{run.text}</span>
          ) : run.type === 'removed' ? (
            <del
              key={index}
              className="rounded bg-red-100 px-0.5 text-red-700 dark:bg-red-50 dark:text-red-700"
            >
              {run.text}
            </del>
          ) : (
            <ins
              key={index}
              className="rounded bg-emerald-100 px-0.5 font-medium text-emerald-800 no-underline dark:bg-emerald-50 dark:text-emerald-700"
            >
              {run.text}
            </ins>
          ),
        )}
      </p>
    );
  }

  return (
    <>
      {before ? (
        <p className="mt-2 text-slate-500 line-through dark:text-slate-100">{before}</p>
      ) : null}
      {after ? <p className="mt-1 text-slate-800 dark:text-slate-50">{after}</p> : null}
    </>
  );
}

/**
 * One line summing up what the rewrite did, as counts by kind of change:
 * "5 lines reworded · 2 skills added · summary rewritten".
 *
 * @param {{changes: Array<object>}} props
 */
export function RewriteOverview({ changes }) {
  if (!changes?.length) return null;

  const count = (test) => changes.filter(test).length;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const reworded = count((c) => c.kind === 'reworded');
  const skillsAdded = count((c) => c.section === 'skills' && c.kind === 'added');
  const reordered = count((c) => c.kind === 'reordered');

  const items = [
    reworded > 0 && `${plural(reworded, 'line')} reworded`,
    skillsAdded > 0 && `${plural(skillsAdded, 'skill')} added from your experience`,
    changes.some((c) => c.section === 'summary') && 'summary rewritten',
    changes.some((c) => c.section === 'personal') && 'headline matched to the job',
    reordered > 0 && `${plural(reordered, 'section')} re-ordered by relevance`,
  ].filter(Boolean);

  return (
    <section className="rounded-xl bg-gradient-to-r from-sky-50 to-fuchsia-50 p-5 ring-1 ring-fuchsia-200 dark:from-sky-50/40 dark:to-fuchsia-950/40 dark:ring-fuchsia-900">
      <h2 className="font-semibold text-slate-900 dark:text-slate-50">What the rewrite did</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-navy-900 dark:text-slate-100 dark:ring-navy-700"
          >
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-100">
        Every change uses facts already on your CV — nothing about your experience was made up.
        Changed words are highlighted below.
      </p>
    </section>
  );
}
