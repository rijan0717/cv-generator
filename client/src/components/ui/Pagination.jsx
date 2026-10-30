import Button from './Button.jsx';

/**
 * Page controls shared by every paginated list in the application.
 *
 * It lived in `components/admin/` while only the admin lists were
 * paginated. It moved here once the user-facing lists needed it too: a
 * component used by the job board and the CV dashboard should not be
 * filed under "admin", and the shared location is what keeps every list
 * in the project behaving the same way.
 *
 * The control shows numbered pages rather than only Previous and Next.
 * With a hundred test accounts the user list is five pages, and reaching
 * the last one by clicking Next four times is not reasonable; with five
 * hundred it is twenty-five clicks. Numbers make any page one click away.
 *
 * @param {{pagination: {page: number, pages: number, total: number, limit: number},
 *          onChange: (page: number) => void,
 *          onLimitChange?: (limit: number) => void,
 *          pageSizes?: number[],
 *          label?: string}} props
 */
export default function Pagination({
  pagination,
  onChange,
  onLimitChange,
  pageSizes = [10, 20, 50],
  label = 'items',
}) {
  // Nothing to page through, and no page size worth offering either.
  if (!pagination || (pagination.pages <= 1 && !onLimitChange)) return null;

  const { page, pages, total, limit } = pagination;

  // Which row of the whole set is on screen, e.g. "21–40 of 203". More
  // useful than the page number alone when the list is long.
  const firstRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastRow = Math.min(page * limit, total);

  return (
    <nav
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {total === 0 ? (
          `No ${label}`
        ) : (
          <>
            Showing{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">{firstRow}</span>–
            <span className="font-medium text-slate-700 dark:text-slate-200">{lastRow}</span> of{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span> {label}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onLimitChange && (
          <label className="mr-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Per page</span>
            <select
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        {pages > 1 && (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => onChange(page - 1)}
              aria-label="Previous page"
            >
              Previous
            </Button>

            {buildPageList(page, pages).map((entry, index) =>
              entry === GAP ? (
                // A gap is decorative, so it is hidden from screen readers:
                // the page buttons either side already say where they lead.
                <span
                  key={`gap-${index}`}
                  aria-hidden="true"
                  className="px-1 text-sm text-slate-400"
                >
                  &hellip;
                </span>
              ) : (
                <Button
                  key={entry}
                  size="sm"
                  variant={entry === page ? 'primary' : 'secondary'}
                  onClick={() => onChange(entry)}
                  aria-label={`Page ${entry}`}
                  // Tells a screen reader which page is the current one,
                  // which colour alone cannot convey.
                  aria-current={entry === page ? 'page' : undefined}
                >
                  {entry}
                </Button>
              ),
            )}

            <Button
              size="sm"
              variant="secondary"
              disabled={page >= pages}
              onClick={() => onChange(page + 1)}
              aria-label="Next page"
            >
              Next
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}

/** Marks where page numbers were left out. */
const GAP = '...';

/**
 * Works out which page numbers to show.
 *
 * Printing every number breaks the layout once a list runs to twenty-five
 * pages, so the list is trimmed to: the first page, the last page, the
 * current page with one either side, and a gap marker wherever numbers
 * were skipped. That keeps the control a fixed width whatever the total.
 *
 * Worked example with `pages = 25`:
 *   page 1  -> 1 2 3 … 25
 *   page 13 -> 1 … 12 13 14 … 25
 *   page 25 -> 1 … 23 24 25
 *
 * @param {number} page - The current page.
 * @param {number} pages - How many pages there are.
 * @returns {Array<number|string>} Page numbers, with `GAP` between runs.
 */
function buildPageList(page, pages) {
  // Seven or fewer fit comfortably, so no trimming is needed.
  if (pages <= 7) return Array.from({ length: pages }, (unused, index) => index + 1);

  // A Set, because the window around the current page overlaps the first
  // and last pages at either end of the range and would duplicate them.
  const wanted = new Set([1, pages, page, page - 1, page + 1]);

  // Keep the control the same width at the ends, where the window has
  // nothing on one side of it to spend its places on.
  if (page <= 3) [2, 3, 4].forEach((number) => wanted.add(number));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((number) => wanted.add(number));

  const numbers = [...wanted]
    .filter((number) => number >= 1 && number <= pages)
    .sort((a, b) => a - b);

  const withGaps = [];
  let previous = 0;

  for (const number of numbers) {
    // More than one step since the last number means some were skipped.
    if (number - previous > 1) withGaps.push(GAP);
    withGaps.push(number);
    previous = number;
  }

  return withGaps;
}
