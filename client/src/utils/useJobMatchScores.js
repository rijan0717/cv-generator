import { useState, useEffect } from 'react';
import * as matchApi from '../api/jobMatch.js';

/**
 * The most job ids one scoring request may carry.
 *
 * `POST /api/job-match/scores` refuses more than this, so a board showing
 * more jobs than this — which it does whenever the match filter is on —
 * has to ask in batches. Matching the server's own limit here means the
 * two cannot drift apart silently: raise it there and this still works,
 * lower it there and this starts failing loudly rather than dropping
 * scores.
 */
const MAX_IDS_PER_REQUEST = 50;

/**
 * Splits a list into chunks of at most `size`.
 * @param {Array} items - The list.
 * @param {number} size - The largest chunk.
 * @returns {Array<Array>} The chunks.
 */
function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * Scores the jobs currently on screen against the user's primary CV.
 *
 * Fetched separately from the jobs themselves so the board renders
 * immediately and the badges fill in behind it. A visitor who is not
 * signed in, or a user with no primary CV, simply gets no scores — that
 * is a normal state, not an error, so nothing is shown in either case.
 *
 * Long lists are scored in batches, because the endpoint takes at most
 * fifty ids at a time and the board asks for the whole lot whenever the
 * match filter is on. The batches run together rather than in sequence:
 * they are independent, and the badges should not arrive in waves.
 *
 * A failure is swallowed deliberately. A missing badge is a small loss;
 * an error banner across a working job board, because an optional extra
 * did not load, is a bigger one.
 *
 * @param {Array<{_id: string}>} jobs - The jobs on screen.
 * @param {boolean} isEnabled - False when signed out, which skips the call.
 * @returns {{scores: Record<string, {matchScore: number, band: string,
 *                                     tailored: object|null}>,
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

    Promise.all(
      chunk(jobIds.split(','), MAX_IDS_PER_REQUEST).map((batch) => matchApi.scoreJobs(batch)),
    )
      .then((batches) => {
        if (cancelled) return;

        // Every batch names the same primary CV, so the first is enough.
        setPrimaryCv(batches[0]?.cv ?? null);

        setScores(
          Object.fromEntries(
            batches.flatMap((data) =>
              data.scores.map((score) => [
                score.id,
                {
                  matchScore: score.matchScore,
                  band: score.band,

                  // Present only where the user has already rewritten a CV
                  // for that advert. It carries the before-and-after pair
                  // recorded at the time, which is what the badge shows
                  // instead of a single figure.
                  tailored: score.tailored ?? null,
                },
              ]),
            ),
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
