/** The editor for one page or post, and the empty draft it starts from. */
import * as contentApi from '../../../api/content.js';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../context/useToast.js';
import RichTextEditor from '../../../components/content/RichTextEditor.jsx';
import Button from '../../../components/ui/Button.jsx';
import TextField from '../../../components/ui/TextField.jsx';
import { SeoFields } from './SeoFields.jsx';

/**
 * What a new item starts as: a draft, linked nowhere, with an empty
 * body for the editor to open on.
 * @param {'post'|'page'} type
 * @returns {object}
 */
export function blankDraft(type) {
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
export function ContentEditor({ value, type, copy, onCancel, onSave }) {
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
        <h2 className="font-semibold text-slate-900 dark:text-slate-50">
          {draft.id ? `Edit ${copy.one}` : copy.create}
        </h2>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Back to the list
        </Button>
      </header>

      <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-navy-900 dark:ring-navy-700">
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
            className="block text-sm font-medium text-slate-700 dark:text-slate-100"
          >
            Summary
          </label>
          <textarea
            id="draft-excerpt"
            value={draft.excerpt}
            onChange={(event) => set('excerpt', event.target.value)}
            rows={2}
            maxLength={300}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-navy-800 dark:text-slate-50 dark:ring-slate-600"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-100">
            One line, shown {type === 'post' ? 'in the blog list' : 'under the title'}.{' '}
            {draft.excerpt.length} of 300 characters.
          </p>
        </div>

        {/* The main picture. Above the body because it is above the
            body on the page it produces. */}
        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-100">
            Main picture
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {draft.coverImageUrl ? (
              <img
                src={draft.coverImageUrl}
                alt=""
                className="h-24 w-40 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-navy-700"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-24 w-40 place-items-center rounded-lg bg-slate-100 text-xs text-slate-500 dark:bg-navy-800 dark:text-slate-100"
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
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-100">
            JPG, PNG or WEBP. Shown at the top of the {copy.one} and beside it in lists.
          </p>
        </div>
      </div>

      <SeoFields draft={draft} set={set} copy={copy} />

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-navy-900 dark:ring-navy-700">
        <h3 className="font-semibold text-slate-900 dark:text-slate-50">Body</h3>
        <p className="mb-3 mt-0.5 text-sm text-slate-500 dark:text-slate-100">
          Write here. Paste or drag a picture in to place it in the text.
        </p>

        <RichTextEditor value={draft.bodyHtml} onChange={(html) => set('bodyHtml', html)} />
      </div>

      <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-navy-900 dark:ring-navy-700">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label
              htmlFor="draft-status"
              className="block text-sm font-medium text-slate-700 dark:text-slate-100"
            >
              Status
            </label>
            <select
              id="draft-status"
              value={draft.status}
              onChange={(event) => set('status', event.target.value)}
              className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-navy-800 dark:text-slate-50 dark:ring-slate-600"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <p className="pb-2 text-sm text-slate-500 dark:text-slate-100">
            {draft.status === 'published' ? 'Anyone can read it.' : 'Only you can see it.'}
          </p>
        </div>

        {/* Only pages need this. A post is listed on the blog the
            moment it is published, so asking a writer where to link it
            is a question with no useful answer. */}
        {type === 'page' && (
          <div className="border-t border-slate-200 pt-4 dark:border-navy-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50">Where it is linked</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-100">
              A draft is never linked, whatever is ticked here.
            </p>

            <label className="mt-3 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-100">
              <input
                type="checkbox"
                checked={draft.showInHeader}
                onChange={(event) => set('showInHeader', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600"
              />
              Show in the header
            </label>

            <label className="mt-2 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-100">
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
