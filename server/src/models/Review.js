/**
 * Review model.
 *
 * A user is invited to rate the application after they download a CV, which
 * is the moment they have actually got value from it. The prompt can always
 * be skipped.
 *
 * Only reviews of more than three stars are shown publicly on the home page.
 * That is a product decision worth stating plainly: the home page is
 * marketing, not a support channel, and a one-star review belongs in front
 * of the admin rather than a prospective user. Every review, whatever its
 * rating, is stored and visible in the admin panel.
 */
import mongoose from 'mongoose';

/** A review must beat this to appear on the home page. */
export const PUBLIC_RATING_THRESHOLD = 3;

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // One review per person. Rating again updates the existing one rather
      // than letting a single user fill the home page.
      unique: true,
    },

    rating: {
      type: Number,
      required: [true, 'Please choose a rating'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [400, 'Please keep your comment under 400 characters'],
      default: '',
    },

    /**
     * Set when the review was left, so the home page can say what the person
     * was doing. Denormalised on purpose: the CV it refers to may later be
     * deleted, and the testimonial should survive that.
     */
    context: {
      type: String,
      default: '',
    },

    /**
     * Lets an admin take a review off the home page without deleting it,
     * for example if the comment is abusive but the rating is high.
     */
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

/** The home page query: high-rated, not hidden, newest first. */
reviewSchema.index({ rating: -1, isHidden: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
export default Review;
