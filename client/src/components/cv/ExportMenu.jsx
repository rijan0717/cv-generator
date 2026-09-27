import { useState } from 'react';
import api from '../../api/axios.js';
import Button from '../ui/Button.jsx';

/**
 * The three download formats.
 *
 * PDF and Word are offered together because they answer different needs: the
 * PDF is exactly what the preview shows and is what you send to an employer;
 * the Word file is editable and is what you send to a recruiter who will
 * reformat it.
 */
const FORMATS = [
  { key: 'pdf', label: 'PDF', hint: 'Matches the preview exactly. Send this to employers.' },
  { key: 'docx', label: 'Word', hint: 'Editable .docx. Content only, not the template design.' },
  { key: 'excel', label: 'Excel', hint: 'One sheet per section, for copying into forms.' },
];

/**
 * Download buttons for a CV.
 *
 * The file is fetched with Axios rather than by pointing the browser at the
 * URL, because the request needs the session cookie and the server replies
 * with an attachment. Fetching it as a blob also means an error comes back as
 * a readable message instead of the browser downloading a JSON error file.
 *
 * @param {{cvId: string}} props
 */
export default function ExportMenu({ cvId }) {
  const [busyFormat, setBusyFormat] = useState(null);
  const [error, setError] = useState('');

  /**
   * Downloads one format.
   * @param {string} format - 'pdf', 'docx' or 'excel'.
   */
  async function download(format) {
    setBusyFormat(format);
    setError('');

    try {
      const response = await api.get(`/api/cvs/${cvId}/export/${format}`, {
        responseType: 'blob',
      });

      // The server sets the filename in Content-Disposition; use it so the
      // saved file is named consistently with the spec.
      const disposition = response.headers['content-disposition'] ?? '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `cv.${format}`;

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Release the object URL, or the blob stays in memory for the life of
      // the page.
      URL.revokeObjectURL(url);
    } catch (err) {
      // An error response arrives as a Blob because of responseType, so the
      // JSON message has to be read back out of it.
      let message = err.message;
      if (err.response?.data instanceof Blob) {
        try {
          message = JSON.parse(await err.response.data.text()).message ?? message;
        } catch {
          // Not JSON; keep the original message.
        }
      }
      setError(message);
    } finally {
      setBusyFormat(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((format) => (
          <Button
            key={format.key}
            variant="secondary"
            size="sm"
            title={format.hint}
            isLoading={busyFormat === format.key}
            disabled={busyFormat !== null}
            onClick={() => download(format.key)}
          >
            {busyFormat === format.key ? 'Preparing' : format.label}
          </Button>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
