import { useState, useEffect, useMemo } from 'react';
import * as templateApi from '../../api/templates.js';
import { useToast } from '../../context/useToast.js';
import { TEMPLATES } from '../../templates/index.js';
import TemplateGallery from '../../components/templates/TemplateGallery.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import AdminTemplateDialog from './AdminTemplateDialog.jsx';

/**
 * Template management: which templates users are offered, and what they
 * are called in the picker.
 *
 * Shown as the same gallery of live previews the user sees, rather than a
 * list of names. An admin deciding whether to offer a template is making a
 * judgement about how it looks, and a row of text cannot support that —
 * the only honest way to answer "should we offer this?" is to look at the
 * page. Clicking a card opens it large, with the controls beside it.
 *
 * What is editable here is deliberately narrow. The look of a template is
 * its React component and cannot be changed from a database row; the name
 * and description are what a user reads when choosing, and `isActive` is
 * whether they are offered it at all. Deactivating hides a template from
 * the picker and leaves every CV already using it exactly as it is.
 */
export default function AdminTemplatesPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [seeded, setSeeded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    let cancelled = false;

    templateApi
      .listAllTemplates()
      .then((data) => {
        if (cancelled) return;
        setRows(data.templates);
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
   * The gallery's templates: the admin's catalogue rows joined to the
   * client's registry by key.
   *
   * Both halves are needed. The row carries what the admin controls — the
   * id, the wording and whether it is offered — while the registry carries
   * what the gallery draws and filters by: the component, its category and
   * whether it has a sidebar. A row whose key this build cannot render is
   * dropped rather than drawn as something else, because showing one
   * template's picture above another's name would be worse than silence.
   */
  const templates = useMemo(() => {
    const byKey = new Map(TEMPLATES.map((template) => [template.key, template]));

    return rows
      .filter((row) => byKey.has(row.key))
      .map((row) => ({ ...byKey.get(row.key), ...row }));
  }, [rows]);

  /** Templates this build can render that have no catalogue row yet. */
  const unseededCount = useMemo(() => {
    const keys = new Set(rows.map((row) => row.key));
    return TEMPLATES.filter((template) => !keys.has(template.key)).length;
  }, [rows]);

  const activeCount = templates.filter((template) => template.isActive).length;
  const open = templates.find((template) => template.key === openKey) ?? null;

  /**
   * Saves a change to the open template and replaces its row.
   * @param {object} payload - The fields to change.
   */
  async function save(payload) {
    if (!open) return;

    setIsSaving(true);

    try {
      const updated = await templateApi.updateTemplate(open.id, payload);
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      toast.success(`"${updated.name}" saved.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading templates" />
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          Templates <span className="text-slate-500">({activeCount} active)</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Click a template to preview it and change whether users are offered it.
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
            Run{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
              npm run seed:templates
            </code>{' '}
            to fill it. Until then every template is offered to users.
          </p>
        </div>
      ) : (
        <>
          {unseededCount > 0 && (
            <Alert variant="info" className="mt-4">
              {unseededCount} template{unseededCount === 1 ? '' : 's'} in this build{' '}
              {unseededCount === 1 ? 'has' : 'have'} no catalogue entry yet. Run{' '}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                npm run seed:templates
              </code>{' '}
              to manage {unseededCount === 1 ? 'it' : 'them'} here.
            </Alert>
          )}

          <div className="mt-5">
            <TemplateGallery
              templates={templates}
              onChoose={(template) => setOpenKey(template.key)}
              badgeFor={(template) =>
                template.isActive ? null : (
                  <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Hidden
                  </span>
                )
              }
            />
          </div>
        </>
      )}

      <AdminTemplateDialog
        template={open}
        isSaving={isSaving}
        error={error}
        isLastActive={activeCount <= 1}
        onClose={() => setOpenKey(null)}
        onSave={save}
      />
    </div>
  );
}
