/**
 * Text preprocessing for the CV–Job Match Analyser.
 *
 * Turns free text into a list of comparable tokens. Everything here is our
 * own code — no NLP library is used.
 *
 * The order of the steps matters, and one ordering decision is the whole
 * reason this module exists as a separate stage:
 *
 *   1. Lowercase.
 *   2. **Normalise protected technical terms** — before punctuation is
 *      stripped.
 *   3. Remove the remaining punctuation.
 *   4. Split into tokens.
 *   5. Remove stop words.
 *   6. Stem.
 *   7. Add bigrams.
 *
 * Step 2 has to come before step 3. "node.js" with its punctuation removed
 * becomes "node js" — two tokens, neither of which matches a CV that says
 * "Node.js". The same destroys "c++", "c#" and ".net". Protecting them
 * first is what keeps those matches working, and it is the single most
 * common thing a naive implementation gets wrong.
 */
import { isStopWord } from '../data/stopWords.js';

/**
 * Technical terms whose punctuation carries meaning.
 *
 * Longest first, so "asp.net" is replaced before ".net" can match inside
 * it. Order is significant, so this is an array rather than an object.
 */
const PROTECTED_TERMS = [
  ['asp.net', 'aspnet'],
  ['node.js', 'nodejs'],
  ['next.js', 'nextjs'],
  ['vue.js', 'vuejs'],
  ['react.js', 'reactjs'],
  ['express.js', 'expressjs'],
  ['angular.js', 'angularjs'],
  ['d3.js', 'd3js'],
  ['three.js', 'threejs'],
  ['ci/cd', 'cicd'],
  ['ui/ux', 'uiux'],
  ['c++', 'cplusplus'],
  ['c#', 'csharp'],
  ['f#', 'fsharp'],
  ['.net', 'dotnet'],
  ['objective-c', 'objectivec'],
  ['front-end', 'frontend'],
  ['back-end', 'backend'],
  ['full-stack', 'fullstack'],
  ['e-commerce', 'ecommerce'],
  ['a/b', 'ab'],
  ['rest api', 'restapi'],
  ['machine learning', 'machinelearning'],
  ['deep learning', 'deeplearning'],
  ['data science', 'datascience'],
  ['data analysis', 'dataanalysis'],
  ['project management', 'projectmanagement'],
  ['customer service', 'customerservice'],
  ['test automation', 'testautomation'],
  ['unit testing', 'unittesting'],
  ['power bi', 'powerbi'],
  ['sql server', 'sqlserver'],
  ['google cloud', 'googlecloud'],
  ['amazon web services', 'aws'],
];

/**
 * Multi-word phrases worth keeping as one term when they appear as two
 * adjacent tokens. Used by the bigram step.
 */
const MEANINGFUL_BIGRAMS = new Set([
  'machine learning',
  'deep learning',
  'data science',
  'data analysis',
  'data analytics',
  'project management',
  'customer service',
  'customer support',
  'quality assurance',
  'software development',
  'software engineering',
  'web development',
  'mobile development',
  'test automation',
  'unit testing',
  'integration testing',
  'regression testing',
  'functional testing',
  'performance testing',
  'user experience',
  'user interface',
  'version control',
  'continuous integration',
  'agile methodology',
  'business analysis',
  'financial reporting',
  'social media',
  'content marketing',
  'search engine',
  'problem solving',
  'team leadership',
  'stakeholder management',
]);

/**
 * Lowercases the text and protects technical terms before any punctuation
 * is removed.
 *
 * @param {string} text - Raw input.
 * @returns {string} Lowercased text with protected terms rewritten.
 */
export function normaliseText(text) {
  let result = String(text ?? '').toLowerCase();

  for (const [term, replacement] of PROTECTED_TERMS) {
    // A plain split/join rather than a regular expression, because the
    // terms contain characters like + and . that would need escaping and
    // are easy to get wrong.
    result = result.split(term).join(replacement);
  }

  return result;
}

/**
 * Splits normalised text into word tokens.
 *
 * Anything that is not a letter or digit becomes a separator. By this
 * point the terms that needed their punctuation have already been
 * rewritten, so nothing meaningful is lost.
 *
 * @param {string} text - Normalised text.
 * @returns {string[]} Lowercased tokens.
 */
