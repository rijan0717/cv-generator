import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as contentApi from '../../api/content.js';
import ContentBody from '../../components/content/ContentBody.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useDocumentMeta } from '../../utils/useDocumentMeta.js';

/** A date as the rest of the application writes it. */
const asDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '');

/**
 * One page or one blog post, read by its slug.
 *
 * The same component serves both: they differ only in whether a date
 * and author are worth printing, and in where "back" goes. A draft is
 * not reachable here — the server answers a draft slug exactly as it
 * answers an unknown one.
 *
 * @param {{kind?: 'page'|'post'}} props - Which route rendered it.
 */
export default function ContentPage({ kind = 'page' }) {
  const { slug } = useParams();

  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    contentApi
      .getBySlug(slug)
      .then((result) => {
        if (!cancelled) setContent(result);
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
  }, [slug]);

  const isPostType = content?.type === 'post';

  // Called before the early returns below, because a hook cannot run
  // conditionally. With nothing loaded it simply sets the site name.
  useDocumentMeta({
    title: content?.seo?.metaTitle || content?.title,
    description: content?.seo?.metaDescription,
    keywords: content?.seo?.keywords,
    image: content?.coverImageUrl,
    type: isPostType ? 'article' : 'website',
    canonicalPath: content ? `${isPostType ? '/blog' : '/p'}/${content.slug}` : undefined,
    // Structured data, so a search engine can show the date and author
    // rather than guessing them out of the text.
    jsonLd: content
      ? {
          '@context': 'https://schema.org',
          '@type': isPostType ? 'BlogPosting' : 'WebPage',
          headline: content.title,
          description: content.seo?.metaDescription ?? content.excerpt ?? '',
          datePublished: content.publishedAt ?? undefined,
          dateModified: content.updatedAt ?? undefined,
          author: content.author ? { '@type': 'Person', name: content.author } : undefined,
          publisher: { '@type': 'Organization', name: 'Smart CV Generator' },
        }
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {error || 'That address does not lead anywhere.'}
        </p>
        <Link to={kind === 'post' ? '/blog' : '/'} className="mt-6 inline-block">
          <Button variant="secondary">{kind === 'post' ? 'All posts' : 'Back to home'}</Button>
        </Link>
      </div>
    );
  }

  const isPost = isPostType;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      {isPost && (
        <Link
          to="/blog"
          className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          &larr; All posts
        </Link>
      )}

      <header className={isPost ? 'mt-3' : ''}>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {content.title}
        </h1>

        {/* A date belongs on an article, where it tells the reader how
            current the advice is. On a page like "Privacy policy" it
            would only make the page look stale. */}
        {isPost && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {[asDate(content.publishedAt), content.author].filter(Boolean).join(' · ')}
          </p>
        )}

        {content.excerpt && (
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{content.excerpt}</p>
        )}
      </header>

      {content.coverImageUrl && (
        <img src={content.coverImageUrl} alt="" className="mt-6 w-full rounded-xl object-cover" />
      )}

      <div className="mt-8">
        <ContentBody html={content.bodyHtml} blocks={content.blocks} />
      </div>

      {/* The keywords, shown as topics rather than hidden in a meta
          tag. Search engines have largely stopped reading the keywords
          tag, but a reader scanning for "ATS" or "interview" has not,
          and a word worth targeting is a word worth printing. */}
      {content.seo?.keywords?.length > 0 && (
        <footer className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Topics
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {content.seo.keywords.map((keyword) => (
              <li
                key={keyword}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {keyword}
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}
