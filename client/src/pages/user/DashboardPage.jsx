import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import { getTemplate } from '../../templates/index.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

/**
 * "My CVs": the list of the user's CVs, with the actions from the
 * requirements — create, edit, duplicate, rename and delete.
 *
 * The list is paginated. Because only one page is in memory at a time,
 * adding or removing a CV can no longer be done by editing the array on
 * screen: deleting the last row of page 2 has to pull a CV up from page
 * 3, and the client does not have page 3. Every change therefore reloads
 * the page it affects.
 */
export default function DashboardPage() {
  const navigate = useNavigate();

  const [cvs, setCvs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busyId, setBusyId] = useState(null);

  /**
   * Loads one page of CVs.
   *
   * Returns the result as well as storing it, so a caller that has just
   * deleted something can look at the new totals and decide whether the
   * page it is on still exists.
   *
   * @param {number} targetPage - The page to load.
   * @returns {Promise<object|null>} The response, or null if it failed.
   */
  const load = useCallback(
    async (targetPage) => {
      setIsLoading(true);
      try {
        const data = await cvApi.listCVs({ page: targetPage, limit });
        setCvs(data.cvs);
        setPagination(data.pagination);
        return data;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  /** Creates a CV and goes straight into the editor. */
  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setIsCreating(true);

    try {
      const created = await cvApi.createCV({ title: newTitle.trim() || 'Untitled CV' });
      navigate(`/cvs/${created._id}`);
    } catch (err) {
      setError(err.message);
      setIsCreating(false);
    }
  }

  /**
   * Duplicates a CV and adds the copy to the list.
   * @param {string} id - The CV to copy.
   */
  async function handleDuplicate(id) {
    setBusyId(id);
    setError('');
    try {
      await cvApi.duplicateCV(id);
      // The copy is the most recently updated CV, so it belongs at the top
      // of page 1. Going there is both correct and what the user expects:
      // the copy they just made should be the one they can see.
      if (page === 1) await load(1);
      else setPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Makes a CV the primary one, or clears the flag if it already is.
   *
   * The list is updated optimistically and every other row is cleared at
   * the same time, because only one CV can be primary and the user should
   * see that immediately rather than after a round trip.
   *
   * @param {object} cv - The CV being toggled.
   */
  async function togglePrimary(cv) {
    const makingPrimary = !cv.isPrimary;
    const previous = cvs;

    setCvs((current) =>
      current.map((row) => ({
        ...row,
        isPrimary: makingPrimary && row._id === cv._id,
      })),
    );

    try {
      if (makingPrimary) await cvApi.setPrimaryCV(cv._id);
      else await cvApi.clearPrimaryCV(cv._id);
    } catch (err) {
      setCvs(previous);
      setError(err.message);
    }
  }

  /**
   * Deletes a CV after confirming, because it disappears from the list.
   * @param {string} id - The CV to delete.
   * @param {string} title - Shown in the confirmation.
   */
  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? You will not be able to open it again.`)) return;

    setBusyId(id);
    setError('');
    try {
      await cvApi.deleteCV(id);

      // Deleting the only row on the last page would leave the user
      // looking at an empty page that no longer exists, so step back one.
      const onlyRowOnPage = cvs.length === 1 && page > 1;
      if (onlyRowOnPage) setPage(page - 1);
      else await load(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            My CVs
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Keep one CV per kind of role, and tailor each to the job.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleCreate}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
      >
        <TextField
          label="New CV title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="e.g. Software Developer CV"
          className="min-w-[240px] flex-1"
        />
        <Button type="submit" isLoading={isCreating}>
          Create CV
        </Button>
      </form>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading your CVs" />
        </div>
      ) : cvs.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-12 text-center">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">No CVs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Create your first CV above. You can change the template and styling at any time.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {cvs.map((cv) => (
            <li
              key={cv._id}
              className="relative flex flex-wrap items-center gap-4 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 dark:ring-slate-700 dark:hover:ring-slate-600"
            >
              <div className="min-w-0 flex-1">
                {/*
                  The `after:` layer stretches this link across the whole
                  row, so clicking anywhere on it opens the editor rather
                  than only the title. The buttons on the right sit above
                  it (`relative z-10`) and keep working.
                */}
                <Link
                  to={`/cvs/${cv._id}`}
                  className="font-medium text-slate-900 dark:text-slate-100 hover:underline after:absolute after:inset-0 after:rounded-xl"
                >
                  {cv.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {getTemplate(cv.templateKey).name} &middot; updated{' '}
                  {new Date(cv.updatedAt).toLocaleDateString('en-GB')}
                  {/*
                    Only CVs produced by the rewrite carry this, and it is
                    the one thing that distinguishes two otherwise similar
                    rows in a list full of near-identical CVs.
                  */}
                  {cv.tailoredFor?.jobTitle && (
                    <> &middot; tailored for {cv.tailoredFor.jobTitle}</>
                  )}
                </p>
              </div>

              {/* Everything below is above the stretched link. */}
              <div className="relative z-10">
                <PrimaryToggle cv={cv} onToggle={() => togglePrimary(cv)} />
              </div>

              <ScorePill score={cv.strengthScore} />

              <div className="relative z-10 flex items-center gap-2">
                <Link to={`/cvs/${cv._id}`}>
                  <Button size="sm" variant="secondary">
                    Edit
                  </Button>
                </Link>
                {/*
                  Tailoring produces a new CV rather than changing this
                  one, so it sits with the other actions that add a row
                  to this list rather than with Edit.
                */}
                <Link to={`/cvs/${cv._id}/tailor`}>
                  <Button size="sm" variant="ghost">
                    Tailor for a job
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDuplicate(cv._id)}
                  isLoading={busyId === cv._id}
                >
                  Duplicate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(cv._id, cv.title)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && cvs.length > 0 && (
        <Pagination
          pagination={pagination}
          onChange={setPage}
          onLimitChange={(next) => {
            // The row that was at the top of the old page is not at the top
            // of the new one, so there is no sensible page to stay on.
            setLimit(next);
            setPage(1);
          }}
          pageSizes={[12, 24, 48]}
          label="CVs"
        />
      )}
    </div>
  );
}

/**
 * The CV strength score, recalculated by the server on every save.
 *
 * Every CV carries a score, including one that is completely empty. An
 * empty CV genuinely scores 0, and showing that is more useful than
 * hiding it behind "not scored yet": the number is exactly what tells
 * the user there is work left to do, and a row with no number reads as
 * if the feature had failed.
 *
 * The score always reflects the details actually in the CV, because the
 * model recalculates it on every save that changed content.
 *
 * @param {{score: number}} props
 */
function ScorePill({ score }) {
  // A CV saved before scoring existed has no stored score. It is a 0
  // like any other empty CV rather than a blank.
  const value = Number.isFinite(score) ? score : 0;

  const tone =
    value >= 75
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : value >= 50
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
      title={`AI score ${value} out of 100, from how complete this CV is and how well it is written`}
    >
      AI score ({value})
    </span>
  );
}

/**
 * The star that marks a CV as primary.
 *
 * A real button with `aria-pressed` rather than a clickable icon, so it
 * is reachable by keyboard and announced as a toggle. The label says what
 * pressing it will do, not what the current state is.
 *
 * @param {{cv: object, onToggle: () => void}} props
 */
function PrimaryToggle({ cv, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={Boolean(cv.isPrimary)}
      title={
        cv.isPrimary
          ? 'This is your primary CV, offered first when you apply for a job'
          : 'Make this your primary CV'
      }
      className={[
        'flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition',
        cv.isPrimary
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill={cv.isPrimary ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path
          strokeLinejoin="round"
          d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"
        />
      </svg>
      <span className="hidden sm:inline">{cv.isPrimary ? 'Primary' : 'Set primary'}</span>
      <span className="sr-only">
        {cv.isPrimary ? 'Remove primary status from this CV' : 'Make this CV primary'}
      </span>
    </button>
  );
}
