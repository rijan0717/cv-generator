import { useMemo, useState } from 'react';
import { CATEGORIES } from '../../templates/index.js';
import { sampleFor } from '../../templates/sampleCV.js';
import TemplateThumbnail from './TemplateThumbnail.jsx';

/** Category key to its label, for the badge on each card. */
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

/**
 * The template gallery: every template as a live thumbnail in a grid, with
 * a search box, category chips and two layout filters.
 *
 * It is used in two places with different jobs, so what a click does is
 * the caller's decision, not the gallery's:
 *   - the Templates page opens a large preview to start a new CV from;
 *   - the editor's Design tab applies the template at once, since the
 *     editor's own live preview is already the large view.
 *
 * Filtering happens here, in memory. There are at most a few dozen
 * templates and all of them are already in the client bundle, so asking
 * the server to filter would only add a round trip.
 *
 * @param {{
 *   templates: Array<object>,
 *   selectedKey?: string,
 *   onChoose: (template: object) => void,
 *   userCV?: object,
 *   density?: 'wide'|'compact',
 * }} props
 *   `templates` is what the admin offers; `selectedKey` marks the current
 *   one; `userCV` enables "Preview with my CV" and carries the CV's colours
 *   and fonts onto the sample; `density` picks the column count.
 */
export default function TemplateGallery({
  templates,
  selectedKey,
  onChoose,
  userCV,
  density = 'wide',
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [photoOnly, setPhotoOnly] = useState(false);
  const [twoColumnOnly, setTwoColumnOnly] = useState(false);
  const [useMyCV, setUseMyCV] = useState(false);

  /**
   * Applies every filter in one pass. Text matches the name or the
   * description, case-insensitively, so "sidebar" finds the templates
   * that have one even though no template is called that.
   */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return templates.filter((template) => {
      if (category !== 'all' && template.category !== category) return false;
      if (photoOnly && !template.usesPhoto) return false;
      if (twoColumnOnly && !template.isTwoColumn) return false;
      if (!needle) return true;
      return `${template.name} ${template.description}`.toLowerCase().includes(needle);
    });
  }, [templates, query, category, photoOnly, twoColumnOnly]);

  /** How many templates each chip would show, so empty chips can say so. */
  const counts = useMemo(() => {
    const result = { all: templates.length };
    for (const template of templates) {
      result[template.category] = (result[template.category] ?? 0) + 1;
    }
    return result;
  }, [templates]);

  /**
   * The CV a card draws. The user's own when they have asked for it, and
   * otherwise the sample — with the user's colours and fonts when there is
   * a user CV, so the gallery still answers "what would mine look like?".
   */
  function cvFor(template) {
    if (useMyCV && userCV) return { ...userCV, templateKey: template.key };
    return sampleFor(template.key, userCV?.settings);
  }

  const gridColumns =
    density === 'compact'
      ? 'grid-cols-2 sm:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5';

  return (
    <div>
      {/* Toolbar */}
      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">Search templates</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates"
            className="w-full rounded-lg border-0 bg-white py-2 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {[{ key: 'all', label: 'All' }, ...CATEGORIES].map((chip) => (
            <button
              key={chip.key}
              type="button"
              aria-pressed={category === chip.key}
              title={chip.hint}
              onClick={() => setCategory(chip.key)}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium transition',
                category === chip.key
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {chip.label}
              <span className="ml-1 opacity-60">{counts[chip.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-300">
          <Toggle checked={photoOnly} onChange={setPhotoOnly}>
            With photo
          </Toggle>
          <Toggle checked={twoColumnOnly} onChange={setTwoColumnOnly}>
            Two columns
          </Toggle>
          {userCV && (
            <Toggle checked={useMyCV} onChange={setUseMyCV}>
              Preview with my CV
            </Toggle>
          )}
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No templates match these filters.{' '}
          <button
            type="button"
            className="font-medium text-slate-900 underline dark:text-slate-100"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setPhotoOnly(false);
              setTwoColumnOnly(false);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className={`mt-5 grid gap-4 ${gridColumns}`}>
          {visible.map((template) => (
            <li key={template.key}>
              <TemplateCard
                template={template}
                cv={cvFor(template)}
                isSelected={template.key === selectedKey}
                onChoose={() => onChoose(template)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One template in the grid.
 *
 * The whole card is a single button, so it is one tab stop with one
 * accessible name, rather than a picture with a small link somewhere
 * inside it.
 *
 * @param {{template: object, cv: object, isSelected: boolean, onChoose: () => void}} props
 */
function TemplateCard({ template, cv, isSelected, onChoose }) {
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={isSelected}
      aria-label={`${template.name} template${isSelected ? ' (current)' : ''}`}
      className={[
        'group block w-full overflow-hidden rounded-xl bg-white text-left shadow-sm transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
        'dark:bg-slate-900 dark:focus-visible:outline-slate-100',
        isSelected
          ? 'ring-2 ring-blue-600 dark:ring-blue-400'
          : 'ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 dark:ring-slate-700 dark:hover:ring-slate-500',
      ].join(' ')}
    >
      <div className="relative border-b border-slate-200 dark:border-slate-700">
        <TemplateThumbnail cv={cv} />
        {isSelected && (
          <span className="absolute right-2 top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            Current
          </span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {template.name}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{CATEGORY_LABELS[template.category] ?? 'Other'}</span>
          {template.usesPhoto && <span>&middot; Photo</span>}
          {template.isTwoColumn && <span>&middot; Two columns</span>}
        </div>
      </div>
    </button>
  );
}

/**
 * A labelled checkbox.
 * @param {{checked: boolean, onChange: (value: boolean) => void, children: React.ReactNode}} props
 */
function Toggle({ checked, onChange, children }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600"
      />
      {children}
    </label>
  );
}
