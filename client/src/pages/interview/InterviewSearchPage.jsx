import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as interviewApi from '../../api/interview.js';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** The levels a position can be offered at, weakest first. */
const LEVELS = ['junior', 'mid', 'senior'];

/**
 * Search for a position to prepare for.
 *
 * The search runs on the server, where the same preprocessing the job
 * matcher uses turns "front end dev" into terms that reach "Frontend
 * Developer". It is debounced rather than tied to a button, because the
 * list is short and a user looking for a job title wants to see it
 * narrow as they type.
 */
export default function InterviewSearchPage() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [basedOnCV, setBasedOnCV] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Waits for a pause in typing, so one request is sent rather than
    // one per keystroke.
    const timer = setTimeout(() => {
      setError('');

      interviewApi
        .searchPositions({
          search: query,
          level: level || undefined,
          // With nothing typed, start from the user's own CV rather
          // than listing every position in the catalogue.
          suggested: !query.trim() && !showAll ? 'true' : undefined,
        })
        .then((data) => {
          if (cancelled) return;
          setPositions(data.positions);
          setBasedOnCV(data.basedOnCV);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, level, showAll]);

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Interview preparation
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Find the position you are interviewing for, study the questions and the reasoning behind
          them, then test yourself.
        </p>
      </header>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="sr-only">Search positions</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a position, e.g. frontend developer"
            className="w-full rounded-lg border-0 bg-white py-2.5 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Level">
          {[{ key: '', label: 'All levels' }, ...LEVELS.map((key) => ({ key, label: key }))].map(
            (chip) => (
              <button
                key={chip.key || 'all'}
                type="button"
                aria-pressed={level === chip.key}
                onClick={() => setLevel(chip.key)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium capitalize transition',
                  level === chip.key
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
                ].join(' ')}
              >
                {chip.label}
              </button>
            ),
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {/* Says where the list came from, so a short list does not read as
          "that is all there is". */}
      {basedOnCV && !query.trim() && (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Suggested from your CV.{' '}
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="font-medium underline underline-offset-2"
          >
            Browse every position instead
          </button>
        </p>
      )}

      {isLoading ? (
        <div className="grid min-h-[30vh] place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading positions" />
        </div>
      ) : positions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            {query ? `Nothing matches “${query}”` : 'No positions available yet'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            {query
              ? 'Try a shorter search, or clear the level filter.'
              : 'Positions appear here once an administrator has added questions and switched one on.'}
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {positions.map((position) => (
            <li key={position.id}>
              <Link
                to={`/interview/${position.slug}`}
                className="block h-full rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 dark:ring-slate-700"
              >
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  {position.title}
                </h2>

                {position.industry && (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {position.industry}
                  </p>
                )}

                {position.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                    {position.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {position.levels.map((entry) => (
                    <span
                      key={entry}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      {entry} &middot; {position.questionCounts?.[entry] ?? 0} questions
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
