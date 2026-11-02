import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MIN_QUERY, SEARCH_SCOPES } from '../utils/siteSearch.js';
import { useSiteSearch } from '../utils/useSiteSearch.js';
import Spinner from '../components/ui/Spinner.jsx';
import { useDocumentMeta } from '../utils/useDocumentMeta.js';

/** Rows per group here: more than the header dropdown, still one screen per group. */
const PER_GROUP = 20;

/**
 * The full search results, reached from the header's search button or
 * "See all results". The query and scope live in the URL
 * (`/search?q=react&type=jobs`), so a results page can be bookmarked,
 * shared and reached again with the back button.
 */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const scope = SEARCH_SCOPES.some((option) => option.key === params.get('type'))
    ? params.get('type')
    : 'all';

  // What is in the box, which only becomes the URL on submit.
  const [draft, setDraft] = useState(query);
  // Keeps the box in step when the header search changes the URL.
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setDraft(query);
  }

  const { groups, isLoading, isTooShort } = useSiteSearch(query, scope, PER_GROUP);
  const total = groups.reduce((sum, group) => sum + group.results.length, 0);

  useDocumentMeta({
    title: query ? `Search: ${query}` : 'Search',
    description: 'Search SmartCV for templates, jobs, people, blog posts and help.',
    canonicalPath: '/search',
  });

  /** Writes a new query or scope into the URL. */
  function update(next) {
    const merged = { q: query, type: scope, ...next };
    setParams({ q: merged.q, type: merged.type });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50">Search</h1>

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft.trim() });
        }}
        className="mt-6 flex gap-2"
      >
        <label htmlFor="search-page-input" className="sr-only">
          Search the site
        </label>
        <input
          id="search-page-input"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={100}
          placeholder="Search templates, jobs, people, help…"
          className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm text-slate-900 focus:border-brand-fuchsia focus:outline-none focus:ring-2 focus:ring-brand-fuchsia/30 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-50"
        />
        <button
          type="submit"
          className="cvg-gradient-bg rounded-full px-6 text-sm font-bold text-white transition hover:opacity-95"
        >
          Search
        </button>
      </form>

      {/* The scope, as tabs across the top of the results. */}
      <div role="tablist" aria-label="Search in" className="mt-5 flex flex-wrap gap-2">
        {SEARCH_SCOPES.map((option) => (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={scope === option.key}
            onClick={() => update({ type: option.key })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              scope === option.key
                ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-navy-900'
                : 'border border-slate-300 text-slate-700 hover:border-slate-900 dark:border-slate-600 dark:text-slate-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {isTooShort ? (
          <p className="text-slate-600 dark:text-slate-100">
            Type at least {MIN_QUERY} characters to search.
          </p>
        ) : groups.length === 0 ? (
          isLoading ? (
            <div className="grid place-items-center py-12 text-slate-500 dark:text-slate-100">
              <Spinner label="Searching" />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-navy-700">
              <p className="text-slate-700 dark:text-slate-100">
                Nothing found for “{query}”{scope !== 'all' ? ' in this section' : ''}.
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-100">
                Try a shorter word, check the spelling, or{' '}
                {scope !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => update({ type: 'all' })}
                    className="font-semibold text-brand-fuchsia hover:underline dark:text-fuchsia-100"
                  >
                    search everything
                  </button>
                ) : (
                  <Link
                    to="/faq"
                    className="font-semibold text-brand-fuchsia hover:underline dark:text-fuchsia-100"
                  >
                    read the FAQ
                  </Link>
                )}
                .
              </p>
            </div>
          )
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-100" aria-live="polite">
              {total} result{total === 1 ? '' : 's'} for “{query}”
              {isLoading && ' — still searching…'}
            </p>

            <div className="mt-6 space-y-10">
              {groups.map((group) => (
                <section key={group.key} aria-labelledby={`results-${group.key}`}>
                  <h2
                    id={`results-${group.key}`}
                    className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-100"
                  >
                    {group.label}
                  </h2>
                  <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-navy-700 dark:border-navy-700 dark:bg-navy-800">
                    {group.results.map((result) => (
                      <li key={`${result.to}:${result.title}`}>
                        <Link
                          to={result.to}
                          className="block px-5 py-4 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-fuchsia dark:hover:bg-navy-900"
                        >
                          <span className="block font-medium text-slate-900 dark:text-slate-50">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500 dark:text-slate-100">
                              {result.subtitle}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
