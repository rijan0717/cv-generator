import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as contentApi from '../../api/content.js';
import { useToast } from '../../context/useToast.js';
import { useConfirm } from '../../context/useConfirm.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { ContentEditor, blankDraft } from './content/ContentEditor.jsx';
import { RowAction } from './content/RowAction.jsx';

/** A date as the rest of the application writes it. */
const asDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '—');

/** The wording that differs between the two screens. */
const COPY = {
  post: {
    heading: 'Blog posts',
    sub: 'Published posts appear on the blog automatically.',
    create: 'Write a post',
    empty: 'No posts yet. Use “Write a post” to publish your first one.',
    one: 'post',
    path: (slug) => `/blog/${slug}`,
  },
  page: {
    heading: 'Pages',
    sub: 'A page is reachable only from a link you add to the header or the footer.',
    create: 'Add a page',
    empty: 'No pages yet. Use “Add a page” for an About or Privacy page.',
    one: 'page',
    path: (slug) => `/p/${slug}`,
  },
};

/**
 * Blog posts and pages, one screen each.
 *
 * The same component serves both because they differ only in wording
 * and in the type they write; `type` is fixed by the route, so an admin
 * writing a post is never asked whether it is a post.
 *
 * The list and the editor share one route. Writing is iterative — save,
 * look at it, come back — and a round trip through a list page between
 * each pass is friction with nothing to show for it.
 *
 * @param {{type: 'post'|'page'}} props - Which screen this is.
 */
