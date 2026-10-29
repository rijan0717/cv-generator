import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import TemplateGallery from '../../components/templates/TemplateGallery.jsx';
import TemplatePreviewDialog from '../../components/templates/TemplatePreviewDialog.jsx';
import useOfferedTemplates from '../../components/templates/useOfferedTemplates.js';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * The template gallery as a page of its own: browse every template the
 * admin offers, open one at full size, and start a new CV in it.
 *
 * Starting here rather than from "Create CV" answers the question most
 * people begin with — what should it look like? — before asking them to
 * name a CV they have not written yet. The title can be changed in the
 * editor, so it is filled in from the template's name.
 */
export default function TemplatesPage() {
  const navigate = useNavigate();
  const { templates, isLoading } = useOfferedTemplates();

  const [previewing, setPreviewing] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  /**
   * Creates a CV in the chosen template and opens it in the editor.
   * @param {object} template - The template definition being used.
   */
  async function handleUse(template) {
    setIsCreating(true);
    setError('');

    try {
      const created = await cvApi.createCV({
        title: `${template.name} CV`,
        templateKey: template.key,
      });
      navigate(`/cvs/${created._id}`);
    } catch (err) {
      setError(err.message);
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Templates
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Pick a layout to start a new CV. Every template uses the same content, so you can switch
          at any time from the editor&rsquo;s Design tab without retyping anything.
        </p>
      </header>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid min-h-[30vh] place-items-center text-slate-500 dark:text-slate-400">
            <Spinner label="Loading templates" />
          </div>
        ) : (
          <TemplateGallery
            templates={templates}
            onChoose={(template) => {
              setError('');
              setPreviewing(template);
            }}
          />
        )}
      </div>

      <TemplatePreviewDialog
        template={previewing}
        onClose={() => setPreviewing(null)}
        onUse={handleUse}
        isBusy={isCreating}
        error={error}
      />
    </div>
  );
}
