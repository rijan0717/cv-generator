import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import { getTemplate } from '../../templates/index.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * "My CVs": the list of the user's CVs, with the actions from the
 * requirements — create, edit, duplicate, rename and delete.
 */
export default function DashboardPage() {
  const navigate = useNavigate();

  const [cvs, setCvs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    cvApi
      .listCVs()
      .then((list) => {
        if (!cancelled) setCvs(list);
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
      const copy = await cvApi.duplicateCV(id);
      setCvs((current) => [copy, ...current]);
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
      setCvs((current) => current.filter((cv) => cv._id !== id));
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
              className="flex flex-wrap items-center gap-4 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/cvs/${cv._id}`}
                  className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                >
                  {cv.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {getTemplate(cv.templateKey).name} &middot; updated{' '}
                  {new Date(cv.updatedAt).toLocaleDateString('en-GB')}
                </p>
              </div>

              <PrimaryToggle cv={cv} onToggle={() => togglePrimary(cv)} />

              <ScorePill score={cv.strengthScore} />

              <div className="flex items-center gap-2">
                <Link to={`/cvs/${cv._id}`}>
                  <Button size="sm" variant="secondary">
                    Edit
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
    </div>
  );
}

/**
 * The CV strength score. It stays at zero until Phase 5 implements the
 * scorer, so it is shown as "not scored" rather than as a misleading 0.
 * @param {{score: number}} props
 */
function ScorePill({ score }) {
  if (!score) {
    return <span className="text-xs text-slate-500 dark:text-slate-400">Not scored yet</span>;
  }

  const tone =
    score >= 75
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : score >= 50
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{score}/100</span>
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
