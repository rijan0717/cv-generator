/** The search-engine fields: title, description and keywords. */

import { useState } from 'react';
import TextField from '../../../components/ui/TextField.jsx';

/** The most keywords one page is allowed. Matches the server's cap. */
export const MAX_KEYWORDS = 15;

/**
 * The keywords field: a chip per keyword, added by comma or Enter.
 *
 * It was a plain text box holding "a, b, c" and splitting on every
 * keystroke, which had two faults. A repeated word produced two chips
 * with the same React key, and a half-typed word was already stored as
 * a keyword — so "cv ti" could be saved if the admin clicked away mid
 * word. Committing on a separator fixes both: what is in the box is a
 * word being typed, and what is in a chip is a keyword.
 *
 * @param {{id: string, keywords: string[],
 *          onChange: (keywords: string[]) => void}} props
 */
export function KeywordInput({ id, keywords, onChange }) {
  const [draft, setDraft] = useState('');

  /**
   * Commits whatever is in the box, splitting on commas so a pasted
   * list arrives as separate keywords rather than one long one.
   * @param {string} text
   */
  function commit(text) {
    const added = text
      .split(',')
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);

    if (added.length === 0) return;

    // De-duplicated and capped here as well as on the server, so the
    // admin sees the limit rather than discovering it on save.
    const next = [...new Set([...keywords, ...added])].slice(0, MAX_KEYWORDS);
    onChange(next);
    setDraft('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter in a form submits it; a comma would type a character
      // that has already been turned into a chip.
      event.preventDefault();
      commit(draft);
      return;
    }

    // Backspace in an empty box removes the previous chip, which is
    // what every tag field does and what the hand expects.
    if (event.key === 'Backspace' && draft === '' && keywords.length > 0) {
      onChange(keywords.slice(0, -1));
    }
  }

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-slate-900 dark:ring-slate-600 dark:focus-within:ring-slate-100">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1 text-xs text-slate-700 dark:bg-navy-800 dark:text-slate-100"
          >
            {keyword}
            <button
              type="button"
              onClick={() => onChange(keywords.filter((word) => word !== keyword))}
              aria-label={`Remove ${keyword}`}
              className="grid h-4 w-4 place-items-center rounded-full text-slate-500 hover:bg-slate-300 hover:text-slate-900 dark:hover:bg-slate-600 dark:hover:text-slate-50"
            >
              ×
            </button>
          </span>
        ))}

        <input
          id={id}
          value={draft}
          onChange={(event) => {
            // A pasted "a, b, c" commits everything before the last
            // comma and leaves the remainder being typed.
            if (event.target.value.includes(',')) {
              const parts = event.target.value.split(',');
              commit(parts.slice(0, -1).join(','));
              setDraft(parts[parts.length - 1].trimStart());
              return;
            }
            setDraft(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          // Clicking away should keep what was typed, not discard it.
          onBlur={() => commit(draft)}
          disabled={keywords.length >= MAX_KEYWORDS}
          placeholder={
            keywords.length >= MAX_KEYWORDS
              ? `${MAX_KEYWORDS} is the maximum`
              : keywords.length === 0
                ? 'cv tips, ats, job applications'
                : 'Add another'
          }
          className="min-w-[160px] flex-1 border-0 bg-transparent p-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed dark:text-slate-50"
        />
      </div>
    </div>
  );
}

/**
 * What a search engine is told about this page.
 *
 * Every field is optional and falls back to the page's own title and
 * summary, so an admin who ignores this section still gets a sensibly
 * described page. The preview is the point of the section: a meta
 * description is written blind otherwise, and the two limits that
 * matter — roughly 60 characters of title and 160 of description —
 * are invisible until something shows you where they cut.
 *
 * @param {{draft: object, set: (field: string, value: unknown) => void,
 *          copy: object}} props
 */
export function SeoFields({ draft, set, copy }) {
  const seo = draft.seo ?? { metaTitle: '', metaDescription: '', keywords: [] };

  /**
   * Updates one SEO field without disturbing the others.
   * @param {string} field
   * @param {unknown} value
   */
  const setSeo = (field, value) => set('seo', { ...seo, [field]: value });

  // What the page will actually say, fallbacks included. This repeats
  // the rule in the server's `describe()` so the preview shows what
  // will really be served — a preview that disagrees with the result
  // is worse than no preview.
  const shownTitle = seo.metaTitle || draft.title || 'Untitled';

  const shownDescription = (() => {
    if (seo.metaDescription) return seo.metaDescription.slice(0, 160);

    const base =
      draft.excerpt ||
      draft.bodyHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);

    if (seo.keywords.length === 0) return base.slice(0, 160);

    const topics = `Topics: ${seo.keywords.join(', ')}.`;
    return (base.length + topics.length + 1 <= 160 ? `${base} ${topics}`.trim() : base).slice(
      0,
      160,
    );
  })();

  return (
    <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-navy-900 dark:ring-navy-700">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-50">Search engines</h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-100">
          Optional. Left blank, the title and summary above are used.
        </p>
      </div>

      {/* The preview, roughly as Google lays a result out. */}
      <div className="rounded-lg bg-slate-50 p-4 dark:bg-navy-800/60">
        <p className="text-xs text-slate-500 dark:text-slate-100">Preview</p>
        <p className="mt-2 truncate text-xs text-emerald-700 dark:text-emerald-600">
          {window.location.origin}
          {copy.path(draft.slug || 'your-title')}
        </p>
        <p className="truncate text-lg text-blue-700 dark:text-fuchsia-400">{shownTitle}</p>
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-100">
          {shownDescription || 'No description yet.'}
        </p>
      </div>

      <TextField
        label="Search title"
        value={seo.metaTitle}
        onChange={(event) => setSeo('metaTitle', event.target.value)}
        maxLength={70}
        hint={`${seo.metaTitle.length} of 70 characters. Around 60 is what a result shows.`}
      />

      <div>
        <label
          htmlFor="seo-description"
          className="block text-sm font-medium text-slate-700 dark:text-slate-100"
        >
          Search description
        </label>
        <textarea
          id="seo-description"
          value={seo.metaDescription}
          onChange={(event) => setSeo('metaDescription', event.target.value)}
          rows={2}
          maxLength={160}
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-navy-800 dark:text-slate-50 dark:ring-slate-600"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-100">
          {seo.metaDescription.length} of 160 characters. This is the sentence under the link.
        </p>
      </div>

      <div>
        <label
          htmlFor="seo-keywords"
          className="block text-sm font-medium text-slate-700 dark:text-slate-100"
        >
          Keywords
        </label>
        <KeywordInput
          id="seo-keywords"
          keywords={seo.keywords}
          onChange={(keywords) => setSeo('keywords', keywords)}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-100">
          Type a comma or press Enter to add one. Up to 15. They appear as topics at the end of the{' '}
          {copy.one}, and are added to the search description when you have not written one.
        </p>
      </div>
    </div>
  );
}
