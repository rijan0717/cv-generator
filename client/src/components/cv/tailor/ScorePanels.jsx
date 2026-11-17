/** Match score, page fill and the figures beside them. */

/**
 * How much of an A4 page the draft fills, and what would fill the rest.
 *
 * Shown because a half-empty page is the most visible thing about a CV
 * and the one the rewrite can do least about. The bar makes the gap
 * obvious at a glance; the sentence beside it says the rewrite has
 * stopped rather than that it failed, which is the honest description:
 * everything the algorithm could do with the user's own material has
 * been done, and what is left needs facts only they have.
 *
 * Nothing is shown once the page is full. A green "you are fine" panel on
 * every rewrite is noise, and the user has the preview beside them.
 *
 * @param {{fill: object}} props - The `pageFill` estimate from the server.
 */
export function PageFillPanel({ fill }) {
  if (!fill || fill.isFull) return null;

  const percent = Math.round(fill.ratio * 100);
  const started = Number.isFinite(fill.startRatio) ? Math.round(fill.startRatio * 100) : null;
  const gained = started !== null ? percent - started : 0;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-amber-200 dark:bg-navy-900 dark:ring-amber-100">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-50">
          This fills about {percent}% of a page
        </h2>

        {gained > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-100">
            up from {started}% before the rewrite
          </p>
        )}
      </div>

      {/* The bar is decoration over the number, never instead of it. */}
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800"
        role="img"
        aria-label={`${percent} per cent of an A4 page is filled`}
      >
        <div
          className="h-full rounded-full bg-amber-400 dark:bg-amber-500"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-100">
        The rewrite has filled what it can from your own material — it lengthened the summary with
        facts already on your CV and set the type larger. It will not write experience you do not
        have, so the rest of the page is yours. Add it in the builder after saving, or in your
        original CV before rewriting again.
      </p>
    </section>
  );
}

/**
 * The match score before and after, side by side.
 *
 * Shown first and shown honestly: if the rewrite did not improve the
 * score, that is what the user sees. A feature that only ever reported
 * good news would be worth nothing.
 *
 * @param {{comparison: {before: object, after: object, honest?: object,
 *           fieldFit?: string}}} props
 */
export function ScoreComparison({ comparison }) {
  const { before, after, honest, fieldFit } = comparison;
  const difference = after.matchScore - before.matchScore;

  // How much of the "after" figure rests on skills the CV cannot
  // evidence. The user is about to be asked to confirm or delete those,
  // so they need to know what deleting them costs before they decide —
  // not afterwards, when the number has already moved.
  const assumedWorth =
    typeof honest?.matchScore === 'number' ? after.matchScore - honest.matchScore : 0;

  return (
    <section className="rounded-xl bg-white dark:bg-navy-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-navy-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-50">Match against this job</h2>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Figure label="Before" value={before.matchScore} band={before.band} />
        <span aria-hidden="true" className="text-2xl text-slate-300 dark:text-slate-600">
          →
        </span>
        <Figure label="After" value={after.matchScore} band={after.band} />

        <p
          className={[
            'rounded-full px-3 py-1 text-sm font-medium',
            difference > 0
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-50 dark:text-emerald-700'
              : difference < 0
                ? 'bg-red-50 text-red-700 dark:bg-red-50 dark:text-red-700'
                : 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-100',
          ].join(' ')}
        >
          {difference > 0 ? `+${difference}` : difference} points
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-100">
        CV strength {before.strengthScore} → {after.strengthScore} out of 100.
      </p>

      {assumedWorth > 0 && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-100">
          <strong className="font-semibold text-slate-900 dark:text-slate-50">
            {honest.matchScore} of those points
          </strong>{' '}
          come from your own experience. The other {assumedWorth} rest on the skills assumed below —
          delete any you do not have and the score falls back to {honest.matchScore}, which is the
          figure an employer would recognise.
        </p>
      )}

      {fieldFit === 'different' && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-700">
          This advert is from a different field to your CV, so the rewrite re-ordered and reworded
          what you have and stopped there. It did not assume skills you have never mentioned.
        </p>
      )}
    </section>
  );
}

/**
 * One score with its band label.
 * @param {{label: string, value: number, band: string}} props
 */
export function Figure({ label, value, band }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-100">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-100">{band}</p>
    </div>
  );
}
