/**
 * Content controller: the public blog and pages, and the admin's CRUD
 * over both.
 *
 * The public half never sees a draft. That is enforced in the query
 * rather than filtered afterwards, so an unpublished page cannot be
 * reached by guessing its slug.
 */
import { Content, slugify, CONTENT_TYPES } from '../models/Content.js';
import { sanitiseHtml, htmlToText } from '../services/htmlSanitiser.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { readPagination, buildPagination } from '../utils/pagination.js';

/** Only published, undeleted content is public. */
const PUBLIC_FILTER = { status: 'published', isDeleted: false };

/**
 * The shape the public pages read.
 * @param {object} doc - A Content document or lean object.
 * @returns {object}
 */
function toPublicJSON(doc) {
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    coverImageUrl: doc.coverImageUrl ?? '',
    bodyHtml: doc.bodyHtml ?? '',
    // Pages written before the editor changed still have a block body
    // and still have to render, so it travels alongside until they are
    // next edited. `bodyHtml` wins wherever both exist.
    blocks: doc.bodyHtml ? [] : (doc.blocks ?? []),
    author: doc.author?.name ?? null,
    publishedAt: doc.publishedAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * The shape the admin list reads: everything above, plus the fields
 * only an admin can change.
 * @param {object} doc - A Content document or lean object.
 * @returns {object}
 */
function toAdminJSON(doc) {
  return {
    ...toPublicJSON(doc),
    status: doc.status,
    showInHeader: doc.showInHeader,
    showInFooter: doc.showInFooter,
    navLabel: doc.navLabel,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt,
  };
}

/**
 * Finds a slug nobody is using, by adding `-2`, `-3` and so on.
 *
 * A clash is ordinary rather than exceptional — "About us" written
 * twice a year apart — so it is resolved rather than rejected. The
 * admin sees the slug they ended up with on the next screen.
 *
 * @param {string} base - The desired slug.
 * @param {string} [excludeId] - The document being edited, if any.
 * @returns {Promise<string>} A free slug.
 */
async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || 'untitled';

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? root : `${root}-${suffix + 1}`;
    const clash = await Content.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select('_id')
      .lean();

    if (!clash) return candidate;
  }

  // Fifty "about-us" pages is not a case worth more code than this.
  return `${root}-${Date.now()}`;
}

// --- Public ----------------------------------------------------------------

/**
 * GET /api/content/nav
 *
 * The links for the header and the footer, in the admin's order. One
 * request for both, because every page in the application renders both
 * and two requests for a handful of links would be two.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function getNavigation(_req, res) {
  const items = await Content.find({
    ...PUBLIC_FILTER,
    $or: [{ showInHeader: true }, { showInFooter: true }],
  }).sort({ sortOrder: 1, title: 1 });

  sendSuccess(
    res,
    {
      header: items.filter((item) => item.showInHeader).map((item) => item.toNavJSON()),
      footer: items.filter((item) => item.showInFooter).map((item) => item.toNavJSON()),
    },
    'Navigation',
  );
}

/**
 * GET /api/content/posts
 * The blog: published posts, newest first, paginated.
 */
export async function listPosts(req, res) {
  const { page, limit, skip } = readPagination(req, 9);

  const filter = { ...PUBLIC_FILTER, type: 'post' };

  const [posts, total] = await Promise.all([
    Content.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name')
      .lean(),
    Content.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      // The list does not carry bodies: a page of nine articles would
      // otherwise send every word of all nine to render nine summaries.
      posts: posts.map((post) => ({ ...toPublicJSON(post), bodyHtml: undefined, blocks: undefined })),
      pagination: buildPagination({ page, limit }, total),
    },
    'Posts',
  );
}

/**
 * GET /api/content/:slug
 * One published page or post.
 */
export async function getBySlug(req, res) {
  const item = await Content.findOne({ ...PUBLIC_FILTER, slug: req.params.slug })
    .populate('author', 'name')
    .lean();

  // The same answer for "no such slug" and "that one is a draft": an
  // unpublished page should not be discoverable by its 403.
  if (!item) throw ApiError.notFound('That page could not be found');

  sendSuccess(res, { content: toPublicJSON(item) }, item.title);
}

// --- Admin -----------------------------------------------------------------

/**
 * GET /api/admin/content
 * Everything, drafts included, filtered by type and status.
 */
export async function listAllContent(req, res) {
  const { page, limit, skip } = readPagination(req);
  const { type, status, search } = req.query;

  const filter = { isDeleted: false };
  if (CONTENT_TYPES.includes(type)) filter.type = type;
  if (status) filter.status = status;
  if (search?.trim()) {
    // Escaped, so a search for "a.*" cannot become a collection scan.
    const safe = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = new RegExp(safe, 'i');
  }

  const [items, total] = await Promise.all([
    Content.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name')
      .lean(),
    Content.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      content: items.map((item) => ({ ...toAdminJSON(item), bodyHtml: undefined, blocks: undefined })),
      pagination: buildPagination({ page, limit }, total),
    },
    'Content',
  );
}

/**
 * GET /api/admin/content/:id
 * One item in full, including its body, for the editor.
 */
