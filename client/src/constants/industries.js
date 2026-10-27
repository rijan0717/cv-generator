/**
 * The same industry and employment-type lists the server holds in
 * `server/src/data/industries.js`.
 *
 * They are repeated here so the dropdowns render without waiting for a
 * request. The server is still the authority: it validates every value
 * that is saved, so a list that drifts shows a bad option rather than
 * storing bad data.
 */
export const INDUSTRIES = [
  { value: 'technology', label: 'Technology & IT' },
  { value: 'accounting-finance', label: 'Accounting & Finance' },
  { value: 'banking-insurance', label: 'Banking & Insurance' },
  { value: 'engineering', label: 'Engineering & Manufacturing' },
  { value: 'construction', label: 'Construction & Property' },
  { value: 'healthcare', label: 'Healthcare & Medicine' },
  { value: 'education', label: 'Education & Training' },
  { value: 'marketing-sales', label: 'Marketing & Sales' },
  { value: 'design-media', label: 'Design & Media' },
  { value: 'hospitality-tourism', label: 'Hospitality & Tourism' },
  { value: 'logistics-transport', label: 'Logistics & Transport' },
  { value: 'legal', label: 'Legal' },
  { value: 'government-ngo', label: 'Government & NGO' },
  { value: 'other', label: 'Other' },
];

export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full time' },
  { value: 'part-time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];

/**
 * The readable label for a stored key, falling back to the key itself so
 * an unrecognised value still shows as something.
 * @param {Array<{value: string, label: string}>} list - INDUSTRIES or EMPLOYMENT_TYPES.
 * @param {string} value - The stored key.
 * @returns {string} The label to display.
 */
export function labelFor(list, value) {
  return list.find((entry) => entry.value === value)?.label ?? value ?? '';
}
