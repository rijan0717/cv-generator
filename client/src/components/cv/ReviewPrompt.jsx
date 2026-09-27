import { useState } from 'react';
import * as reviewApi from '../../api/reviews.js';
import StarRating from '../ui/StarRating.jsx';
import Button from '../ui/Button.jsx';
import Alert from '../ui/Alert.jsx';
import { markReviewSkipped } from '../../utils/reviewSkip.js';

/**
 * Asks for a rating after a CV has been downloaded.
 *
 * It appears at the moment the user has actually got something out of the
 * application, which is when a rating means anything. It is always
 * skippable, and skipping is remembered so nobody is nagged on every
 * download.
 *
 * @param {{context?: string, onClose: () => void}} props
 */
export default function ReviewPrompt({ context = '', onClose }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  /** Saves the review and shows a short acknowledgement. */
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

  /** Dismisses the prompt and remembers not to ask again. */
  function handleSkip() {
    markReviewSkipped();
    onClose();
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
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">How was that?</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Your CV has downloaded. A quick rating helps us improve &mdash; it is optional.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <span className="sr-only">Skip</span>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

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
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:ring-slate-600 dark:focus:ring-slate-100"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{comment.length}/400</p>

        <div className="mt-4 flex gap-2">
          <Button type="submit" size="sm" isLoading={isSaving}>
            Send feedback
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
        </div>
      </form>
    </div>
  );
}
