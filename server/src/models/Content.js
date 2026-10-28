/**
 * Content model: the pages and blog posts an admin writes.
 *
 * One collection for both, separated by `type`, because they are the
 * same thing in every respect that matters here — a title, a slug, a
 * body and a publication state. Two collections would mean two
 * controllers, two admin screens and two sets of slug-uniqueness rules
 * to keep in step. What differs is only where they are listed: posts
 * appear on the blog, pages do not appear anywhere unless the admin
 * links them into the header or the footer.
 *
 * The body is stored and rendered as **plain text**. React escapes it,
 * so nothing an admin types can inject markup into another user's page.
 * That is a deliberate trade: rich formatting would mean either a
 * sanitiser dependency or hand-rolled HTML handling, and neither is
 * worth the risk for a notices-and-articles feature.
 */
import mongoose from 'mongoose';

/** What a piece of content is. */
export const CONTENT_TYPES = ['page', 'post'];

/** Whether the public can see it. */
export const CONTENT_STATUSES = ['draft', 'published'];

/**
 * Turns a title into a URL slug.
 *
 * Exported because both the model and the admin form need the same
 * answer: the form shows the slug it is about to get, and a form that
 * previews one slug while the server stores another is worse than no
 * preview at all.
 *
 * @param {string} value - Any text, usually the title.
 * @returns {string} A lowercase, hyphenated slug.
 */
export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** The kinds of block a body is built from. */
export const BLOCK_TYPES = ['heading', 'paragraph', 'image', 'quote'];

/** How a block sits on the page. */
export const BLOCK_ALIGNMENTS = ['left', 'center', 'right'];

/** How wide an image is drawn. */
export const BLOCK_WIDTHS = ['small', 'medium', 'full'];

/**
 * One block of a body.
 *
 * The body is a list of these rather than a string of HTML, which is
 * what lets an admin put a picture between two paragraphs and say where
 * it sits — the same thing a rich text editor gives you, without the
 * two costs that come with one. There is no markup to sanitise, so no
 * admin can put a script on a reader's page; and the renderer is React,
 * so a block can never break the layout around it.
 *
 * Every field is optional because the meaningful ones differ by type: a
 * paragraph has `text`, an image has `url`. The controller checks the
 * combination.
 */
const blockSchema = new mongoose.Schema(
  {
    type: { type: String, enum: BLOCK_TYPES, required: true },

    /** Heading, paragraph and quote text. Plain; React escapes it. */
    text: { type: String, trim: true, maxlength: 20000, default: '' },

    /** Image blocks: the uploaded file, under /uploads. */
    url: { type: String, trim: true, default: '' },

    /** What the image shows, for anyone who cannot see it. */
    alt: { type: String, trim: true, maxlength: 200, default: '' },

    /** A line under an image. */
    caption: { type: String, trim: true, maxlength: 300, default: '' },

    align: { type: String, enum: BLOCK_ALIGNMENTS, default: 'left' },

    /** Images only. Text is always full width. */
    width: { type: String, enum: BLOCK_WIDTHS, default: 'full' },

    /** Heading blocks: 2 or 3. The page title is the only h1. */
    level: { type: Number, enum: [2, 3], default: 2 },
  },
  { _id: false },
);

const contentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: CONTENT_TYPES,
      required: true,
      default: 'page',
    },

    title: {
      type: String,
      required: [true, 'Please give this a title'],
      trim: true,
      maxlength: [160, 'Title must be at most 160 characters'],
    },

    /**
     * The URL segment. Unique across both types, because they share a
     * namespace in the admin's head even though they do not in the
     * routes: two things called "about" would be a trap.
     */
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
    },

    /** One line shown in the blog list and in search results. */
    excerpt: {
      type: String,
      trim: true,
      maxlength: [300, 'Summary must be at most 300 characters'],
      default: '',
    },

    /**
     * The body, as HTML written in the editor.
     *
     * Always sanitised before it gets here — see
     * `services/htmlSanitiser.js`. Nothing writes to this field without
     * going through that, so what is at rest is already safe to render.
     */
    bodyHtml: { type: String, default: '', maxlength: 200000 },

    /**
     * The old block-based body.
     *
     * Kept so pages written before the editor changed still render.
     * Nothing writes to it any more; `bodyHtml` wins when both exist.
     */
    blocks: { type: [blockSchema], default: [] },

    /**
     * The picture at the top of a post.
     *
     * Stored as a path under /uploads, like every other upload in the
     * system, so it is served by the same static route and backed up
     * with the same folder.
     */
    coverImageUrl: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: 'draft',
    },

    // --- Where it is linked from ------------------------------------------

    /** Shown in the top bar. Kept short: the bar has little room. */
    showInHeader: { type: Boolean, default: false },

    /** Shown in the footer's links column. */
    showInFooter: { type: Boolean, default: false },

    /**
     * The wording used in those links, when the title is too long for a
     * navigation bar. Falls back to the title.
     */
    navLabel: {
      type: String,
      trim: true,
      maxlength: [40, 'Link text must be at most 40 characters'],
      default: '',
    },

    /** Position among the other links. Lower comes first. */
    sortOrder: { type: Number, default: 0 },

    // --- Bookkeeping -------------------------------------------------------

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * When it first went public. Set on the move from draft to
     * published and never reset, so editing a year-old post does not
     * make it look new.
     */
    publishedAt: { type: Date, default: null },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/** The blog list and the nav both filter on these. */
contentSchema.index({ type: 1, status: 1, isDeleted: 1, publishedAt: -1 });
contentSchema.index({ showInHeader: 1, showInFooter: 1, sortOrder: 1 });

/**
 * Stamps `publishedAt` the first time something is published.
 *
 * In a hook rather than the controller because there are two routes
 * that can publish — creating something already published, and editing
 * a draft — and a date that depends on which one was used is a bug
 * waiting to happen.
 */
contentSchema.pre('save', function stampPublishedAt(next) {
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

/** The link as the header and footer need it. */
contentSchema.methods.toNavJSON = function toNavJSON() {
  return {
    id: this._id.toString(),
    label: this.navLabel || this.title,
    to: this.type === 'post' ? `/blog/${this.slug}` : `/p/${this.slug}`,
    sortOrder: this.sortOrder,
  };
};

export const Content = mongoose.model('Content', contentSchema);
export default Content;
