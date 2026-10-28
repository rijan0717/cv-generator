import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as contentApi from '../../api/content.js';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { useDocumentMeta } from '../../utils/useDocumentMeta.js';

/** A date as the rest of the application writes it. */
const asDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '');

/**
 * The blog: every published post, newest first.
 *
 * Public, because it is what a visitor reads before deciding whether to
 * sign up.
 */
export default function BlogListPage() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    contentApi
      .listPosts({ page })
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts);
        setPagination(data.pagination);
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
  }, [page]);

  useDocumentMeta({
    title: 'Blogs',
    description:
      'Advice on writing a CV, reading a job advert and getting past screening software, from the team behind Smart CV Generator.',
    keywords: ['cv advice', 'cv tips', 'ats', 'job applications', 'cv writing'],
    canonicalPath: '/blog',
  });

  return (
    // Wider than an article page: four cards across needs the room,
    // and this is a list to scan rather than a column to read.
    <div className="mx-auto max-w-[1400px] px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Blogs
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Advice on writing a CV, reading a job advert and getting past screening software.
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-12 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading posts" />
        </div>
      ) : posts.length === 0 ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          Nothing has been published yet. Check back soon.
        </p>
      ) : (
        /* Four across on a wide screen, down to one on a phone. The
           card is one big link — the whole thing is clickable rather
           than only the title, which is what people try first. */
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                to={`/blog/${post.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-700 dark:hover:ring-slate-600"
              >
                {post.coverImageUrl ? (
                  <img
                    src={post.coverImageUrl}
                    alt=""
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  // A post with no picture still needs a top edge, or
                  // the grid reads as a wall of unbroken text.
                  <span
                    aria-hidden="true"
                    className="grid h-40 w-full place-items-center bg-slate-100 text-4xl font-bold text-slate-300 dark:bg-slate-800 dark:text-slate-600"
                  >
                    {post.title.charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-semibold leading-snug text-slate-900 dark:text-slate-100">
                    {post.title}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {[asDate(post.publishedAt), post.author].filter(Boolean).join(' · ')}
                  </p>

                  {post.excerpt && (
                    // Clamped, so four cards in a row keep their tops
                    // and bottoms aligned however long the summaries are.
                    <p className="mt-3 line-clamp-4 text-sm text-slate-600 dark:text-slate-400">
                      {post.excerpt}
                    </p>
                  )}

                  <span className="mt-auto pt-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                    Read more →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && posts.length > 0 && (
        <Pagination pagination={pagination} onChange={setPage} label="posts" />
      )}
    </div>
  );
}
