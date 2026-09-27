/**
 * Known skills, used by the job matcher to work out skill coverage.
 *
 * Cosine similarity alone treats every word the same, so a CV can score
 * reasonably while missing the specific tools a job asks for. This
 * dictionary is what lets the matcher say "the advert wants Docker and
 * Kubernetes and your CV mentions neither", which is far more useful
 * feedback than a single number.
 *
 * Each entry has a canonical name and its aliases. Aliases matter more than
 * they look: an advert saying "JS" and a CV saying "JavaScript" are talking
 * about the same thing, and without aliases that counts as a miss.
 *
 * The list covers the fields this project is likely to see. It is not
 * exhaustive and is not meant to be — an unknown skill simply does not
 * contribute to coverage, rather than breaking anything.
 */

/**
 * @typedef {object} SkillEntry
 * @property {string} name - Canonical display name.
 * @property {string[]} aliases - Other ways it is written, lowercased.
 * @property {string} category - Used for grouping in reports.
 */

/** @type {SkillEntry[]} */
export const SKILLS = [
  // --- Programming languages ---
  { name: 'JavaScript', aliases: ['javascript', 'js', 'ecmascript'], category: 'Language' },
  { name: 'TypeScript', aliases: ['typescript', 'ts'], category: 'Language' },
  { name: 'Python', aliases: ['python', 'py'], category: 'Language' },
  { name: 'Java', aliases: ['java'], category: 'Language' },
  { name: 'C#', aliases: ['csharp', 'c#', 'c sharp'], category: 'Language' },
  { name: 'C++', aliases: ['cplusplus', 'c++', 'cpp'], category: 'Language' },
  { name: 'C', aliases: ['c language'], category: 'Language' },
  { name: 'PHP', aliases: ['php'], category: 'Language' },
  { name: 'Ruby', aliases: ['ruby'], category: 'Language' },
  { name: 'Go', aliases: ['golang'], category: 'Language' },
  { name: 'Rust', aliases: ['rust'], category: 'Language' },
  { name: 'Kotlin', aliases: ['kotlin'], category: 'Language' },
  { name: 'Swift', aliases: ['swift'], category: 'Language' },
  { name: 'Dart', aliases: ['dart'], category: 'Language' },
  { name: 'SQL', aliases: ['sql'], category: 'Language' },
  { name: 'HTML', aliases: ['html', 'html5'], category: 'Language' },
  { name: 'CSS', aliases: ['css', 'css3'], category: 'Language' },

  // --- Frontend ---
  { name: 'React', aliases: ['react', 'reactjs', 'react.js'], category: 'Frontend' },
  { name: 'Angular', aliases: ['angular', 'angularjs'], category: 'Frontend' },
  { name: 'Vue.js', aliases: ['vue', 'vuejs', 'vue.js'], category: 'Frontend' },
  { name: 'Next.js', aliases: ['next', 'nextjs', 'next.js'], category: 'Frontend' },
  { name: 'Svelte', aliases: ['svelte', 'sveltekit'], category: 'Frontend' },
  { name: 'jQuery', aliases: ['jquery'], category: 'Frontend' },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss'], category: 'Frontend' },
  { name: 'Bootstrap', aliases: ['bootstrap'], category: 'Frontend' },
  { name: 'Sass', aliases: ['sass', 'scss'], category: 'Frontend' },
  { name: 'Redux', aliases: ['redux'], category: 'Frontend' },

  // --- Backend ---
  { name: 'Node.js', aliases: ['node', 'nodejs', 'node.js'], category: 'Backend' },
  { name: 'Express', aliases: ['express', 'expressjs', 'express.js'], category: 'Backend' },
  { name: 'Django', aliases: ['django'], category: 'Backend' },
  { name: 'Flask', aliases: ['flask'], category: 'Backend' },
  { name: 'Spring Boot', aliases: ['spring', 'springboot', 'spring boot'], category: 'Backend' },
  { name: 'Laravel', aliases: ['laravel'], category: 'Backend' },
  { name: '.NET', aliases: ['dotnet', '.net', 'aspnet', 'asp.net'], category: 'Backend' },
  { name: 'GraphQL', aliases: ['graphql'], category: 'Backend' },
  { name: 'REST API', aliases: ['rest', 'restful', 'rest api', 'api'], category: 'Backend' },
  { name: 'Microservices', aliases: ['microservices', 'microservice'], category: 'Backend' },

  // --- Databases ---
  { name: 'MongoDB', aliases: ['mongodb', 'mongo', 'mongoose'], category: 'Database' },
  { name: 'MySQL', aliases: ['mysql'], category: 'Database' },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres'], category: 'Database' },
  { name: 'SQLite', aliases: ['sqlite'], category: 'Database' },
  { name: 'Redis', aliases: ['redis'], category: 'Database' },
  { name: 'Firebase', aliases: ['firebase', 'firestore'], category: 'Database' },
  { name: 'Oracle', aliases: ['oracle'], category: 'Database' },
  { name: 'SQL Server', aliases: ['sql server', 'mssql'], category: 'Database' },

  // --- DevOps and cloud ---
  { name: 'Git', aliases: ['git'], category: 'DevOps' },
  { name: 'GitHub', aliases: ['github'], category: 'DevOps' },
  { name: 'GitLab', aliases: ['gitlab'], category: 'DevOps' },
  { name: 'Docker', aliases: ['docker'], category: 'DevOps' },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'], category: 'DevOps' },
  { name: 'AWS', aliases: ['aws', 'amazon web services'], category: 'Cloud' },
  { name: 'Azure', aliases: ['azure'], category: 'Cloud' },
  { name: 'Google Cloud', aliases: ['gcp', 'google cloud'], category: 'Cloud' },
  { name: 'CI/CD', aliases: ['cicd', 'ci/cd', 'continuous integration'], category: 'DevOps' },
  { name: 'Jenkins', aliases: ['jenkins'], category: 'DevOps' },
  { name: 'Linux', aliases: ['linux', 'unix', 'ubuntu'], category: 'DevOps' },
  { name: 'Nginx', aliases: ['nginx'], category: 'DevOps' },

  // --- Testing and QA ---
  { name: 'Manual Testing', aliases: ['manual testing'], category: 'QA' },
  { name: 'Automation Testing', aliases: ['automation testing', 'test automation'], category: 'QA' },
  { name: 'Selenium', aliases: ['selenium'], category: 'QA' },
  { name: 'Playwright', aliases: ['playwright'], category: 'QA' },
  { name: 'Cypress', aliases: ['cypress'], category: 'QA' },
  { name: 'Jest', aliases: ['jest'], category: 'QA' },
  { name: 'Vitest', aliases: ['vitest'], category: 'QA' },
  { name: 'Postman', aliases: ['postman'], category: 'QA' },
  { name: 'JMeter', aliases: ['jmeter'], category: 'QA' },
  { name: 'Regression Testing', aliases: ['regression testing', 'regression'], category: 'QA' },
  { name: 'Functional Testing', aliases: ['functional testing'], category: 'QA' },
  { name: 'API Testing', aliases: ['api testing'], category: 'QA' },
  { name: 'UAT', aliases: ['uat', 'user acceptance testing'], category: 'QA' },
  { name: 'Test Cases', aliases: ['test cases', 'test case'], category: 'QA' },
  { name: 'Bug Tracking', aliases: ['bug tracking', 'defect tracking'], category: 'QA' },

  // --- Mobile ---
  { name: 'React Native', aliases: ['react native'], category: 'Mobile' },
  { name: 'Flutter', aliases: ['flutter'], category: 'Mobile' },
  { name: 'Android', aliases: ['android'], category: 'Mobile' },
  { name: 'iOS', aliases: ['ios'], category: 'Mobile' },

  // --- Data ---
  { name: 'Machine Learning', aliases: ['machine learning', 'ml'], category: 'Data' },
  { name: 'Data Analysis', aliases: ['data analysis', 'data analytics'], category: 'Data' },
  { name: 'Power BI', aliases: ['power bi', 'powerbi'], category: 'Data' },
  { name: 'Tableau', aliases: ['tableau'], category: 'Data' },
  { name: 'Excel', aliases: ['excel', 'spreadsheets'], category: 'Data' },
  { name: 'Pandas', aliases: ['pandas'], category: 'Data' },
  { name: 'NumPy', aliases: ['numpy'], category: 'Data' },

  // --- Tools and ways of working ---
  { name: 'Agile', aliases: ['agile'], category: 'Process' },
  { name: 'Scrum', aliases: ['scrum'], category: 'Process' },
  { name: 'Kanban', aliases: ['kanban'], category: 'Process' },
  { name: 'Jira', aliases: ['jira'], category: 'Tool' },
  { name: 'Azure DevOps', aliases: ['azure devops', 'azure boards'], category: 'Tool' },
  { name: 'Figma', aliases: ['figma'], category: 'Design' },
  { name: 'Adobe XD', aliases: ['adobe xd'], category: 'Design' },
  { name: 'Photoshop', aliases: ['photoshop'], category: 'Design' },
  { name: 'UI/UX', aliases: ['ui/ux', 'uiux', 'user experience'], category: 'Design' },
  { name: 'WordPress', aliases: ['wordpress'], category: 'CMS' },
  { name: 'Shopify', aliases: ['shopify'], category: 'CMS' },
  { name: 'SEO', aliases: ['seo'], category: 'Marketing' },

  // --- Business ---
  { name: 'Accounting', aliases: ['accounting', 'accountancy'], category: 'Business' },
  { name: 'Bookkeeping', aliases: ['bookkeeping'], category: 'Business' },
  { name: 'Payroll', aliases: ['payroll'], category: 'Business' },
  { name: 'Customer Service', aliases: ['customer service', 'customer support'], category: 'Business' },
  { name: 'Project Management', aliases: ['project management'], category: 'Business' },
  { name: 'Sales', aliases: ['sales'], category: 'Business' },
  { name: 'Marketing', aliases: ['marketing'], category: 'Business' },
];

