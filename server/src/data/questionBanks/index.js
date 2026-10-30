/**
 * The built-in question banks, one per category.
 *
 * A bank belongs to a category rather than a single position, so all 50
 * positions in "Software Engineering" draw on the same set. That is what
 * makes 700 positions workable: writing 120 questions per position would
 * be 84,000 questions, where 120 per category is 1,680.
 *
 * Categories still missing a bank are listed below so the gap is
 * visible rather than implied by silence.
 */
import { GENERAL_BANK } from './general.js';
import { SOFTWARE_ENGINEERING_BANK } from './software-engineering.js';

/**
 * The general bank comes first because every position draws on it; a
 * category bank adds specialist questions on top.
 *
 * @type {Array<{category: string, questions: Array<object>}>}
 */
export const QUESTION_BANKS = [GENERAL_BANK, SOFTWARE_ENGINEERING_BANK];

/**
 * Every category in `builtInPositions.json`, so the seed can report
 * which ones have no questions yet.
 */
export const ALL_CATEGORIES = [
  'Software Engineering',
  'Data, AI & Analytics',
  'Cloud, DevOps & Cybersecurity',
  'Product, Design & Creative',
  'Marketing, Sales & Customer Success',
  'Finance, Accounting & Insurance',
  'HR, Legal, Admin & Operations',
  'Healthcare & Medical',
  'Engineering (Core Disciplines)',
  'Education & Research',
  'Hospitality, Retail & Travel',
  'Manufacturing, Logistics & Supply Chain',
  'Skilled Trades, Construction & Property',
  'Media, Public Sector, Agriculture & Nonprofit',
];

export default QUESTION_BANKS;
