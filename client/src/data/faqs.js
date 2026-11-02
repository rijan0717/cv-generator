/**
 * The questions on the FAQ page, grouped by topic.
 *
 * Data rather than markup for the same reason the feature pages are: the
 * FAQ page renders it, the header search searches it, and the page's
 * structured data (`FAQPage`, for search engines) is built from it. Three
 * readers, one source.
 *
 * Every answer describes what the application actually does — limits,
 * formats and rules are the ones enforced in the code. If a rule changes
 * there, change the answer here.
 *
 * Each question has an `id`, which is its anchor on the page
 * (`/faq#change-template`), so a search result can link straight to it.
 *
 * @typedef {{id: string, question: string, answer: string}} Faq
 * @typedef {{key: string, title: string, items: Faq[]}} FaqGroup
 */

/** @type {FaqGroup[]} */
export const FAQ_GROUPS = [
  {
    key: 'getting-started',
    title: 'Getting started',
    items: [
      {
        id: 'is-it-free',
        question: 'Is SmartCV free?',
        answer:
          'Yes. Building CVs, every template, the strength score, job matching, the job-tailored rewrite and downloading as PDF, Word or Excel are all free, with no watermark and no limit on how many CVs you keep.',
      },
      {
        id: 'create-account',
        question: 'How do I create an account?',
        answer:
          'Choose "Sign up" and enter your name, email address and a password, or use "Continue with Google". Your password needs at least 8 characters, with at least one letter and one number. After signing up you choose once whether you are a job seeker or an employer.',
      },
      {
        id: 'jobseeker-or-employer',
        question: 'What is the difference between a job seeker and an employer account?',
        answer:
          'A job seeker builds CVs, matches them against jobs and applies. An employer registers a company, posts jobs and reviews applicants. The choice is made once, when you first sign in, because the two accounts see different parts of the site.',
      },
      {
        id: 'google-password',
        question: 'I signed up with Google. Can I also log in with a password?',
        answer: 'Yes. Open your Profile and set a password. After that you can log in either way.',
      },
    ],
  },
  {
    key: 'building',
    title: 'Building your CV',
    items: [
      {
        id: 'sample-content',
        question: 'Why does a new CV already have text in it?',
        answer:
          'A new CV opens filled with the chosen template’s sample content, with your own name and email, so you can see how each section should look. Replace it section by section. A notice lists the sections that still hold sample text, with a button to clear it.',
      },
      {
        id: 'autosave',
        question: 'Do I need to keep pressing Save?',
        answer:
          'No. Your CV saves itself about a second and a half after you stop typing, and the status shows "Saving…" then "Saved". "Save now" is there if you want to be sure.',
      },
      {
        id: 'multiple-cvs',
        question: 'Can I have more than one CV?',
        answer:
          'Yes, as many as you like — for example one per kind of job. From My CVs you can duplicate, rename or delete any of them.',
      },
      {
        id: 'import-cv',
        question: 'Can I upload the CV I already have?',
        answer:
          'Yes. In the editor, choose Import and drop in a PDF, a Word (.docx) or a text file of up to 10 MB. The text is read into the builder’s sections for you to check. An old .doc file needs saving as .docx first.',
      },
      {
        id: 'photo',
        question: 'What photo can I add?',
        answer:
          'A JPG, PNG or WEBP image of up to 2 MB. Only some templates show a photo; the ATS-friendly ones leave it out on purpose.',
      },
      {
        id: 'primary-cv',
        question: 'What is a primary CV?',
        answer:
          'The CV you mark as primary is the one shown to approved employers in the candidate directory, and the one used for match badges on the job board. You can change it at any time from My CVs.',
      },
    ],
  },
  {
    key: 'templates',
    title: 'Templates and downloads',
    items: [
      {
        id: 'change-template',
        question: 'Can I change the template after I have written my CV?',
        answer:
          'Yes. Open the Design tab and choose another template: your content stays exactly as it is and only the layout changes. Colours, fonts, spacing and the order of sections can be changed there too.',
      },
      {
        id: 'ats-friendly',
        question: 'What does "ATS-friendly" mean?',
        answer:
          'Many employers screen CVs with software (an applicant tracking system) before a person reads them. ATS-friendly templates use a single column, plain headings and no graphics or tables, so that software can read every line.',
      },
      {
        id: 'download-formats',
        question: 'Which formats can I download?',
        answer:
          'PDF, Word (.docx) and Excel. The PDF matches the on-screen A4 preview exactly and its text can be selected and copied. File names follow the pattern Name_CVTitle_CV.',
      },
    ],
  },
  {
    key: 'score-and-match',
    title: 'Strength score and job matching',
    items: [
      {
        id: 'strength-score',
        question: 'How is the strength score worked out?',
        answer:
          'Your CV is marked out of 100: 40 points for completeness (personal details, summary, education, experience or projects, skills, contact details) and 60 for content quality (summary length, action verbs, quantified achievements, valid email and phone, consistent dates). The breakdown shows each check and what to fix first.',
      },
      {
        id: 'job-match',
        question: 'How does job matching work?',
        answer:
          'Paste a job advert and choose a CV. The text of both is compared word by word (TF-IDF and cosine similarity), and the skills the advert asks for are checked against your skills section. You get a match score, the keywords you already have and the ones you are missing.',
      },
      {
        id: 'rewrite',
        question: 'Does the job-tailored rewrite change my facts?',
        answer:
          'No. It only rephrases what you wrote, in the words the advert uses, and you approve or reject each change. The result is saved as a new CV, so the one you started from is never touched. It runs on SmartCV’s own rules, not on an outside AI service.',
      },
    ],
  },
  {
    key: 'jobs',
    title: 'Jobs and applications',
    items: [
      {
        id: 'apply',
        question: 'How do I apply for a job?',
        answer:
          'Open a job on the board, choose Apply, pick one of your CVs and add a cover letter if you like. You can follow each application’s status — submitted, reviewed, shortlisted or rejected — under Applications.',
      },
      {
        id: 'edit-after-apply',
        question: 'If I edit my CV after applying, does the employer see the change?',
        answer:
          'No. An application keeps a copy of the CV exactly as it was when you sent it. Edits you make later do not change what the employer received.',
      },
      {
        id: 'open-to-work',
        question: 'Who can see me when I am "open to work"?',
        answer:
          'Approved employers can find you in the candidate directory, with your primary CV. On public pages such as the home page you appear only as a first name and surname initial with your headline, industry and location — never your photo, email or phone.',
      },
    ],
  },
  {
    key: 'employers',
    title: 'For employers',
    items: [
      {
        id: 'post-job',
        question: 'How do I post a job?',
        answer:
          'Create an employer account and register your company with its registration number, contact details and a registration document. Once an administrator approves the company you can post jobs and read applications.',
      },
      {
        id: 'company-approval',
        question: 'Why does my company need approval?',
        answer:
          'So that job seekers only see adverts from real companies, and only verified employers can browse candidates. If a company is rejected, the reason is shown and you can correct the details and submit again.',
      },
    ],
  },
  {
    key: 'account',
    title: 'Account and privacy',
    items: [
      {
        id: 'logged-out',
        question: 'Why was I logged out?',
        answer:
          'A session lasts up to 7 days. After that, or if your account is blocked, you are logged out the next time the page talks to the server and asked to log in again.',
      },
      {
        id: 'blocked',
        question: 'My account says it is blocked. What can I do?',
        answer:
          'An administrator has suspended the account, so it cannot log in. Contact the site administrator to ask for it to be reviewed.',
      },
      {
        id: 'data-safety',
        question: 'Who can see my CVs?',
        answer:
          'Only you, unless you apply for a job (that employer sees the copy you sent) or switch on "open to work" (approved employers see your primary CV). Passwords are stored hashed and are never shown to anyone, including administrators.',
      },
    ],
  },
];

/** Every question in one flat list, for search and structured data. */
export const ALL_FAQS = FAQ_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title })),
);
