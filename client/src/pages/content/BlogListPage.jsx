import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as contentApi from '../../api/content.js';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Blog
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
        <ul className="mt-8 space-y-4">
          {posts.map((post) => (
            <li
              key={post.id}
              className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-700 dark:hover:ring-slate-600 sm:flex"
            >
              {post.coverImageUrl && (
                <Link to={`/blog/${post.slug}`} className="shrink-0 sm:w-56">
                  <img
                    src={post.coverImageUrl}
                    alt=""
                    loading="lazy"
                    className="h-40 w-full object-cover sm:h-full"
                  />
                </Link>
              )}

              <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                <Link to={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {[asDate(post.publishedAt), post.author].filter(Boolean).join(' · ')}
              </p>

              {post.excerpt && (
                <p className="mt-3 text-slate-600 dark:text-slate-400">{post.excerpt}</p>
              )}

              <Link
                to={`/blog/${post.slug}`}
                className="mt-4 inline-block text-sm font-medium text-slate-900 underline dark:text-slate-100"
              >
                Read more
              </Link>
              </div>
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
