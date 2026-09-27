/**
 * Reviews: leaving one, and reading the public testimonials.
 */
import { Review, PUBLIC_RATING_THRESHOLD } from '../models/Review.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * GET /api/reviews
 *
 * The testimonials shown on the home page. This is a public endpoint, so it
 * is careful about what it returns: the reviewer's first name and initial
 * only, never their email or id. A testimonial should not be a way to
 * enumerate the people who use the system.
 */
export async function listPublicReviews(req, res) {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 12));

  const reviews = await Review.find({
    rating: { $gt: PUBLIC_RATING_THRESHOLD },
    isHidden: false,
  })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // The overall average is taken across every visible review, not only the
  // ones on display, so the figure is honest.
  const [summary] = await Review.aggregate([
    { $match: { isHidden: false } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  sendSuccess(
    res,
    {
      reviews: reviews.map((review) => ({
        id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        context: review.context,
        createdAt: review.createdAt,
        author: displayName(review.user?.name),
      })),
      summary: {
        average: summary ? Math.round(summary.average * 10) / 10 : 0,
        count: summary?.count ?? 0,
      },
    },
    'Reviews',
  );
}

/**
 * Shortens a full name for public display: "Jane Doe" becomes "Jane D.".
 * @param {string} name - The reviewer's stored name.
 * @returns {string} A display name safe to show publicly.
 */
function displayName(name) {
  if (!name?.trim()) return 'A user';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];

  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

/**
 * GET /api/reviews/mine
 * The logged-in user's own review, so the form can be pre-filled and the
 * client knows whether to prompt at all.
 */
export async function getMyReview(req, res) {
  const review = await Review.findOne({ user: req.user._id }).lean();
  sendSuccess(res, { review: review ?? null }, 'Your review');
}

/**
 * POST /api/reviews
 *
 * Creates or updates the user's review. An upsert rather than an insert,
 * because the model allows one review per person and someone changing their
 * mind should not hit a duplicate-key error.
 */
export async function saveReview(req, res) {
  const { rating, comment, context } = req.body;

  const review = await Review.findOneAndUpdate(
    { user: req.user._id },
    {
      user: req.user._id,
      rating,
      comment: comment ?? '',
      context: context ?? '',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

  sendSuccess(
    res,
    {
      review,
      isPublic: review.rating > PUBLIC_RATING_THRESHOLD,
    },
    'Thank you for your feedback',
  );
}
