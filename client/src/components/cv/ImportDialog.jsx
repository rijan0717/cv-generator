import { useState, useRef } from 'react';
import api from '../../api/axios.js';
import Button from '../ui/Button.jsx';
import Alert from '../ui/Alert.jsx';

/** How each parsed section is described in the review list. */
const SECTION_SUMMARIES = {
  personal: (data) => (data.personal.fullName ? `Name, contact details` : null),
  summary: (data) => (data.summary ? 'Professional summary' : null),
  experience: (data) => (data.experience.length ? `${data.experience.length} role(s)` : null),
  education: (data) => (data.education.length ? `${data.education.length} qualification(s)` : null),
  skills: (data) => (data.skills.length ? `${data.skills.length} skill(s)` : null),
  projects: (data) => (data.projects.length ? `${data.projects.length} project(s)` : null),
  certifications: (data) =>
    data.certifications.length ? `${data.certifications.length} certification(s)` : null,
  languages: (data) => (data.languages.length ? `${data.languages.length} language(s)` : null),
};

/**
 * Imports an existing CV from a PDF, Word or text file.
 *
 * Parsing is never perfect, so the result is shown for review and the user
 * chooses which sections to bring in. Nothing is applied until they confirm,
 * and importing replaces only the sections they tick — so an import can top
 * up a CV rather than flatten it.
 *
 * @param {{onApply: (patch: object) => void, onClose: () => void, cvId: string}} props
 */
export default function ImportDialog({ cvId, onApply, onClose }) {
  const inputRef = useRef(null);

  const [parsed, setParsed] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [filename, setFilename] = useState('');

  /**
   * Uploads the chosen file and shows what the parser found.
   * @param {File} file - The chosen document.
   */
  async function handleFile(file) {
    setError('');
    setParsed(null);
    setFilename(file.name);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const { data } = await api.post(`/api/cvs/${cvId}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = data.data.parsed;
      setParsed(result);

      // Pre-tick everything that actually found something, since that is
      // almost always what the user wants.
      setSelected(
        new Set(
          Object.keys(SECTION_SUMMARIES).filter((key) => SECTION_SUMMARIES[key](result) !== null),
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  /**
   * Toggles whether a section will be imported.
   * @param {string} key - The section key.
   */
  function toggle(key) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** Builds the patch from the ticked sections and hands it to the editor. */
  function handleApply() {
    const patch = {};

    for (const key of selected) {
      if (key === 'personal') {
        // Only the fields that were actually found are applied, so an
        // import never blanks something the user has already typed.
        patch.personal = Object.fromEntries(
          Object.entries(parsed.personal).filter(([, value]) => value),
        );
      } else {
        patch[key] = parsed[key];
      }
    }

    onApply(patch);
  }

  const available = Object.keys(SECTION_SUMMARIES).filter(
    (key) => parsed && SECTION_SUMMARIES[key](parsed) !== null,
  );

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900">Import an existing CV</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a PDF, Word (.docx) or text file and we will read what we can.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <span className="sr-only">Close</span>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div className="mt-4">
        <input
          ref={inputRef}
          id="import-file"
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="sr-only"
        />
        <Button
          variant="secondary"
          isLoading={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? 'Reading the file' : 'Choose a file'}
        </Button>
        {filename && <span className="ml-3 text-sm text-slate-600">{filename}</span>}
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {parsed && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          {available.length === 0 ? (
            <Alert variant="info">
              Nothing recognisable was found. The file may use an unusual layout &mdash; you can
              still fill the form in by hand.
            </Alert>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-slate-900">Choose what to import</h3>
              <p className="mt-1 text-xs text-slate-500">
                Ticked sections replace what is currently in your CV. Check everything afterwards
                &mdash; automatic reading is never perfect.
              </p>

              <ul className="mt-3 space-y-1">
                {available.map((key) => (
                  <li key={key}>
                    <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggle(key)}
                      />
                      <span className="font-medium capitalize text-slate-700">{key}</span>
                      <span className="text-slate-500">{SECTION_SUMMARIES[key](parsed)}</span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex gap-2">
                <Button onClick={handleApply} disabled={selected.size === 0}>
                  Import {selected.size} section{selected.size === 1 ? '' : 's'}
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
