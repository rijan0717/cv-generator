import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FAQ_GROUPS, ALL_FAQS } from '../data/faqs.js';
import { useDocumentMeta } from '../utils/useDocumentMeta.js';

/**
 * The FAQ page: questions grouped by topic, each one opening in place.
 *
 * Each question is a native `<details>` element. It opens and closes from
 * the keyboard, is announced correctly by screen readers and needs no
 * state of ours — the accessible behaviour comes with the element.
 *
 * Every question has an anchor (`/faq#change-template`). Arriving with one
 * in the URL — from the header search, say — opens that question and
 * scrolls to it, so a search result lands on the answer, not on the top of
 * a long page.
 */
export default function FaqPage() {
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.replace('#', ''));

  // The question named in the URL, opened on arrival. Kept in state so a
  // second search result on the same page opens its question too.
  const [openId, setOpenId] = useState(target);

  useEffect(() => {
    if (!target) return;
    setOpenId(target);
    // After the paint, so the element is open (and its height final)
    // before scrolling to it.
    requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [target]);

  useDocumentMeta({
    title: 'Frequently asked questions',
    description:
      'Answers about building a CV on SmartCV: templates, downloads, the strength score, job matching, applications, employer accounts and privacy.',
    keywords: ['smartcv faq', 'cv builder help', 'ats friendly cv', 'cv strength score'],
    canonicalPath: '/faq',
    // Lets a search engine show the answers directly under the result.
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: ALL_FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="text-center">
        <p className="text-sm font-semibold text-brand-fuchsia dark:text-fuchsia-100">Help</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Frequently asked questions
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-100">
          Everything about building, scoring and sending your CV — and about hiring through SmartCV.
        </p>
      </header>

      {/* Jump links to each topic. */}
      <nav aria-label="FAQ topics" className="mt-8 flex flex-wrap justify-center gap-2">
        {FAQ_GROUPS.map((group) => (
          <a
            key={group.key}
            href={`#topic-${group.key}`}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 transition hover:border-slate-900 hover:text-slate-900 dark:border-slate-600 dark:text-slate-100 dark:hover:border-slate-300"
          >
            {group.title}
          </a>
        ))}
      </nav>

      <div className="mt-12 space-y-12">
        {FAQ_GROUPS.map((group) => (
          <section key={group.key} id={`topic-${group.key}`} className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
              {group.title}
            </h2>

            <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-navy-700 dark:border-navy-700 dark:bg-navy-800">
              {group.items.map((faq) => (
                <details
                  key={faq.id}
                  id={faq.id}
                  open={openId === faq.id}
                  className="group scroll-mt-24 px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-md font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-fuchsia dark:text-slate-50">
                    {faq.question}
                    {/* A plus that turns into a cross when open. */}
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-5 w-5 shrink-0 text-brand-fuchsia transition-transform duration-200 group-open:rotate-45 dark:text-fuchsia-100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-100">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-navy-700 dark:bg-navy-900">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
          Ready to start?
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-100">
          Pick a template — it opens filled with sample content for you to make your own.
        </p>
        <Link
          to="/register"
          className="cvg-gradient-bg cvg-glow cvg-glow-hover mt-5 inline-block rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-95"
        >
          Create my CV
        </Link>
      </div>
    </div>
  );
}
