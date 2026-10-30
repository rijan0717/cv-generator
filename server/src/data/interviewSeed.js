/**
 * Demo content for interview preparation.
 *
 * This exists so the feature can be shown working without an hour of
 * typing first. **It is not the real question bank.** The admin writes
 * that through the admin panel, which is where the content is owned —
 * these are written here only so a fresh database has something in it.
 *
 * Every question follows the same shape the model enforces: exactly four
 * options, one of them correct, and an explanation. The explanation is
 * the point. A user who learns the answer without the reason has learnt
 * nothing they can use in an interview, where the follow-up is always
 * "why?".
 *
 * `questionCount` is set to 5 rather than the default 10 so that each
 * level here has a pool larger than one paper. That is deliberate: it
 * leaves the exam's selection algorithm something to actually choose
 * between, rather than handing back the whole pool every time.
 */

/**
 * @typedef {object} SeedQuestion
 * @property {string} text
 * @property {string[]} options - Exactly four.
 * @property {number} correctIndex
 * @property {string} explanation
 * @property {string} topic
 */

export const INTERVIEW_SEED = [
  {
    title: 'Frontend Developer',
    description:
      'Builds the parts of a web application people see and use, usually in a JavaScript framework.',
    industry: 'Information Technology',
    tags: ['react', 'javascript', 'css', 'html', 'frontend', 'web'],
    levels: ['junior', 'mid', 'senior'],
    examSettings: { questionCount: 5, passMark: 60, timeLimitMinutes: 0 },
    questions: {
      junior: [
        {
          text: 'What is the purpose of the `key` prop when rendering a list in React?',
          options: [
            'It sets the sort order of the list',
            'It helps React tell which items changed between renders',
            'It makes each item focusable by keyboard',
            'It is required for the list to be styled',
          ],
          correctIndex: 1,
          explanation:
            'React matches elements between renders by key. Without a stable one it falls back to position, so inserting at the top makes it treat every item as changed — which loses input state and wastes work. Avoid using the array index as the key for a list that can reorder.',
          topic: 'react',
        },
        {
          text: 'Which CSS unit is relative to the font size of the element itself?',
          options: ['px', 'em', 'vh', '%'],
          correctIndex: 1,
          explanation:
            '`em` is relative to the element’s own font size (and so compounds when nested), `rem` is relative to the root. `px` is absolute, `vh` is a share of the viewport height, and `%` depends on which property it is used with.',
          topic: 'css',
        },
        {
          text: 'What does the `alt` attribute on an `<img>` tag do?',
          options: [
            'Shows a tooltip when hovering the image',
            'Describes the image for screen readers and when it fails to load',
            'Sets a fallback image source',
            'Improves the image loading speed',
          ],
          correctIndex: 1,
          explanation:
            'It is the text alternative, read aloud by screen readers and shown when the image cannot load. A decorative image should have `alt=""` rather than no `alt` at all, so assistive software knows to skip it deliberately.',
          topic: 'accessibility',
        },
        {
          text: 'What is the difference between `let` and `const` in JavaScript?',
          options: [
            '`const` values can never change in any way',
            '`const` cannot be reassigned, but an object it holds can still be mutated',
            '`let` is function scoped and `const` is block scoped',
            'There is no practical difference',
          ],
          correctIndex: 1,
          explanation:
            '`const` prevents reassignment of the binding, not mutation of the value. `const list = []` still allows `list.push(1)`. Both are block scoped; it is `var` that is function scoped.',
          topic: 'javascript',
        },
        {
          text: 'In the browser, what does `document.querySelector(".item")` return?',
          options: [
            'Every element with the class "item"',
            'The first element with the class "item", or null',
            'An array of matching elements',
            'The element with the id "item"',
          ],
          correctIndex: 1,
          explanation:
            'It returns the first match or `null`. `querySelectorAll` returns all of them, as a NodeList rather than an array — which is why `Array.from()` is often needed before using `map`.',
          topic: 'javascript',
        },
        {
          text: 'What is semantic HTML?',
          options: [
            'HTML written with consistent indentation',
            'Using tags that describe the meaning of their content, such as `<nav>` and `<article>`',
            'HTML that validates with no warnings',
            'Writing all tags in lower case',
          ],
          correctIndex: 1,
          explanation:
            'Semantic tags describe what the content *is*, not how it looks. That gives screen readers real landmarks to navigate by and search engines structure to read, neither of which a page built from `<div>` can offer.',
          topic: 'html',
        },
      ],
      mid: [
        {
          text: 'What does the dependency array of React’s `useEffect` control?',
          options: [
            'Which variables the effect is allowed to read',
            'When the effect re-runs after a render',
            'The order effects run in',
            'Whether the effect runs on the server',
          ],
          correctIndex: 1,
          explanation:
            'React re-runs the effect when a value in the array has changed since the last render. An empty array means "only on mount"; omitting the array entirely means "after every render", which is the usual cause of an accidental infinite loop.',
          topic: 'react',
        },
        {
          text: 'Why can changing an element’s `width` be more expensive than changing its `transform`?',
          options: [
            '`width` uses more memory',
            '`width` forces layout to be recalculated, while `transform` can be composited',
            '`transform` is cached by the browser',
            'They cost the same; the difference is a myth',
          ],
          correctIndex: 1,
          explanation:
            'Geometry properties trigger layout, which may then force paint and composite — and layout of one element can affect its siblings. `transform` and `opacity` can usually be handled by the compositor alone, which is why animations prefer them.',
          topic: 'performance',
        },
        {
          text: 'What problem does a debounce solve on a search input?',
          options: [
            'It stops the user typing too fast',
            'It waits for a pause in typing before firing, so one request is sent instead of many',
            'It caches the results of each request',
            'It cancels requests that return out of order',
          ],
          correctIndex: 1,
          explanation:
            'Debouncing delays the call until the input has been quiet for a set time, collapsing a burst of keystrokes into one request. It does not fix out-of-order responses — that needs a cancellation or a check that the response still matches the current query.',
          topic: 'javascript',
        },
        {
          text: 'What is the difference between `localStorage` and a cookie for storing a session token?',
          options: [
            'They are equally safe',
            'A cookie can be marked HttpOnly so JavaScript cannot read it, which `localStorage` cannot',
            '`localStorage` is encrypted by the browser',
            'Cookies cannot be read by the server',
          ],
          correctIndex: 1,
          explanation:
            'Anything in `localStorage` is readable by any script on the page, so one cross-site scripting flaw exposes the token. An HttpOnly cookie is invisible to JavaScript, which is why session tokens usually live there — with SameSite set to limit cross-site requests.',
          topic: 'security',
        },
        {
          text: 'Why should an interactive control be a `<button>` rather than a `<div>` with a click handler?',
          options: [
            'It is shorter to write',
            'A button is focusable, works with Enter and Space, and is announced as a button',
            'A div cannot receive click events',
            'Buttons are faster to render',
          ],
          correctIndex: 1,
          explanation:
            'A `<div>` gets none of that for free: it is not in the tab order, does not respond to the keyboard, and is announced as a group rather than a control. Reproducing all of it by hand with `tabindex`, `role` and key handlers is work the native element has already done.',
          topic: 'accessibility',
        },
        {
          text: 'What does a CORS error actually mean?',
          options: [
            'The request never left the browser',
            'The server replied, but without headers permitting this origin to read the response',
            'The server is offline',
            'The URL was typed incorrectly',
          ],
          correctIndex: 1,
          explanation:
            'The request usually reaches the server and is answered; the browser then refuses to hand the response to your script because the `Access-Control-Allow-Origin` header does not permit the calling origin. It is a browser protection, so the fix belongs on the server.',
          topic: 'networking',
        },
      ],
      senior: [
        {
          text: 'What is the main trade-off of server-side rendering compared with a client-rendered app?',
          options: [
            'It always produces faster applications',
            'Faster first paint and better indexing, at the cost of server load and more complexity',
            'It removes the need for JavaScript entirely',
            'It makes the bundle smaller',
          ],
          correctIndex: 1,
          explanation:
            'Rendering on the server gets meaningful HTML to the user sooner and gives crawlers something to read, but every request now costs server work, and hydration brings its own class of bugs where server and client markup disagree.',
          topic: 'architecture',
        },
        {
          text: 'How would you approach a page that has become slow after a year of feature work?',
          options: [
            'Rewrite it in a faster framework',
            'Measure first — profile to find where the time actually goes, then fix that',
            'Add more memoisation throughout',
            'Move all the logic to the server',
          ],
          correctIndex: 1,
          explanation:
            'Optimising before measuring usually tunes something that was never the problem. A profile tells you whether the cost is network, render, layout or script, and each has a different fix. Memoisation added blindly can itself make things slower.',
          topic: 'performance',
        },
        {
          text: 'Why is a frozen snapshot sometimes better than a reference to live data?',
          options: [
            'Snapshots use less storage',
            'It records what was true at the time, so later edits cannot rewrite history',
            'References are slower to read',
            'Snapshots are easier to index',
          ],
          correctIndex: 1,
          explanation:
            'A submitted application or a sat exam must show what was actually sent or asked. If it pointed at live records, editing the source afterwards would silently change the past — which makes an audit trail worthless.',
          topic: 'architecture',
        },
        {
          text: 'What is the risk of rendering user-supplied HTML with `dangerouslySetInnerHTML`?',
          options: [
            'It is slower than normal rendering',
            'Script and event handlers in that HTML run with your page’s privileges',
            'It breaks server-side rendering',
            'React will warn and refuse to render it',
          ],
          correctIndex: 1,
          explanation:
            'It bypasses React’s escaping, so injected markup becomes real DOM with full access to cookies and the session. User HTML must be sanitised on the way in or out, with a vetted library rather than a hand-written regular expression.',
          topic: 'security',
        },
        {
          text: 'A junior opens a pull request that works but duplicates an existing helper. What is the best response?',
          options: [
            'Approve it — it works',
            'Point at the existing helper, explain why one copy matters, and let them make the change',
            'Rewrite it yourself before merging',
            'Reject it without comment',
          ],
          correctIndex: 1,
          explanation:
            'Review is partly teaching. Naming the helper and the reason leaves them able to spot it next time; silently rewriting it teaches nothing and quietly removes their authorship. Interviewers ask this to see whether you can raise a standard without discouraging people.',
          topic: 'collaboration',
        },
      ],
    },
  },

  {
    title: 'Manual QA Tester',
    description:
      'Checks that software behaves as intended before release, by designing and running test cases by hand.',
    industry: 'Information Technology',
    tags: ['qa', 'testing', 'test cases', 'bug reports', 'quality assurance'],
    levels: ['junior', 'mid'],
    examSettings: { questionCount: 5, passMark: 60, timeLimitMinutes: 0 },
    questions: {
      junior: [
        {
          text: 'What belongs in a good bug report?',
          options: [
            'Only a screenshot of the problem',
            'Steps to reproduce, what you expected, what happened, and the environment',
            'The developer’s name and a priority',
            'A suggested code fix',
          ],
          correctIndex: 1,
          explanation:
            'A report that cannot be reproduced cannot be fixed. Steps, expected versus actual, and the environment are the minimum; a screenshot helps but does not replace them.',
          topic: 'bug-reporting',
        },
        {
          text: 'What is the difference between verification and validation?',
          options: [
            'They mean the same thing',
            'Verification asks "did we build it right?", validation asks "did we build the right thing?"',
            'Verification is manual, validation is automated',
            'Verification happens after release',
          ],
          correctIndex: 1,
          explanation:
            'Verification checks the product against its specification; validation checks the specification against what the user actually needs. Software can pass verification completely and still be the wrong product.',
          topic: 'fundamentals',
        },
        {
          text: 'What is regression testing?',
          options: [
            'Testing only the newest feature',
            'Re-testing existing functionality to check a change has not broken it',
            'Testing that the system recovers after a crash',
            'Testing with the largest possible data set',
          ],
          correctIndex: 1,
          explanation:
            'A change can break something that previously worked and is nowhere near the code that changed. Regression testing re-checks the existing behaviour, which is why it is the suite most worth automating.',
          topic: 'fundamentals',
        },
        {
          text: 'What is boundary value analysis?',
          options: [
            'Testing with the largest input the system allows',
            'Testing at the edges of a valid range, where off-by-one errors live',
            'Testing only invalid inputs',
            'Dividing inputs into groups and testing one from each',
          ],
          correctIndex: 1,
          explanation:
            'For a field accepting 1 to 100, the interesting values are 0, 1, 100 and 101. Most numeric faults are off-by-one, so the boundaries find more than values from the middle. Dividing inputs into groups is equivalence partitioning, which pairs well with it.',
          topic: 'test-design',
        },
        {
          text: 'What is the difference between severity and priority on a defect?',
          options: [
            'They are the same thing measured differently',
            'Severity is the impact on the system, priority is how soon it should be fixed',
            'Severity is set by the developer, priority by the tester',
            'Priority always follows severity',
          ],
          correctIndex: 1,
          explanation:
            'They can disagree, which is the point. A typo on the home page is low severity but high priority before a launch; a crash in a feature nobody uses yet is high severity but low priority.',
          topic: 'bug-reporting',
        },
        {
          text: 'What is smoke testing?',
          options: [
            'Testing under heavy load',
            'A quick check that the build’s main functions work before deeper testing starts',
            'Testing only the user interface',
            'The final round of testing before release',
          ],
          correctIndex: 1,
          explanation:
            'It answers "is this build worth testing at all?". If login is broken there is no sense running a full suite, so a short pass over the critical paths comes first.',
          topic: 'fundamentals',
        },
      ],
      mid: [
        {
          text: 'When is automating a test case a poor investment?',
          options: [
            'When the test is run often',
            'When the feature is still changing shape, so the test needs rewriting each sprint',
            'When the test is part of a regression suite',
            'When the test is slow to run by hand',
          ],
          correctIndex: 1,
          explanation:
            'Automation pays back through repetition. Against an unstable feature the maintenance cost outruns the saving, and a test rewritten every sprint also stops being trustworthy.',
          topic: 'automation',
        },
        {
          text: 'A test fails intermittently on the same build. What is the most likely cause?',
          options: [
            'A genuine bug that appears at random',
            'A timing or shared-state problem in the test, such as waiting a fixed period',
            'A fault in the test runner',
            'Insufficient memory on the machine',
          ],
          correctIndex: 1,
          explanation:
            'Flakiness usually comes from the test, not the product: a fixed sleep instead of waiting for a condition, or data left behind by an earlier test. A flaky test is worse than no test, because it trains people to ignore red.',
          topic: 'automation',
        },
        {
          text: 'What does a traceability matrix give you?',
          options: [
            'A record of who ran each test',
            'A mapping from requirements to the test cases covering them, exposing gaps',
            'The order tests should run in',
            'A history of every defect found',
          ],
          correctIndex: 1,
          explanation:
            'It answers "is every requirement tested, and what does this test exist for?". The useful output is the requirement with no test against it.',
          topic: 'test-design',
        },
        {
          text: 'How should a tester handle a defect a developer insists is "working as designed"?',
          options: [
            'Close it and move on',
            'Take it to the specification and the user’s expectation, and escalate if they genuinely differ',
            'Raise it again with a higher severity',
            'Escalate to a manager immediately',
          ],
          correctIndex: 1,
          explanation:
            'The disagreement is usually about what the design actually says. Going back to the requirement settles it on evidence rather than opinion, and if the specification is wrong that is the real finding.',
          topic: 'collaboration',
        },
        {
          text: 'What is exploratory testing?',
          options: [
            'Testing without any plan at all',
            'Simultaneously designing and running tests, using what you learn to steer the next step',
            'Testing performed only by developers',
            'Testing done before requirements are written',
          ],
          correctIndex: 1,
          explanation:
            'It is structured but not scripted: the tester works to a charter and uses each result to decide what to try next. It finds the faults scripted cases miss, precisely because the script cannot anticipate them.',
          topic: 'test-design',
        },
      ],
    },
  },

  {
    title: 'Accounts Assistant',
    description:
      'Supports a finance team with bookkeeping, reconciliations and the preparation of routine reports.',
    industry: 'Accounting and Finance',
    tags: ['bookkeeping', 'accounts', 'ledger', 'reconciliation', 'finance'],
    levels: ['junior'],
    examSettings: { questionCount: 5, passMark: 60, timeLimitMinutes: 0 },
    questions: {
      junior: [
        {
          text: 'In double-entry bookkeeping, what must be true of every transaction?',
          options: [
            'It affects exactly one account',
            'Total debits equal total credits',
            'It must increase the bank balance',
            'It must be approved before posting',
          ],
          correctIndex: 1,
          explanation:
            'Every entry has two sides of equal value, which is what keeps the accounting equation in balance. A trial balance that does not agree means an entry is missing or one-sided.',
          topic: 'double-entry',
        },
        {
          text: 'What is the purpose of a bank reconciliation?',
          options: [
            'To calculate the interest earned',
            'To agree the cash book to the bank statement and explain any difference',
            'To forecast next month’s cash flow',
            'To check that invoices have been paid',
          ],
          correctIndex: 1,
          explanation:
            'It confirms the ledger matches reality. Differences are usually timing — an unpresented cheque or a payment not yet cleared — but a difference that cannot be explained is where errors and fraud show up.',
          topic: 'reconciliation',
        },
        {
          text: 'Which of these is an asset?',
          options: ['Trade creditors', 'Trade debtors', 'Share capital', 'A bank loan'],
          correctIndex: 1,
          explanation:
            'Trade debtors are amounts owed *to* the business, so they are an asset. Creditors and a loan are amounts owed *by* it, and share capital is part of equity.',
          topic: 'fundamentals',
        },
        {
          text: 'What does an aged debtors report show?',
          options: [
            'How long each employee has worked at the company',
            'Outstanding customer balances grouped by how overdue they are',
            'The depreciation of fixed assets over time',
            'Supplier payments due in the next month',
          ],
          correctIndex: 1,
          explanation:
            'It groups what customers owe into bands such as current, 30, 60 and 90 days. The oldest column is where collection effort and any doubtful-debt provision should be aimed.',
          topic: 'reporting',
        },
        {
          text: 'What is the difference between a purchase order and an invoice?',
          options: [
            'They are the same document at different stages',
            'A purchase order requests goods; an invoice requests payment for goods supplied',
            'A purchase order is issued by the supplier',
            'An invoice is only used for services',
          ],
          correctIndex: 1,
          explanation:
            'The buyer issues the purchase order; the supplier issues the invoice afterwards. Matching the two, with the delivery note, is the three-way check that stops a business paying for something it never ordered or received.',
          topic: 'purchase-ledger',
        },
        {
          text: 'Why are accruals recorded at a period end?',
          options: [
            'To reduce the tax due for the period',
            'So costs are recognised in the period they relate to, even if unbilled',
            'To move costs into the next period',
            'Because the bank requires them',
          ],
          correctIndex: 1,
          explanation:
            'The accruals concept matches a cost to the period it belongs to rather than the month the invoice happens to arrive. Without it, profit swings on the timing of supplier paperwork.',
          topic: 'fundamentals',
        },
      ],
    },
  },
];

export default INTERVIEW_SEED;
