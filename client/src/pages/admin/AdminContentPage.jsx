import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as contentApi from '../../api/content.js';
import { useToast } from '../../context/useToast.js';
import RichTextEditor from '../../components/content/RichTextEditor.jsx';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

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
    if (!window.confirm(`Delete "${item.title}"? Any link to it will be removed.`)) return;

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
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{copy.heading}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{copy.sub}</p>
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

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div>
          <label
            htmlFor="content-status"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
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
            className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label={`Loading ${copy.heading.toLowerCase()}`} />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          {copy.empty}
        </p>
      ) : (
        /* A table, not cards. The questions an admin asks of this
           screen — what is here, who wrote it, when, is it live — are
           four columns, and the row actions appear under the title on
           hover rather than taking a column of their own. */
        <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
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

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                          className="text-left font-semibold text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {item.title}
                        </button>
                        {item.status !== 'published' && (
                          <span className="ml-2 text-slate-500 dark:text-slate-400">— Draft</span>
                        )}

                        {/* Always rendered, so the row does not change
                            height on hover; only the colour changes. */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 opacity-80 transition group-hover:opacity-100 dark:text-slate-500">
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
                                className="text-slate-600 hover:underline dark:text-slate-300"
                              >
                                View
                              </Link>
                            </>
                          )}
                          <span aria-hidden="true">|</span>
                          <code className="text-slate-400 dark:text-slate-500">
                            {copy.path(item.slug)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {item.author ?? '—'}
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {[item.showInHeader && 'Header', item.showInFooter && 'Footer']
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
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

/** The most keywords one page is allowed. Matches the server's cap. */
const MAX_KEYWORDS = 15;

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
function KeywordInput({ id, keywords, onChange }) {
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
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {keyword}
            <button
              type="button"
              onClick={() => onChange(keywords.filter((word) => word !== keyword))}
              aria-label={`Remove ${keyword}`}
              className="grid h-4 w-4 place-items-center rounded-full text-slate-500 hover:bg-slate-300 hover:text-slate-900 dark:hover:bg-slate-600 dark:hover:text-slate-100"
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
          className="min-w-[160px] flex-1 border-0 bg-transparent p-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed dark:text-slate-100"
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
function SeoFields({ draft, set, copy }) {
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
    <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Search engines</h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Optional. Left blank, the title and summary above are used.
        </p>
      </div>

      {/* The preview, roughly as Google lays a result out. */}
      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
        <p className="text-xs text-slate-500 dark:text-slate-400">Preview</p>
        <p className="mt-2 truncate text-xs text-emerald-700 dark:text-emerald-400">
          {window.location.origin}
          {copy.path(draft.slug || 'your-title')}
        </p>
        <p className="truncate text-lg text-blue-700 dark:text-blue-400">{shownTitle}</p>
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
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
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Search description
        </label>
        <textarea
          id="seo-description"
          value={seo.metaDescription}
          onChange={(event) => setSeo('metaDescription', event.target.value)}
          rows={2}
          maxLength={160}
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {seo.metaDescription.length} of 160 characters. This is the sentence under the link.
        </p>
      </div>

      <div>
        <label
          htmlFor="seo-keywords"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Keywords
        </label>
        <KeywordInput
          id="seo-keywords"
          keywords={seo.keywords}
          onChange={(keywords) => setSeo('keywords', keywords)}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Type a comma or press Enter to add one. Up to 15. They appear as topics at the end of the{' '}
          {copy.one}, and are added to the search description when you have not written one.
        </p>
      </div>
    </div>
  );
}

/**
 * One of the small links under a row's title.
 *
 * A button rather than a link, because every one of them acts on the
 * row rather than navigating. They are styled down to look like the
 * row actions they are.
 *
 * @param {{onClick: () => void, danger?: boolean, disabled?: boolean,
 *          children: React.ReactNode}} props
 */
function RowAction({ onClick, danger, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'disabled:cursor-not-allowed disabled:opacity-50',
        danger
          ? 'text-red-600 hover:underline dark:text-red-400'
          : 'text-slate-600 hover:underline dark:text-slate-300',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/**
 * What a new item starts as: a draft, linked nowhere, with an empty
 * body for the editor to open on.
 * @param {'post'|'page'} type
 * @returns {object}
 */
function blankDraft(type) {
  return {
    type,
    title: '',
    slug: '',
    excerpt: '',
    coverImageUrl: '',
    bodyHtml: '',
    seo: { metaTitle: '', metaDescription: '', keywords: [] },
    status: 'draft',
    showInHeader: false,
    showInFooter: false,
    navLabel: '',
    sortOrder: 0,
  };
}

/**
 * The write-and-publish form.
 *
 * It keeps its own copy of the draft so typing does not re-render the
 * list behind it, and hands the whole thing back on save.
 *
 * @param {{value: object, type: string, copy: object,
 *          onCancel: () => void,
 *          onSave: (draft: object) => Promise<void>}} props
 */
function ContentEditor({ value, type, copy, onCancel, onSave }) {
  const toast = useToast();
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef(null);

  // The parent replaces `value` with what the server stored — the real
  // slug, the real publishedAt — so the form shows what was saved
  // rather than what was typed.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  /**
   * Updates one field.
   * @param {string} field
   * @param {unknown} fieldValue
   */
  const set = (field, fieldValue) => setDraft((current) => ({ ...current, [field]: fieldValue }));

  /** Uploads the main picture shown above the title. */
  async function handleCover(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploadingCover(true);

    try {
      set('coverImageUrl', await contentApi.uploadImage(file));
      toast.success('The cover picture has been uploaded.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsUploadingCover(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (draft.title.trim().length < 2) {
      toast.error('Give it a title of at least 2 characters');
      return;
    }

    // An untouched editor reports `<p></p>`, which is empty but not a
    // blank string, so the check looks for words or a picture rather
    // than for length.
    const hasWords = draft.bodyHtml.replace(/<[^>]+>/g, '').trim().length > 0;
    const hasImage = /<img\b/i.test(draft.bodyHtml);

    if (!hasWords && !hasImage) {
      toast.error('Add some text or a picture to the body');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(draft);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          {draft.id ? `Edit ${copy.one}` : copy.create}
        </h2>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Back to the list
        </Button>
      </header>

      <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <TextField
          label="Title"
          value={draft.title}
          onChange={(event) => set('title', event.target.value)}
          maxLength={160}
        />

        {/* No address field. It is made from the title, and a second
            "About us" simply becomes about-us-2 — which is the server's
            job, not something to put in front of whoever is writing. */}

        <div>
          <label
            htmlFor="draft-excerpt"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Summary
          </label>
          <textarea
            id="draft-excerpt"
            value={draft.excerpt}
            onChange={(event) => set('excerpt', event.target.value)}
            rows={2}
            maxLength={300}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            One line, shown {type === 'post' ? 'in the blog list' : 'under the title'}.{' '}
            {draft.excerpt.length} of 300 characters.
          </p>
        </div>

        {/* The main picture. Above the body because it is above the
            body on the page it produces. */}
        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Main picture
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {draft.coverImageUrl ? (
              <img
                src={draft.coverImageUrl}
                alt=""
                className="h-24 w-40 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-24 w-40 place-items-center rounded-lg bg-slate-100 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                None
              </span>
            )}

            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCover}
              className="sr-only"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                isLoading={isUploadingCover}
                onClick={() => coverInputRef.current?.click()}
              >
                {draft.coverImageUrl ? 'Replace' : 'Upload'}
              </Button>
              {draft.coverImageUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => set('coverImageUrl', '')}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            JPG, PNG or WEBP. Shown at the top of the {copy.one} and beside it in lists.
          </p>
        </div>
      </div>

      <SeoFields draft={draft} set={set} copy={copy} />

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Body</h3>
        <p className="mb-3 mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Write here. Paste or drag a picture in to place it in the text.
        </p>

        <RichTextEditor value={draft.bodyHtml} onChange={(html) => set('bodyHtml', html)} />
      </div>

      <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label
              htmlFor="draft-status"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Status
            </label>
            <select
              id="draft-status"
              value={draft.status}
              onChange={(event) => set('status', event.target.value)}
              className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <p className="pb-2 text-sm text-slate-500 dark:text-slate-400">
            {draft.status === 'published' ? 'Anyone can read it.' : 'Only you can see it.'}
          </p>
        </div>

        {/* Only pages need this. A post is listed on the blog the
            moment it is published, so asking a writer where to link it
            is a question with no useful answer. */}
        {type === 'page' && (
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Where it is linked</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              A draft is never linked, whatever is ticked here.
            </p>

            <label className="mt-3 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={draft.showInHeader}
                onChange={(event) => set('showInHeader', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600"
              />
              Show in the header
            </label>

            <label className="mt-2 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={draft.showInFooter}
                onChange={(event) => set('showInFooter', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600"
              />
              Show in the footer
            </label>

            <div className="mt-3 flex flex-wrap gap-4">
              <TextField
                label="Link text"
                value={draft.navLabel}
                onChange={(event) => set('navLabel', event.target.value)}
                maxLength={40}
                hint="Left blank, the title is used."
                className="min-w-[220px] flex-1"
              />
              <TextField
                label="Order"
                type="number"
                min="0"
                max="99"
                value={draft.sortOrder}
                onChange={(event) => set('sortOrder', event.target.value)}
                hint="Lower comes first."
                className="w-28"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" isLoading={isSaving}>
          {isSaving ? 'Saving' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
