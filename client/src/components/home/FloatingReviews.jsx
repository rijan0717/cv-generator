import { useState, useEffect } from 'react';
import * as reviewApi from '../../api/reviews.js';
import StarRating from '../ui/StarRating.jsx';

/**
 * Testimonial cards that drift gently on the home page.
 *
 * Only reviews above three stars reach this component, because the server
 * filters them out; the client never has to decide what is fit to show.
 *
 * The section renders nothing at all when there are no reviews yet, rather
 * than showing an empty shell or invented placeholder quotes. An empty area
 * is more honest than a fake one.
 */
export default function FloatingReviews() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    reviewApi
      .listPublicReviews({ limit: 9 })
      .then((data) => {
        if (cancelled) return;
        setReviews(data.reviews);
        setSummary(data.summary);
      })
      .catch(() => {
        // A failed testimonial fetch must never break the landing page.
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || reviews.length === 0) return null;

  return (
    <section className="border-y border-slate-200 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              What people say
            </h2>
            {summary?.count > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <StarRating value={Math.round(summary.average)} readOnly size="sm" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {summary.average} out of 5 &middot; {summary.count}{' '}
                  {summary.count === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            )}
          </div>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <li
              key={review.id}
              className="cvg-float rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
              // Staggered so the cards drift out of step with each other
              // rather than moving as one block.
              style={{ animationDelay: `${(index % 3) * 0.8}s` }}
            >
              <StarRating value={review.rating} readOnly size="sm" />

              {review.comment && (
                <blockquote className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  &ldquo;{review.comment}&rdquo;
                </blockquote>
              )}

              <footer className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                {review.author}
                {review.context && <> &middot; {review.context}</>}
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
