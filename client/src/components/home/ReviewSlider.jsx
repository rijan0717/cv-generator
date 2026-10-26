import { useEffect, useState } from 'react';
import { listPublicReviews } from '../../api/reviews.js';
import StarRating from '../ui/StarRating.jsx';

/** Seconds each card takes to cross the strip; more cards, longer loop. */
const SECONDS_PER_CARD = 5;

/** Fewer cards than this would leave a gap at the end of the strip. */
const MIN_CARDS_PER_LOOP = 8;

/**
 * A full-width strip of small review cards under the hero that slides
 * slowly to the left without stopping.
 *
 * How the endless loop works: the list of cards is drawn twice, one copy
 * after the other, and the whole row is moved left by exactly half its
 * width. At that point the second copy sits where the first one started,
 * so the animation can jump back to the start without a visible seam.
 *
 * The reviews come from GET /api/reviews, so nothing here is invented. If
 * there are no public reviews yet (or the request fails) the strip is not
 * shown. The row pauses while the pointer or keyboard focus is on it.
 */
export default function ReviewSlider() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);

  // Load the reviews once. A failure just leaves the strip hidden: the home
  // page should never show an error because of testimonials.
  useEffect(() => {
    let isCurrent = true;

    listPublicReviews({ limit: 12 })
      .then((data) => {
        if (!isCurrent) return;
        setReviews(data.reviews.filter((review) => review.comment?.trim()));
        setSummary(data.summary);
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, []);

  if (reviews.length === 0) return null;

  // With only a few reviews, repeat them so one copy is wider than the
  // screen; otherwise the end of the row would show as empty space.
  const loop = [];
  while (loop.length < MIN_CARDS_PER_LOOP) loop.push(...reviews);

  return (
    <div className="pb-8">
      {summary?.count > 0 && (
        <p className="mb-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <StarRating value={Math.round(summary.average)} size="sm" readOnly />
          <span>
            {summary.average} from {summary.count} review{summary.count === 1 ? '' : 's'}
          </span>
        </p>
      )}

      <section aria-label="What users say" className="cvg-marquee-mask overflow-hidden">
        <ul
          className="cvg-marquee flex w-max gap-4 py-1"
          style={{ animationDuration: `${loop.length * SECONDS_PER_CARD}s` }}
        >
          {/* The second copy is only there for the loop, so screen readers
              skip it and read each review once. */}
          {[0, 1].map((copy) =>
            loop.map((review, position) => (
              <li
                key={`${copy}-${position}`}
                aria-hidden={copy === 1 || position >= reviews.length}
                className="w-72 shrink-0 rounded-md border border-slate-200 bg-white px-4 py-3 text-left dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                  &ldquo;{review.comment}&rdquo;
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <StarRating value={review.rating} size="sm" readOnly />
                  <span className="truncate">— {review.author}</span>
                </p>
              </li>
            )),
          )}
        </ul>
      </section>
    </div>
  );
}
