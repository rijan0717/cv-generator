import { useState, useEffect } from 'react';
import * as templateApi from '../../api/templates.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * Template management: which templates users are offered, and what they
 * are called in the picker.
 *
 * What is editable here is deliberately narrow. The look of a template
 * is its React component and cannot be changed from a database row; the
 * name and description are what a user reads when choosing, and
 * `isActive` is whether they are offered it at all. Deactivating hides a
 * template from the picker and leaves every CV already using it exactly
 * as it is.
 */
export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [seeded, setSeeded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let cancelled = false;

    templateApi
      .listAllTemplates()
      .then((data) => {
        if (cancelled) return;
        setTemplates(data.templates);
        setSeeded(data.seeded);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Saves a change to one template and replaces that row.
   * @param {object} template - The row being changed.
   * @param {object} payload - The fields to change.
   */
  async function save(template, payload) {
    setBusyId(template.id);
    setError('');

    try {
      const updated = await templateApi.updateTemplate(template.id, payload);
      setTemplates((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading templates" />
      </div>
    );
  }

  const activeCount = templates.filter((template) => template.isActive).length;

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          Templates <span className="text-slate-500">({activeCount} active)</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Deactivating hides a template from the picker. CVs already using it keep working.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {!seeded ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            The catalogue has not been set up yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Run <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run seed:templates</code>{' '}
            to fill it. Until then every template is offered to users.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {templates.map((template) => (
            <li
              key={template.id}
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              {editing === template.id ? (
                <EditForm
                  template={template}
                  isSaving={busyId === template.id}
                  onCancel={() => setEditing(null)}
                  onSave={(payload) => save(template, payload)}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">
                        {template.name}
                      </h3>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {template.key}
                      </code>
                      {template.usesPhoto && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          uses photo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                      {template.description}
                    </p>
                  </div>

                  <span
                    className={
                      template.isActive
                        ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }
                  >
                    {template.isActive ? 'Active' : 'Hidden'}
                  </span>

                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(template.id)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={busyId === template.id}
                      onClick={() => save(template, { isActive: !template.isActive })}
                    >
                      {template.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The inline editor for one template's name and description.
 *
 * Inline rather than a modal: it edits two text fields on a row that is
 * already on screen, and a dialog for that is more ceremony than the
 * change deserves.
 *
 * @param {{template: object, isSaving: boolean,
 *          onCancel: () => void, onSave: (payload: object) => void}} props
 */
function EditForm({ template, isSaving, onCancel, onSave }) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ name: name.trim(), description: description.trim() });
      }}
      className="space-y-3"
    >
      <div>
        <label
          htmlFor={`name-${template.id}`}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Name in the picker
        </label>
        <input
          id={`name-${template.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        />
      </div>

      <div>
        <label
          htmlFor={`description-${template.id}`}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Description
        </label>
        <textarea
          id={`description-${template.id}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          maxLength={300}
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={isSaving}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
