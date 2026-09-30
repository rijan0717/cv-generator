/**
 * A company's logo, with a lettered badge as the fallback.
 *
 * Used on every job card, on the advert itself and on the company pages,
 * so a jobseeker can see who is hiring at a glance rather than reading a
 * name. Most companies here will not have uploaded anything, so the
 * fallback is not an afterthought — it is what the board mostly shows, and
 * it has to look deliberate.
 *
 * The logo is decorative in every place it appears: the company's name is
 * always beside it in text. So the image is hidden from assistive
 * technology rather than given a name that would be read out twice.
 *
 * @param {{company?: {name?: string, logoUrl?: string}|null,
 *          size?: 'sm'|'md'|'lg', className?: string}} props
 */
export default function CompanyLogo({ company, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-9 w-9 text-sm rounded-lg',
    md: 'h-12 w-12 text-base rounded-xl',
    lg: 'h-20 w-20 text-2xl rounded-xl',
  };

  const box = `${sizes[size]} shrink-0 ${className}`;
  const name = company?.name?.trim() || '';

  if (company?.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt=""
        aria-hidden="true"
        // `contain` rather than `cover`: a logo cropped to fill a square is
        // a logo with its edges cut off.
        className={`${box} bg-white object-contain p-1 ring-1 ring-slate-200 dark:ring-slate-700`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} grid place-items-center bg-slate-100 font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700`}
    >
      {name ? name.charAt(0).toUpperCase() : '?'}
    </span>
  );
}