export default function AdminContentPage({ type }) {
  const copy = COPY[type];

  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // Which row is mid-request. Rows disable nothing while busy — the
  // actions are links, not buttons with spinners — but the editor
  // needs it to avoid opening twice on a double click.
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await contentApi.listAllContent({
        page,
        type,
        status: statusFilter || undefined,
      });
      setItems(data.content);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, type, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Moving between Blog and Pages leaves the editor open on the wrong
  // kind of thing otherwise.
  useEffect(() => {
    setEditing(null);
    setPage(1);
  }, [type]);

  /**
   * Opens the editor on an existing item, fetching its blocks — the
   * list does not carry them.
   * @param {object} item - The row that was clicked.
   */
  async function openEditor(item) {
    setBusyId(item.id);

    try {
      setEditing(await contentApi.getContent(item.id));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Creates or saves, then refreshes the list behind the editor.
   * @param {object} draft - The form's current values.
   */
  async function save(draft) {
    const payload = {
      type,
      title: draft.title.trim(),
      excerpt: draft.excerpt.trim(),
      bodyHtml: draft.bodyHtml,
      coverImageUrl: draft.coverImageUrl,
      status: draft.status,
      showInHeader: draft.showInHeader,
      showInFooter: draft.showInFooter,
      navLabel: draft.navLabel.trim(),
      seo: draft.seo,
      sortOrder: Number(draft.sortOrder) || 0,
    };

    // The slug is never sent. On create the server makes one from the
    // title and adds -2 if it is taken; on edit it keeps the one it
    // has, so a retitled page does not break links people have saved.

    const saved = draft.id
      ? await contentApi.updateContent(draft.id, payload)
      : await contentApi.createContent(payload);

    setEditing(saved);
    toast.success(
      saved.status === 'published'
        ? `Published. It is live at ${copy.path(saved.slug)}`
        : 'Saved as a draft. Nobody else can see it yet.',
    );
    await load();
  }

  /**
   * Deletes after confirming, since any link to it disappears.
   * @param {object} item - The row being removed.
   */
  async function remove(item) {
    if (
      !(await confirm({
        title: `Delete "${item.title}"?`,
        message: 'Any link to it will be removed.',
        confirmLabel: 'Delete',
        danger: true,
      }))
    )
      return;

    setBusyId(item.id);

    try {
      await contentApi.deleteContent(item.id);
      if (editing?.id === item.id) setEditing(null);
      toast.success(`"${item.title}" has been deleted.`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Publishes or unpublishes from the list, which is the one change an
   * admin makes without wanting to read the whole thing first.
   * @param {object} item - The row being changed.
   */
  async function togglePublished(item) {
    setBusyId(item.id);

    try {
      const next = item.status === 'published' ? 'draft' : 'published';
      await contentApi.updateContent(item.id, { status: next });
      await load();
      toast.success(
        next === 'published'
          ? `"${item.title}" is now live.`
          : `"${item.title}" has been moved back to a draft.`,
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (editing) {
    return (
      <ContentEditor
        value={editing}
        type={type}
        copy={copy}
        onCancel={() => setEditing(null)}
        onSave={save}
      />
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">{copy.heading}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-100">{copy.sub}</p>
        </div>
        <Button size="sm" onClick={() => setEditing(blankDraft(type))}>
          {copy.create}
        </Button>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-navy-900 dark:ring-navy-700">
        <div>
          <label
            htmlFor="content-status"
            className="block text-sm font-medium text-slate-700 dark:text-slate-100"
          >
            Status
          </label>
          <select
            id="content-status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-navy-800 dark:text-slate-50 dark:ring-slate-600"
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-100">
          <Spinner label={`Loading ${copy.heading.toLowerCase()}`} />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-navy-900 dark:text-slate-100">
          {copy.empty}
        </p>
      ) : (
        /* A table, not cards. The questions an admin asks of this
           screen — what is here, who wrote it, when, is it live — are
           four columns, and the row actions appear under the title on
           hover rather than taking a column of their own. */
        <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-navy-900 dark:ring-navy-700">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-navy-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-navy-950 dark:text-slate-100">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Title
                </th>
                <th scope="col" className="px-4 py-3">
                  Author
                </th>
                <th scope="col" className="px-4 py-3">
                  Linked
                </th>
                <th scope="col" className="px-4 py-3">
                  Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {items.map((item) => (
                <tr key={item.id} className="group align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {item.coverImageUrl && (
                        <img
                          src={item.coverImageUrl}
                          alt=""
                          className="h-10 w-14 shrink-0 rounded object-cover"
                        />
                      )}

                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openEditor(item)}
                          className="text-left font-semibold text-slate-900 hover:underline dark:text-slate-50"
                        >
                          {item.title}
                        </button>
                        {item.status !== 'published' && (
                          <span className="ml-2 text-slate-500 dark:text-slate-100">— Draft</span>
                        )}

                        {/* Always rendered, so the row does not change
                            height on hover; only the colour changes. */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 opacity-80 transition group-hover:opacity-100 dark:text-slate-100">
                          {/* Disabled while this row has a request in
                              flight, so a double click cannot open the
                              editor twice or publish twice. */}
                          <RowAction onClick={() => openEditor(item)} disabled={busyId === item.id}>
                            Edit
                          </RowAction>
                          <span aria-hidden="true">|</span>
                          <RowAction
                            onClick={() => togglePublished(item)}
                            disabled={busyId === item.id}
                          >
                            {item.status === 'published' ? 'Unpublish' : 'Publish'}
                          </RowAction>
                          <span aria-hidden="true">|</span>
                          <RowAction onClick={() => remove(item)} danger>
                            Delete
                          </RowAction>
                          {item.status === 'published' && (
                            <>
                              <span aria-hidden="true">|</span>
                              <Link
                                to={copy.path(item.slug)}
                                className="text-slate-600 hover:underline dark:text-slate-100"
                              >
                                View
                              </Link>
                            </>
                          )}
                          <span aria-hidden="true">|</span>
                          <code className="text-slate-500 dark:text-slate-100">
                            {copy.path(item.slug)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-100">
                    {item.author ?? '—'}
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-100">
                    {[item.showInHeader && 'Header', item.showInFooter && 'Footer']
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-100">
                    <span className="block">
                      {item.status === 'published' ? 'Published' : 'Last modified'}
                    </span>
                    {asDate(item.status === 'published' ? item.publishedAt : item.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <Pagination pagination={pagination} onChange={setPage} label={`${copy.one}s`} />
      )}
    </div>
  );
}
