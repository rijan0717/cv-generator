/**
 * The industries a job seeker can put on their profile, and that an
 * employer can filter the candidate directory by.
 *
 * A fixed list rather than free text on purpose: filtering is the whole
 * point of the field, and free text would give "IT", "I.T.", "Tech" and
 * "Information Technology" as four separate industries that no filter can
 * bring back together.
 *
 * The stored value is the key, never the label, so a label can be reworded
 * without a migration. `client/src/constants/industries.js` holds the same
 * list for the dropdowns; the server is what validates it.
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

/** Just the keys, which is what the schema and the validators need. */
export const INDUSTRY_VALUES = INDUSTRIES.map((industry) => industry.value);

/** The kinds of work a job seeker will consider. More than one is normal. */
export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full time' },
  { value: 'part-time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];

export const EMPLOYMENT_TYPE_VALUES = EMPLOYMENT_TYPES.map((type) => type.value);

/**
 * The readable label for a stored key, falling back to the key itself so an
 * old value left in the database still shows as something.
 * @param {Array<{value: string, label: string}>} list - INDUSTRIES or EMPLOYMENT_TYPES.
 * @param {string} value - The stored key.
 * @returns {string} The label to display.
 */
export function labelFor(list, value) {
  return list.find((entry) => entry.value === value)?.label ?? value ?? '';
}
