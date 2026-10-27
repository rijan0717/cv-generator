import api from './axios.js';

/**
 * The templates a user may choose from — the ones the admin has left
 * active, in the order the admin put them in.
 *
 * @returns {Promise<{templates: Array<object>, seeded: boolean}>} The
 *   catalogue, and whether it has ever been seeded.
 */
export async function listTemplates() {
  const { data } = await api.get('/api/templates');
  return data.data;
}

/**
 * Every template, including the deactivated ones. Admin only.
 * @returns {Promise<{templates: Array<object>, seeded: boolean}>}
 */
export async function listAllTemplates() {
  const { data } = await api.get('/api/admin/templates');
  return data.data;
}

/**
 * Activates, deactivates or renames a template.
 * @param {string} id - The template's id.
 * @param {{isActive?: boolean, name?: string, description?: string}} payload
 * @returns {Promise<object>} The updated template.
 */
export async function updateTemplate(id, payload) {
  const { data } = await api.patch(`/api/admin/templates/${id}`, payload);
  return data.data.template;
}