export async function getContent(req, res) {
  const item = await Content.findById(req.params.id).populate('author', 'name').lean();
  if (!item || item.isDeleted) throw ApiError.notFound('Content not found');

  sendSuccess(res, { content: toAdminJSON(item) }, item.title);
}

/** The fields an admin may set, on create and on edit alike. */
const EDITABLE = [
  'type',
  'title',
  'excerpt',
  'coverImageUrl',
  'status',
  'showInHeader',
  'showInFooter',
  'navLabel',
  'sortOrder',
];

/**
 * Sanitises a body and refuses an empty one.
 *
 * The editor sends HTML, so the first job is to strip anything that is
 * not on the allow-list — see `services/htmlSanitiser.js` for what
 * survives and why. The second is to notice that `<p></p>` is what an
 * untouched editor sends, and that saving it would produce a page with
 * a title and nothing under it.
 *
 * @param {unknown} html - Whatever arrived in the request body.
 * @returns {string} Clean HTML, safe to store.
 * @throws {ApiError} When the body is empty once the markup is removed.
 */
function cleanBody(html) {
  const clean = sanitiseHtml(html);

  // An image on its own is a perfectly good body, so the emptiness
  // check looks for any content at all rather than only for words.
  const hasWords = htmlToText(clean, 10).length > 0;
  const hasImage = /<img\b/i.test(clean);

  if (!hasWords && !hasImage) throw ApiError.badRequest('Please write something');
  if (clean.length > 200000) throw ApiError.badRequest('That is too long to store');

  return clean;
}

/**
 * POST /api/admin/content
 * Writes a new page or post.
 */
export async function createContent(req, res) {
  const fields = Object.fromEntries(
    EDITABLE.map((key) => [key, req.body[key]]).filter(([, value]) => value !== undefined),
  );

  const item = await Content.create({
    ...fields,
    bodyHtml: cleanBody(req.body.bodyHtml),
    slug: await uniqueSlug(req.body.slug || req.body.title),
    author: req.user._id,
  });

  // `create` leaves the author as an id. The editor shows the name, so
  // it is resolved here rather than the client having to look it up.
  await item.populate('author', 'name');

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: { action: 'CONTENT_CREATE', slug: item.slug, type: item.type },
    ip: req.ip,
  });

  sendCreated(res, { content: toAdminJSON(item) }, 'Saved');
}

/**
 * PATCH /api/admin/content/:id
 * Edits one, including publishing and unpublishing it.
 */
export async function updateContent(req, res) {
  const item = await Content.findById(req.params.id);
  if (!item || item.isDeleted) throw ApiError.notFound('Content not found');

  EDITABLE.forEach((key) => {
    if (req.body[key] !== undefined) item[key] = req.body[key];
  });

  // Cleaned only when the editor actually sent a body: publishing from
  // the list sends `{ status }` alone and must not have to resend the
  // whole document to pass validation.
  if (req.body.bodyHtml !== undefined) {
    item.bodyHtml = cleanBody(req.body.bodyHtml);
    // The old block body is dropped once the page has been rewritten
    // in the editor, so there is only ever one body to render.
    item.blocks = [];
  }

  // Only rewritten when the admin actually sends one: a slug is a URL
  // somebody may have bookmarked, so it does not quietly follow a
  // retitled page.
  if (req.body.slug !== undefined) {
    item.slug = await uniqueSlug(req.body.slug || item.title, item._id);
  }

  await item.save();
  await item.populate('author', 'name');

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: { action: 'CONTENT_UPDATE', slug: item.slug, status: item.status },
    ip: req.ip,
  });

  sendSuccess(res, { content: toAdminJSON(item) }, 'Saved');
}

/**
 * POST /api/admin/content/images
 *
 * Takes one image and answers with its URL, which the editor then puts
 * into a block or uses as the cover.
 *
 * Upload and save are separate steps on purpose: an admin adds a
 * picture mid-paragraph and expects to see it immediately, and making
 * that wait for the whole document to be saved would be a worse
 * editor. The cost is that an image uploaded into a draft that is
 * never saved stays on disk — a few unreferenced files, against an
 * editor that behaves the way people expect.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function uploadContentImage(req, res) {
  if (!req.file) throw ApiError.badRequest('Please choose an image to upload');

  sendCreated(res, { url: `/uploads/${req.file.filename}` }, 'Image uploaded');
}

/**
 * DELETE /api/admin/content/:id
 *
 * Soft delete, as everywhere else in the system: the row stays so the
 * activity log that mentions it still resolves, and so a deletion made
 * by accident is recoverable from the database.
 */
export async function deleteContent(req, res) {
  const item = await Content.findById(req.params.id);
  if (!item || item.isDeleted) throw ApiError.notFound('Content not found');

  item.isDeleted = true;
  // Taken out of the navigation at the same time, or the header keeps a
  // link to something that now 404s.
  item.showInHeader = false;
  item.showInFooter = false;
  await item.save();

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: { action: 'CONTENT_DELETE', slug: item.slug },
    ip: req.ip,
  });

  sendSuccess(res, null, 'Deleted');
}
