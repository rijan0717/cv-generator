import api from './axios.js';

/**
 * Searches what only the server knows: blog posts, published pages, open
 * jobs and open-to-work people. Public.
 * @param {string} q - At least 2 characters.
 * @param {'all'|'blog'|'pages'|'jobs'|'people'} [type] - Narrow to one group.
 * @param {{signal?: AbortSignal}} [options] - Lets a newer keystroke cancel this request.
 * @returns {Promise<{query: string, blog: object[], pages: object[], jobs: object[],
 *                    people: object[]}>}
 */
export async function searchSite(q, type = 'all', { signal } = {}) {
  const { data } = await api.get('/api/search', { params: { q, type }, signal });
  return data.data;
}
