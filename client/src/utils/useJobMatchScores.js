import { useState, useEffect } from 'react';
import * as matchApi from '../api/jobMatch.js';

/**
 * Scores the jobs currently on screen against the user's primary CV.
 *
 * Fetched separately from the jobs themselves so the board renders
 * immediately and the badges fill in behind it. A visitor who is not
 * signed in, or a user with no primary CV, simply gets no scores — that
 * is a normal state, not an error, so nothing is shown in either case.
 *
 * A failure is swallowed deliberately. A missing badge is a small loss;
 * an error banner across a working job board, because an optional extra
 * did not load, is a bigger one.
 *
 * @param {Array<{_id: string}>} jobs - The jobs on screen.
 * @param {boolean} isEnabled - False when signed out, which skips the call.
 * @returns {{scores: Record<string, {matchScore: number, band: string}>,
 *            primaryCv: {_id: string, title: string}|null,
 *            isScoring: boolean}}
 */
export function useJobMatchScores(jobs, isEnabled) {
  const [scores, setScores] = useState({});
  const [primaryCv, setPrimaryCv] = useState(null);
  const [isScoring, setIsScoring] = useState(false);

  // The ids, as one string, so the effect re-runs when the page of jobs
  // changes but not when the array is merely rebuilt with the same jobs —
  // which is what happens every time a bookmark is toggled.
  const jobIds = jobs.map((job) => job._id).join(',');

  useEffect(() => {
    if (!isEnabled || !jobIds) {
      setScores({});
      setPrimaryCv(null);
      return undefined;
    }

    let cancelled = false;
    setIsScoring(true);

    matchApi
      .scoreJobs(jobIds.split(','))
      .then((data) => {
        if (cancelled) return;

        setPrimaryCv(data.cv);
        setScores(
          Object.fromEntries(
            data.scores.map((score) => [
              score.id,
              { matchScore: score.matchScore, band: score.band },
            ]),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setScores({});
      })
      .finally(() => {
        if (!cancelled) setIsScoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobIds, isEnabled]);

  return { scores, primaryCv, isScoring };
}

export default useJobMatchScores;
