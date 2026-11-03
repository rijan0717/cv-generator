import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SEARCH_SCOPES } from '../../utils/siteSearch.js';
import { useSiteSearch } from '../../utils/useSiteSearch.js';
import Spinner from '../ui/Spinner.jsx';

/** Rows per group in the dropdown; the results page shows more. */
const PER_GROUP = 4;

/**
 * The search box in the header: one pill holding the text box, a scope
 * menu ("All", "Templates", "Jobs" …) and a round search button.
 *
 * Results appear in a dropdown as you type, grouped by kind. It follows
 * the ARIA combobox pattern so it works from the keyboard and is announced
 * properly:
 *
 *   - ↓ / ↑ move through the results, Enter opens the highlighted one;
 *   - Enter with nothing highlighted, or the search button, opens the full
 *     results page (`/search?q=…`);
 *   - Escape closes the dropdown, and so does clicking anywhere else.
 *
 * @param {{autoFocus?: boolean, onDone?: () => void, className?: string}} props
 *   `onDone` runs after a result is opened — the phone layout uses it to
 *   fold the search row away again.
 */
export default function HeaderSearch({ autoFocus = false, onDone, className = '' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const listId = useId();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { groups, isLoading, isTooShort } = useSiteSearch(query, scope, PER_GROUP);

  // Every row in display order, so the arrow keys can walk across groups.
  const flat = groups.flatMap((group) => group.results);

  // A new set of results starts with nothing highlighted.
  useEffect(() => setActiveIndex(-1), [query, scope]);

  // Moving to another page closes the dropdown.
  useEffect(() => setIsOpen(false), [pathname]);

  // A click outside the search closes the dropdown.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /** Opens one result and resets the box. */
  function open(result) {
    navigate(result.to);
    setQuery('');
    setIsOpen(false);
    onDone?.();
  }

  /** Opens the full results page for what has been typed. */
  function openResultsPage() {
    const q = query.trim();
    if (!q) return inputRef.current?.focus();
    navigate(`/search?q=${encodeURIComponent(q)}&type=${scope}`);
    setIsOpen(false);
    onDone?.();
    return undefined;
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (flat.length === 0 ? -1 : (index + 1) % flat.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (flat.length === 0 ? -1 : (index - 1 + flat.length) % flat.length));
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && flat[activeIndex]) open(flat[activeIndex]);
      else openResultsPage();
    }
  }

  const showPanel = isOpen && !isTooShort;
  const optionId = (index) => `${listId}-option-${index}`;
  let rowIndex = -1;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          openResultsPage();
        }}
        className="flex h-11 items-center rounded-full bg-slate-100 pl-4 pr-1 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-brand-fuchsia/40 dark:bg-navy-800 dark:focus-within:bg-navy-800"
      >
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search templates, jobs, people, help…"
          aria-label="Search the site"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          maxLength={100}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-slate-50 dark:placeholder:text-slate-100/70 [&::-webkit-search-cancel-button]:hidden"
        />

        {/* The scope menu. A native select: keyboard and screen-reader
            support for free, and it opens as a proper list on a phone. */}
        <label className="sr-only" htmlFor={`${listId}-scope`}>
          Search in
        </label>
        <select
          id={`${listId}-scope`}
          value={scope}
          onChange={(event) => {
            setScope(event.target.value);
            setIsOpen(true);
          }}
          className="mr-1 cursor-pointer rounded-full bg-transparent py-1 pl-2 pr-1 text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-fuchsia dark:bg-navy-800 dark:text-slate-100"
        >
          {SEARCH_SCOPES.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          aria-label="Show all results"
          className="cvg-gradient-bg grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
      </form>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-navy-700 dark:bg-navy-800"
          >
            <ul id={listId} role="listbox" aria-label="Search results">
              {groups.map((group) => (
                <li key={group.key} role="presentation" className="py-1">
                  <p
                    role="presentation"
                    className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-100"
                  >
                    {group.label}
                  </p>
                  <ul role="presentation">
                    {group.results.map((result) => {
                      rowIndex += 1;
                      const index = rowIndex;
                      const isActive = index === activeIndex;

                      return (
                        <li
                          key={`${result.group}:${result.to}:${result.title}`}
                          id={optionId(index)}
                          role="option"
                          aria-selected={isActive}
                          // Mouse down rather than click, so the row opens
                          // before the input loses focus and closes the list.
                          onMouseDown={(event) => {
                            event.preventDefault();
                            open(result);
                          }}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`cursor-pointer rounded-xl px-3 py-2 ${
                            isActive ? 'bg-slate-100 dark:bg-navy-900' : ''
                          }`}
                        >
                          <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-100">
                              {result.subtitle}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>

            {groups.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-100">
                {isLoading ? <Spinner label="Searching" /> : `Nothing found for “${query.trim()}”.`}
              </p>
            )}

            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                openResultsPage();
              }}
              className="mt-1 w-full rounded-xl border-t border-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-brand-fuchsia hover:bg-slate-50 dark:border-navy-700 dark:text-fuchsia-400 dark:hover:bg-navy-900"
            >
              See all results for “{query.trim()}” →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
