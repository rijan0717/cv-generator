import api from './axios.js';

/**
 * Loads the public testimonials and the overall rating summary.
 * This endpoint needs no session: the home page shows it to visitors.
 * @param {{limit?: number}} params
 * @returns {Promise<{reviews: Array<object>, summary: {average: number, count: number}}>}
 */
export async function listPublicReviews(params = {}) {
  const { data } = await api.get('/api/reviews', { params });
  return data.data;
}

/**
 * Loads the logged-in user's own review, or null if they have not left one.
 * @returns {Promise<object|null>}
 */
export async function getMyReview() {
  const { data } = await api.get('/api/reviews/mine');
  return data.data.review;
}

/**
 * Creates or updates the user's review.
 * @param {{rating: number, comment?: string, context?: string}} payload
 * @returns {Promise<{review: object, isPublic: boolean}>}
 */
export async function saveReview(payload) {
  const { data } = await api.post('/api/reviews', payload);
  return data.data;
}