export function tokenise(text) {
  return String(text ?? '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

/**
 * A small suffix-stripping stemmer, written for this project.
 *
 * It reduces related words to a shared form so "testing", "tested" and
 * "tests" all count as the same term. It is not Porter's algorithm: it
 * handles the endings that actually matter in CVs and stops there. Being
 * simple is deliberate, because every rule has to be explainable.
 *
 * Words of four characters or fewer are left alone, since stripping from
 * them does more harm than good ("apis" -> "api" is wanted, but
 * "less" -> "les" is not).
 *
 * @param {string} token - A single lowercased token.
 * @returns {string} The stemmed token.
 */
export function stem(token) {
  let word = token;

  if (word.length <= 4) return word;

  // Plurals and third person.
  if (word.endsWith('ies') && word.length > 5) {
    word = `${word.slice(0, -3)}y`;
  } else if (word.endsWith('sses')) {
    word = word.slice(0, -2);
  } else if (word.endsWith('es') && word.length > 5 && /(ch|sh|ss|x|z)es$/.test(word)) {
    word = word.slice(0, -2);
  } else if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) {
    word = word.slice(0, -1);
  }

  if (word.length <= 4) return word;

  // Verb and adjective endings.
  if (word.endsWith('ing') && word.length > 5) {
    word = word.slice(0, -3);
    word = undoDoubledConsonant(word);
  } else if (word.endsWith('edly')) {
    word = word.slice(0, -4);
  } else if (word.endsWith('ed') && word.length > 4) {
    word = word.slice(0, -2);
    word = undoDoubledConsonant(word);
  }

  if (word.length <= 4) return word;

  // Common noun and adverb endings.
  if (word.endsWith('ement') && word.length > 7) {
    word = word.slice(0, -5);
  } else if (word.endsWith('ment') && word.length > 6) {
    word = word.slice(0, -4);
  } else if (word.endsWith('ness') && word.length > 6) {
    word = word.slice(0, -4);
  } else if (word.endsWith('ly') && word.length > 5) {
    word = word.slice(0, -2);
  }

  return word;
}

/**
 * Turns "plann" back into "plan" and "creat" into "create".
 * @param {string} word - A stem that may have lost too much.
 * @returns {string} The repaired stem.
 */
function undoDoubledConsonant(word) {
  if (word.length > 3 && word.at(-1) === word.at(-2) && !'aeiou'.includes(word.at(-1))) {
    return word.slice(0, -1);
  }

  // "creat" -> "create": a stem ending in a consonant cluster that needs
  // its silent e back. Only applied to a small set, because guessing more
  // widely does more harm than good.
  if (/(?:at|iv|iz|is|us|bl)$/.test(word)) return `${word}e`;

  return word;
}

/**
 * Builds the bigrams worth keeping from a token list.
 *
 * Only pairs in MEANINGFUL_BIGRAMS are kept. Generating every adjacent
 * pair would swamp the vector with noise and make the similarity score
 * meaningless.
 *
 * @param {string[]} tokens - Tokens before stop-word removal.
 * @returns {string[]} Bigrams, joined with an underscore.
 */
export function buildBigrams(tokens) {
  const bigrams = [];

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    if (MEANINGFUL_BIGRAMS.has(pair)) {
      bigrams.push(pair.replace(' ', '_'));
    }
  }

  return bigrams;
}

/**
 * Runs the whole pipeline over a piece of text.
 *
 * @param {string} text - Raw CV or job description text.
 * @param {{keepStopWords?: boolean, stemTokens?: boolean}} [options]
 * @returns {string[]} The processed terms, ready for TF-IDF.
 */
export function processText(text, options = {}) {
  const { keepStopWords = false, stemTokens = true } = options;

  const normalised = normaliseText(text);
  const rawTokens = tokenise(normalised);

  // Bigrams are found before stop words are removed, so that a phrase
  // containing one is not silently broken apart.
  const bigrams = buildBigrams(rawTokens);

  const words = keepStopWords ? rawTokens : rawTokens.filter((token) => !isStopWord(token));
  const stemmed = stemTokens ? words.map(stem) : words;

  return [...stemmed, ...bigrams];
}

/**
 * Collects the text of a CV into one string for analysis.
 *
 * Every section that describes what the person can do is included; titles,
 * dates and contact details are left out because they add no signal and
 * would dilute the term frequencies.
 *
 * @param {object} cv - A CV document.
 * @returns {string} The combined text.
 */
export function cvToText(cv) {
  const parts = [];

  if (cv.personal?.headline) parts.push(cv.personal.headline);
  if (cv.summary) parts.push(cv.summary);

  for (const entry of cv.experience ?? []) {
    parts.push(entry.position, entry.company, entry.description, ...(entry.achievements ?? []));
  }

  for (const entry of cv.education ?? []) {
    parts.push(entry.degree, entry.fieldOfStudy, entry.institution, entry.description);
  }

  for (const skill of cv.skills ?? []) parts.push(skill.name);

  for (const project of cv.projects ?? []) {
    parts.push(project.name, project.role, project.description, ...(project.technologies ?? []));
  }

  for (const cert of cv.certifications ?? []) parts.push(cert.name, cert.issuer);

  return parts.filter(Boolean).join(' \n ');
}
