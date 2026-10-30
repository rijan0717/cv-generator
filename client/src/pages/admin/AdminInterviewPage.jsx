import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as interviewApi from '../../api/interview.js';
import { useToast } from '../../context/useToast.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** The levels a position can be offered at, weakest first. */
const LEVELS = ['junior', 'mid', 'senior'];

/**
 * Interview preparation: the positions users can prepare for.
 *
 * A position is listed here whether or not it is switched on, because the
 * thing an admin most needs to see is the one that is *not* yet offered
 * and why — which is almost always "it has not got enough questions yet".
 * Each row therefore shows its counts per level against the number an
 * exam needs, so the gap is visible without opening anything.
 */
export default function AdminInterviewPage() {
  const toast = useToast();
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    let cancelled = false;

    interviewApi
      .listPositions()
      .then((data) => {
        if (!cancelled) setPositions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Adds a position with nothing but a title. Everything else, including
   * its questions, is filled in on the position's own page — asking for
   * all of it up front would be a form nobody wants before they have
   * decided the position is worth having.
   * @param {React.FormEvent} event - The submit event.
   */
  async function create(event) {
    event.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);

    try {
      const position = await interviewApi.createPosition({ title: title.trim() });
      setPositions((current) =>
        [...current, position].sort((a, b) => a.title.localeCompare(b.title)),
      );
      setTitle('');
      toast.success(`"${position.title}" created. Add its questions next.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  /**
   * Switches a position on or off.
   *
   * The server refuses to switch one on without enough questions, and its
   * message names the level and the shortfall, so that is shown as-is
   * rather than replaced with something vaguer.
   *
   * @param {object} position - The position being changed.
   */
  async function toggle(position) {
    setBusyId(position.id);

    try {
      const updated = await interviewApi.updatePosition(position.id, {
        isActive: !position.isActive,
      });
      setPositions((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      toast.success(
        `"${updated.title}" is now ${updated.isActive ? 'offered to users' : 'hidden'}.`,
      );
    } catch (err) {
      // The server's refusal names the level and the shortfall, so it is
      // passed on word for word.
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading positions" />
      </div>
    );
  }

  const activeCount = positions.filter((position) => position.isActive).length;

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          Interview preparation <span className="text-slate-500">({activeCount} offered)</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          A position is offered to users only once every level it covers has enough questions for an
          exam.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="new-position" className="sr-only">
          New position title
        </label>
        <input
          id="new-position"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a position, e.g. Frontend Developer"
          maxLength={120}
          className="min-w-0 flex-1 rounded-lg border-0 py-2 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        />
        <Button type="submit" isLoading={isCreating} disabled={!title.trim()}>
          Add position
        </Button>
      </form>

      {positions.length === 0 ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">No positions yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Add one above, then write its questions. Users see nothing here until a position is
            switched on.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {positions.map((position) => (
            <li
              key={position.id}
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/interview/${position.id}`}
                      className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                    >
                      {position.title}
                    </Link>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {position.slug}
                    </code>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {position.levels.map((level) => {
                      const have = position.questionCounts?.[level] ?? 0;
                      const need = position.examSettings.questionCount;
                      const isShort = have < need;

                      return (
                        <span
                          key={level}
                          className={
                            isShort
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {level}: {have}/{need}
                          {isShort && ' — too few'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <span
                  className={
                    position.isActive
                      ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }
                >
                  {position.isActive ? 'Offered' : 'Hidden'}
                </span>

                <div className="flex gap-1">
                  <Button
                    as={Link}
                    to={`/admin/interview/${position.id}`}
                    size="sm"
                    variant="ghost"
                  >
                    Questions
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={busyId === position.id}
                    onClick={() => toggle(position)}
                  >
                    {position.isActive ? 'Withdraw' : 'Offer to users'}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        Levels: {LEVELS.join(', ')}. Withdrawing a position hides it from search; nobody loses an
        exam they have already taken.
      </p>
    </div>
  );
}
