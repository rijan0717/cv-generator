import DOMPurify from 'dompurify';

/**
 * Renders a body written in the editor.
 *
 * The HTML was already sanitised on the server before it was stored,
 * so this pass is belt and braces rather than the only defence. It is
 * cheap, and it covers a row written by some future code path that
 * forgets to go through the server's sanitiser — which is exactly the
 * kind of mistake that only shows up as a security hole.
 *
 * `dangerouslySetInnerHTML` is unavoidable for stored markup. What
 * makes it safe is what reaches it, and nothing reaches it unsanitised.
 *
 * @param {{html?: string, blocks?: Array<object>}} props - `html` is
 *   the current format; `blocks` renders a page written before the
 *   editor changed.
 */
export default function ContentBody({ html, blocks }) {
  if (html) {
    return (
      <div
        className="content-body"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
        }}
      />
    );
  }

  if (Array.isArray(blocks) && blocks.length > 0) return <LegacyBlocks blocks={blocks} />;

  return null;
}

/** How an old image block was sized. */
const WIDTHS = { small: 'max-w-xs', medium: 'max-w-md', full: 'w-full' };

/** How an old block sat in the column. */
const ALIGNMENTS = { left: 'text-left', center: 'text-center', right: 'text-right' };

/**
 * The previous body format: an ordered list of typed blocks.
 *
 * Kept so pages written before the editor changed still render. They
 * convert the first time somebody opens and saves them, so this will
 * fall out of use on its own.
 *
 * @param {{blocks: Array<object>}} props
 */
function LegacyBlocks({ blocks }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const align = ALIGNMENTS[block.align] ?? ALIGNMENTS.left;

        if (block.type === 'image') {
          return (
            <figure key={index} className={ALIGNMENTS[block.align] ?? ALIGNMENTS.center}>
              <img
                src={block.url}
                alt={block.alt || ''}
                loading="lazy"
                className={`mx-auto rounded-xl ${WIDTHS[block.width] ?? WIDTHS.full}`}
              />
              {block.caption && (
                <figcaption className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        if (block.type === 'heading') {
          const Tag = block.level === 3 ? 'h3' : 'h2';
          return (
            <Tag
              key={index}
              className={`${block.level === 3 ? 'text-lg' : 'text-xl'} font-semibold text-slate-900 dark:text-slate-100 ${align}`}
            >
              {block.text}
            </Tag>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={index}
              className={`border-l-4 border-slate-300 pl-4 italic text-slate-600 dark:border-slate-600 dark:text-slate-400 ${align}`}
            >
              {block.text}
            </blockquote>
          );
        }

        return (
          <p
            key={index}
            className={`whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300 ${align}`}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
