/**
 * "Rewrite CV" — the entry point to the Job-Tailored CV Rewrite.
 *
 * Styled apart from Save and Apply rather than matching them, because it
 * does something different in kind: Save and Apply act on the advert,
 * this one writes a document. The gradient marks it as the generative
 * action without the label claiming anything the feature does not do —
 * the rewrite is a rule-based transformer, and calling it "AI rewrite"
 * is a claim that would have to be defended in the viva.
 *
 * It is a real `<button>` with its own disabled and busy states rather
 * than a styled `div`, so it keyboard-focuses and announces like every
 * other control on the page. Shared by the job page and Rewrite with JD,
 * so the action looks the same wherever it appears.
 *
 * @param {{isLoading?: boolean, onClick?: () => void, disabled?: boolean,
 *          type?: 'button'|'submit', title?: string}} props
 */
export default function RewriteButton({
  isLoading = false,
  onClick,
  disabled = false,
  type = 'button',
  title = 'Rewrite your primary CV to match this job',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      aria-busy={isLoading}
      title={title}
      className={[
        'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition',
        'bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500',
        'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
      ].join(' ')}
    >
      <svg
        className={`h-4 w-4 ${isLoading ? 'animate-pulse motion-reduce:animate-none' : ''}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5ZM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
      </svg>
      {isLoading ? 'Rewriting…' : 'Rewrite CV'}
    </button>
  );
}
