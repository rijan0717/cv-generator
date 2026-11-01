import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MENU_ICONS } from './menus.js';

/**
 * A header dropdown: a trigger with a chevron, and a panel of links that
 * each carry an icon, a title and a line explaining what they are for.
 *
 * The explaining line is the point. "Rewrite with JD" means nothing to
 * somebody who has not used the site, and a header with six bare words in
 * it makes the reader open all six to find out which one they wanted.
 *
 * Behaviour:
 *   - **Click** opens and closes it, and that is the only thing that
 *     opens it. Escape closes it and returns focus to the trigger; a
 *     click outside closes it; so does following a link.
 *
 * Opening on hover was tried and taken out. A pointer moving towards the
 * trigger opened the menu before the click landed, so the click — which
 * toggles — closed it again, and the menu could not be opened with the
 * mouse at all. Open-on-hover also fires when somebody is only crossing
 * the header on the way somewhere else. Click is unambiguous, and it is
 * identical on a touch screen, a mouse and a keyboard.
 *
 * @param {{label: string, items: Array<{to: string, label: string,
 *          description: string, icon: string}>,
 *          footer?: React.ReactNode}} props
 */

export default function NavMenu({ label, items, footer }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const { pathname } = useLocation();

  // Navigating closes it. Without this, following a link inside the panel
  // leaves it hanging open over the page that was just opened.
  useEffect(() => setIsOpen(false), [pathname]);

  // A click anywhere else closes it.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  /** Escape closes it and gives focus back to the trigger. */
  function handleKeyDown(event) {
    if (event.key === 'Escape' && isOpen) {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={wrapperRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className={[
          'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia',
          isOpen
            ? 'text-brand-fuchsia dark:text-fuchsia-100'
            : 'text-slate-700 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white',
        ].join(' ')}
      >
        {label}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={panelId}
          // `top-full` with no gap: a visible gap between the trigger and
          // the panel is where a pointer slips through and closes it.
          //
          // No entrance animation here, deliberately. A keyframe animation
          // on this positioned wrapper promotes it to its own compositor
          // layer, and the layer was still being blended after the
          // animation finished — the page showed through the open menu.
          // The panel appearing at once is no worse, and it is correct.
          className="absolute left-0 top-full z-50 w-[22rem] pt-2"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-navy-700 dark:bg-navy-900 dark:shadow-black/40">
            <ul>
              {items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-navy-800"
                  >
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-brand-fuchsia dark:text-fuchsia-100"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={MENU_ICONS[item.icon]} />
                    </svg>

                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-100">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {footer && (
              <div className="mt-1 border-t border-slate-200 px-3 py-3 dark:border-navy-700">
                {footer}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
