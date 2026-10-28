import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as contentApi from '../../api/content.js';
import ContentBody from '../../components/content/ContentBody.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

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

  const isPost = content.type === 'post';

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
        <img
          src={content.coverImageUrl}
          alt=""
          className="mt-6 w-full rounded-xl object-cover"
        />
      )}

      <div className="mt-8">
        <ContentBody html={content.bodyHtml} blocks={content.blocks} />
      </div>
    </article>
  );
}
