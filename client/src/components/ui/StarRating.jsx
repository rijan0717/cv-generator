/**
 * Star rating, used both as an input and as a read-only display.
 *
 * As an input it is a real radio group rather than a row of clickable
 * `div`s, so it can be reached and set with the keyboard and a screen
 * reader announces "3 stars" rather than "button".
 *
 * @param {{value: number, onChange?: (value: number) => void,
 *          size?: 'sm'|'md'|'lg', readOnly?: boolean, label?: string}} props
 */
const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

/**
 * One star shape.
 * @param {{filled: boolean, className: string}} props
 */
function Star({ filled, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"
      />
    </svg>
  );
}

export default function StarRating({
  value = 0,
  onChange,
  size = 'md',
  readOnly = false,
  label = 'Rating',
}) {
  const starClass = SIZES[size];

  if (readOnly || !onChange) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-amber-500"
        role="img"
        aria-label={`${value} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} filled={star <= value} className={starClass} />
        ))}
      </span>
    );
  }

  return (
    <fieldset className="inline-flex items-center gap-1">
      <legend className="sr-only">{label}</legend>

      {[1, 2, 3, 4, 5].map((star) => (
        <label
          key={star}
          className="cursor-pointer text-amber-500 transition hover:scale-110 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-500"
          title={`${star} star${star === 1 ? '' : 's'}`}
        >
          <input
            type="radio"
            name="rating"
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            className="sr-only"
          />
          <span className="sr-only">
            {star} star{star === 1 ? '' : 's'}
          </span>
          <Star
            filled={star <= value}
            className={`${starClass} ${star <= value ? '' : 'text-slate-300 dark:text-slate-600'}`}
          />
        </label>
      ))}
    </fieldset>
  );
}
