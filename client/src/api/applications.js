import api from './axios.js';

/**
 * The caller's own applications.
 * @returns {Promise<Array<object>>}
 */
export async function listMyApplications() {
  const { data } = await api.get('/api/applications/mine');
  return data.data.applications;
}

/**
 * One application in full, including the submitted CV snapshot.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getApplication(id) {
  const { data } = await api.get(`/api/applications/${id}`);
  return data.data.application;
}

/**
 * Changes an application's status. An applicant may only withdraw.
 * @param {string} id
 * @param {{status: string, employerNote?: string}} payload
 * @returns {Promise<string>} The new status.
 */
export async function updateApplicationStatus(id, payload) {
  const { data } = await api.patch(`/api/applications/${id}/status`, payload);
  return data.data.status;
}

/**
 * Downloads the submitted CV snapshot.
 *
 * Fetched as a blob rather than by navigating, so the session cookie is
 * sent and an error comes back as a readable message instead of the
 * browser saving a JSON error file.
 *
 * @param {string} id - Application id.
 * @param {'pdf'|'docx'} format
 * @returns {Promise<void>}
 */
export async function downloadApplicationCV(id, format) {
  const response = await api.get(`/api/applications/${id}/download/${format}`, {
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'] ?? '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `application.${format}`;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