/**
 * Lookup from every alias to its canonical skill name, built once at import.
 * @type {Map<string, string>}
 */
const ALIAS_TO_NAME = new Map();

for (const skill of SKILLS) {
  ALIAS_TO_NAME.set(skill.name.toLowerCase(), skill.name);
  for (const alias of skill.aliases) {
    ALIAS_TO_NAME.set(alias, skill.name);
  }
}

/** Aliases made of more than one word, longest first so the greediest wins. */
const MULTI_WORD_ALIASES = [...ALIAS_TO_NAME.keys()]
  .filter((alias) => alias.includes(' '))
  .sort((a, b) => b.length - a.length);

/**
 * Resolves one term to a canonical skill name.
 * @param {string} term - A word or phrase, any case.
 * @returns {string|null} The canonical name, or null when unknown.
 */
export function canonicalSkill(term) {
  if (!term) return null;
  return ALIAS_TO_NAME.get(term.trim().toLowerCase()) ?? null;
}

/**
 * Finds every known skill mentioned in a block of text.
 *
 * Multi-word skills are searched for first, in the raw text, because
 * "machine learning" is lost once the text has been split into single
 * words. Single-word skills are then matched against the token list.
 *
 * @param {string} text - The text to scan.
 * @param {string[]} tokens - The same text already tokenised.
 * @returns {Set<string>} Canonical names of the skills found.
 */
export function findSkills(text, tokens = []) {
  const found = new Set();
  const haystack = ` ${String(text ?? '').toLowerCase()} `;

  for (const alias of MULTI_WORD_ALIASES) {
    // Padded so "api" does not match inside "rapid".
    if (haystack.includes(` ${alias} `) || haystack.includes(`${alias},`)) {
      found.add(ALIAS_TO_NAME.get(alias));
    }
  }

  for (const token of tokens) {
    const name = ALIAS_TO_NAME.get(token);
    if (name) found.add(name);
  }

  return found;
}

export default SKILLS;
