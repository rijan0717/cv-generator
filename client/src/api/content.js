import api from './axios.js';

/**
 * The header and footer links the admin has published.
 * @returns {Promise<{header: Array<object>, footer: Array<object>}>}
 */
export async function getNavigation() {
  const { data } = await api.get('/api/content/nav');
  return data.data;
}

/**
 * Published blog posts, newest first.
 * @param {{page?: number, limit?: number}} params
 * @returns {Promise<{posts: Array<object>, pagination: object}>}
 */
export async function listPosts(params = {}) {
  const { data } = await api.get('/api/content/posts', { params });
  return data.data;
}

/**
 * One published page or post.
 * @param {string} slug
 * @returns {Promise<object>} The content.
 */
export async function getBySlug(slug) {
  const { data } = await api.get(`/api/content/${slug}`);
  return data.data.content;
}

/**
 * Every page and post, drafts included. Admin only.
 * @param {{page?: number, type?: string, status?: string, search?: string}} params
 * @returns {Promise<{content: Array<object>, pagination: object}>}
 */
export async function listAllContent(params = {}) {
  const { data } = await api.get('/api/admin/content', { params });
  return data.data;
}

/**
 * One item in full, including its body, for the editor.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getContent(id) {
  const { data } = await api.get(`/api/admin/content/${id}`);
  return data.data.content;
}

/**
 * Writes a new page or post.
 * @param {object} payload
 * @returns {Promise<object>} The saved item.
 */
export async function createContent(payload) {
  const { data } = await api.post('/api/admin/content', payload);
  return data.data.content;
}

/**
 * Edits one, including publishing and unpublishing it.
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>} The saved item.
 */
export async function updateContent(id, payload) {
  const { data } = await api.patch(`/api/admin/content/${id}`, payload);
  return data.data.content;
}

/**
 * Removes one. Soft delete on the server.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteContent(id) {
  await api.delete(`/api/admin/content/${id}`);
}

/**
 * Uploads one picture for a cover or a body block.
 *
 * Separate from saving the page, so an admin sees the picture the
 * moment they choose it rather than after the whole document is saved.
 *
 * @param {File} file - JPG, PNG or WEBP.
 * @returns {Promise<string>} The URL to store on the block.
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const { data } = await api.post('/api/admin/content/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.url;
}
