/**
 * Hands a downloaded blob to the browser as a saved file.
 *
 * Every download in the application is fetched with Axios rather than by
 * navigating to the URL, so that the session cookie is sent and a server
 * error arrives as a readable message instead of the browser saving a
 * JSON file with a .pdf name. The cost is that the file then has to be
 * saved by hand, which is what this does — in one place, because three
 * copies of it were three chances to forget `revokeObjectURL`.
 *
 * @param {import('axios').AxiosResponse} response - A `responseType: 'blob'` response.
 * @param {string} fallbackName - Used when the server sends no filename.
 * @returns {void}
 */
export function saveBlobResponse(response, fallbackName) {
  const disposition = response.headers['content-disposition'] ?? '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Released at once, or the blob stays in memory for the life of the page.
  URL.revokeObjectURL(url);
}
