/**
 * Pagination helpers shared by every list endpoint.
 *
 * These started life inside the admin controller, because the admin lists
 * were the first ones the requirements asked to paginate. They were moved
 * here when the user-facing lists needed the same thing: three controllers
 * each clamping their own page numbers is three chances to clamp them
 * differently, and a limit that one endpoint enforces and another does not
 * is not really a limit.
 *
 * Both halves of the pair live together on purpose. `readPagination` decides
 * what to fetch and `buildPagination` describes what was fetched, and they
 * have to agree about `limit` for the page count to be right.
 */

/**
 * Largest page a client may ask for.
 *
 * Without a ceiling, `?limit=100000` would pull the whole collection in one
 * request and the pagination would be decorative. 100 is above anything the
 * interface offers, so it never gets in a real user's way.
 */
export const MAX_PAGE_SIZE = 100;

/** Used when the request does not ask for a particular page size. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Reads and clamps the pagination values from the query string.
 *
 * Everything is defensive: `Number()` on a missing or non-numeric parameter
 * gives `NaN`, which is falsy, so the default applies; negative and zero
 * values are raised to 1, because a negative `skip` is an error in MongoDB
 * rather than a sensible request.
 *
 * @param {import('express').Request} req - The request.
 * @param {number} [defaultLimit] - Page size when the query does not set one.
 * @returns {{page: number, limit: number, skip: number}} Values for the query.
 */
export function readPagination(req, defaultLimit = DEFAULT_PAGE_SIZE) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || defaultLimit));

  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Builds the `pagination` object every paginated response carries.
 *
 * Keeping the shape in one function means the client can rely on it: every
 * list it fetches reports its position the same way, so one `Pagination`
 * component works for all of them.
 *
 * @param {{page: number, limit: number}} paging - From `readPagination`.
 * @param {number} total - Matching documents, before the page was taken.
 * @returns {{page: number, limit: number, total: number, pages: number}}
 */
export function buildPagination({ page, limit }, total) {
  return {
    page,
    limit,
    total,
    // At least one page, so an empty list reports "page 1 of 1" rather than
    // "page 1 of 0", which would read as though a page were missing.
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
