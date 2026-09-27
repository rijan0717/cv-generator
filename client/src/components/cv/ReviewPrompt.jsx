import { useState, useEffect } from 'react';
import * as reviewApi from '../../api/reviews.js';
import StarRating from '../ui/StarRating.jsx';
import Button from '../ui/Button.jsx';
import Alert from '../ui/Alert.jsx';
import Spinner from '../ui/Spinner.jsx';

/**
 * The review section shown after a CV is downloaded.
 *
 * It appears on every download, whatever the format and whatever the
 * template, because it is part of the download flow rather than a one-off
 * survey. It can always be dismissed without answering.
 *
 * Any review the user has already left is loaded into the form, so rating
 * again edits that review rather than being refused as a duplicate. The
 * server upserts on the user id, so there is never more than one review per
 * person however many times this is submitted.
 *
 * @param {{context?: string, onClose: () => void}} props
 */
export default function ReviewPrompt({ context = '', onClose }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasExisting, setHasExisting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    reviewApi
      .getMyReview()
      .then((existing) => {
        if (cancelled || !existing) return;
        setRating(existing.rating);
        setComment(existing.comment ?? '');
        setHasExisting(true);
      })
      .catch(() => {
        // A failed lookup just means starting from blank. It must never
        // interfere with the download that has already succeeded.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Saves the rating and shows a short acknowledgement. */
  async function handleSubmit(event) {
    event.preventDefault();

    if (rating === 0) {
      setError('Please choose a rating first');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const saved = await reviewApi.saveReview({ rating, comment: comment.trim(), context });
      setResult(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Thank you</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {result.isPublic
            ? 'Your review may now appear on our home page.'
            : 'Your feedback has been recorded and will be read by the team.'}
        </p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            {hasExisting ? 'Update your review' : 'How was that?'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Your CV has downloaded. A quick rating helps us improve &mdash; it is optional.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <span className="sr-only">Close</span>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      {isLoading ? (
        <div className="mt-4 text-slate-500 dark:text-slate-400">
          <Spinner label="Loading your review" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4">
          <Alert variant="error">{error}</Alert>

          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} size="lg" label="Your rating" />
          </div>

          <label
            htmlFor="review-comment"
            className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Anything you would like to add?
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={400}
            placeholder="Optional"
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{comment.length}/400</p>

          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm" isLoading={isSaving}>
              {hasExisting ? 'Update review' : 'Send feedback'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Not now
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
