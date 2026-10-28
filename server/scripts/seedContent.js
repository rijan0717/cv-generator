/**
 * The blog posts and pages the site ships with.
 *
 * Written rather than generated: the blog is a public page an examiner
 * will read, and eight paragraphs of "Lorem ipsum" would say the
 * feature works but the project does not. Each one is advice that
 * matches what the application actually does — the strength score, the
 * match analyser, the tailored rewrite — so the blog and the product
 * agree with each other.
 *
 * Safe to run twice: posts are matched on their slug and updated
 * rather than inserted again.
 *
 * Usage: npm run seed:content
 */
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Content, slugify } from '../src/models/Content.js';
import { User } from '../src/models/User.js';
import { sanitiseHtml } from '../src/services/htmlSanitiser.js';

/** How many days before today each post was published, newest first. */
const POSTS = [
  {
    daysAgo: 2,
    title: 'What a CV screener actually reads',
    excerpt:
      'Most large employers run your CV through software before a person sees it. Here is what that software looks at, and what it quietly ignores.',
    body: `
<p>Before anyone at a company reads your CV, there is a good chance a program has already read it. Applicant tracking systems are not clever and they are not fair, but they are predictable — which means you can write for them without writing badly for people.</p>

<h2>It reads words, not layout</h2>
<p>A screener strips your document down to text. The two-column design, the icons beside your phone number, the skills rated out of five in little bars — none of that survives. What survives is the words, in the order they appear.</p>
<p>This is why our ATS-Friendly template exists. It is deliberately plain: one column, no graphics, ordinary headings. If you are applying somewhere large, use it.</p>

<h2>It is looking for the advert's own words</h2>
<p>The system compares your CV against the advert that produced it. If the advert says "stakeholder management" and your CV says "worked with clients", a human would see the match and the software will not.</p>
<p>This is not an instruction to lie. It is an instruction to use the employer's vocabulary for the things you have genuinely done. Our match analyser exists to show you exactly which of the advert's words are missing from your CV, so you can decide which of them are true of you.</p>

<h2>What it ignores</h2>
<ul>
<li>Anything in a header or footer. Some parsers never see those at all — never put your phone number there.</li>
<li>Text inside an image. A logo of your university is not a qualification as far as the software is concerned.</li>
<li>Tables, in many systems. A skills table can come out as one long unreadable line.</li>
<li>Clever fonts. If the characters do not map to ordinary letters, the text is lost.</li>
</ul>

<h2>The short version</h2>
<p>Write in plain structure, use the advert's language where it is honest to do so, and save as PDF unless you are told otherwise. Everything else is decoration, and decoration is what gets thrown away first.</p>
`,
  },
  {
    daysAgo: 6,
    title: 'Why your CV scores low, and what to fix first',
    excerpt:
      'The strength score is not a grade. It is a checklist of the things employers look for, and most CVs lose points in the same four places.',
    body: `
<p>Every CV in this system gets a score out of 100. It is not a judgement of your career — it is a count of the things a reader expects to find and a check on how clearly you have written them. Here is where the points usually go.</p>

<h2>1. No numbers anywhere</h2>
<p>"Responsible for improving test coverage" tells a reader nothing. "Raised test coverage from 20% to 75% over six months" tells them the size of the problem, what you did, and how long it took.</p>
<p>You do not need impressive numbers. You need specific ones. Team of three. Forty clients. Two weeks instead of five.</p>

<h2>2. Duties instead of achievements</h2>
<p>A job description lists duties. A CV should list what came of them. The test: could the person who had the job before you have written the same sentence? If yes, it is a duty, and it is costing you.</p>

<h2>3. A summary that could belong to anyone</h2>
<p>"Hard-working team player seeking a challenging role" is on half the CVs ever written. A summary should say what you do, how long you have done it, and what you are looking for — in your own words, in about forty of them.</p>

<h2>4. Missing the basics</h2>
<p>A surprising number of CVs lose easy points: no phone number, no city, dates that do not line up, a skills section with three entries. These take minutes to fix and they are the first thing the score checks.</p>

<h2>Fix them in order</h2>
<p>Open your CV, read the suggestions under the score, and start at the top. The score recalculates on every save, so you can watch each change land.</p>
`,
  },
  {
    daysAgo: 11,
    title: 'Tailoring a CV without rewriting your life',
    excerpt:
      'One CV for every job is the most common mistake, and sending fifty identical applications is slower than sending ten tailored ones.',
    body: `
<p>The advice to "tailor your CV" is everywhere and almost never explained. It does not mean writing a new CV for every job. It means changing three or four things so the reader finds what they are looking for in the first ten seconds.</p>

<h2>What is worth changing</h2>
<ul>
<li><strong>The summary.</strong> Two sentences, pointed at this role. This is the highest-value edit by a distance.</li>
<li><strong>The order of your skills.</strong> Put the ones the advert names first. Nobody reads to the end of a list of thirty.</li>
<li><strong>The wording of your two most recent roles.</strong> Same facts, the employer's vocabulary.</li>
<li><strong>The order of sections.</strong> A graduate applying for their first job leads with education. Five years later, that is wrong.</li>
</ul>

<h2>What is not worth changing</h2>
<p>Your dates, your employers, your qualifications. They are facts and they do not bend to an advert. If a job needs something you have not done, tailoring will not fix that, and pretending it does is how people end up in interviews they cannot survive.</p>

<h2>Let the tool do the first pass</h2>
<p>Paste the advert into Rewrite with JD and the system produces a tailored copy of your primary CV — reordered, reworded, nothing invented. It shows you every change it made and what it could not do. You then edit it like any other CV. Your original is untouched.</p>
`,
  },
  {
    daysAgo: 17,
    title: 'How long should a CV be?',
    excerpt:
      'Two pages, almost always. The interesting question is not the length — it is what you cut to get there.',
    body: `
<p>Two pages. If you have less than two years of experience, one. If you are in academia or applying abroad, the rules are different and your field will tell you. For everything else: two.</p>

<h2>Why two</h2>
<p>A recruiter reading forty applications gives each one somewhere between six and thirty seconds on the first pass. Three pages does not buy you more attention; it spreads the same attention more thinly over weaker material.</p>

<h2>What to cut, in order</h2>
<ol>
<li>Jobs over ten years old, unless they are the reason you are qualified. One line each, or nothing.</li>
<li>"References available on request." Everybody knows. It is a wasted line.</li>
<li>Your full address. A city is enough, and safer.</li>
<li>Skills nobody is hiring for. Microsoft Word is not a skill in 2026.</li>
<li>Duties that repeat between roles. Say it once, in the role where it mattered most.</li>
</ol>

<h2>What not to cut</h2>
<p>White space. A dense two-page CV is harder to read than a clean one, and the reader's eye needs somewhere to rest. If you are two lines over, cut a line of text before you shrink the margins.</p>

<p>The preview in the builder shows real A4 pages with real page breaks, so you can see exactly where you spill over — and the rewrite tool will tell you when a tailored version has pushed you onto a third page.</p>
`,
  },
  {
    daysAgo: 23,
    title: 'The skills section, done properly',
    excerpt:
      'A list of thirty skills says nothing. A short list of the right ones, backed up by the rest of your CV, says a great deal.',
    body: `
<p>The skills section is the easiest part of a CV to write badly, because it looks like it rewards volume. It does not.</p>

<h2>List what you would be happy to be asked about</h2>
<p>Every skill on your CV is an invitation to a question. If you list Kubernetes because you once read about it, the interview will find out. Be ruthless: would you be comfortable being tested on this?</p>

<h2>Put the named ones first</h2>
<p>If the advert names six technologies and you have four of them, those four go at the top. A reader scanning for a match should find it immediately, not in the second column of a long list.</p>

<h2>Prove them elsewhere</h2>
<p>A skill listed and never mentioned again is weak. A skill that also appears in a bullet point under a real job — "built the reporting API in Node.js" — is evidence. Our match analyser flags skills that appear in your experience but are missing from your skills list, because those are free points.</p>

<h2>Levels</h2>
<p>Beginner, intermediate, advanced, expert. Use them honestly. "Expert" in something you used for one project is the kind of claim that unravels in the first ten minutes of a technical interview.</p>
`,
  },
  {
    daysAgo: 31,
    title: 'Writing a summary that is worth the space',
    excerpt:
      'The professional summary is the most-read and worst-written part of most CVs. Forty words, three jobs to do.',
    body: `
<p>Your summary sits at the top, which means it is the part most likely to be read and the part most likely to decide whether the rest gets read at all. Most summaries waste it.</p>

<h2>The three jobs</h2>
<ol>
<li><strong>Say what you are.</strong> "Final-year BCA student and MERN developer." Not "a motivated individual".</li>
<li><strong>Say how much.</strong> Two years, five years, a particular domain. Give the reader a scale.</li>
<li><strong>Say what you want.</strong> One clause, pointed at the role you are applying for.</li>
</ol>

<h2>An example</h2>
<p><em>Before:</em> "Hard-working and motivated graduate seeking a challenging position in a reputed organisation where I can utilise my skills and grow professionally."</p>
<p><em>After:</em> "Final-year BCA student and MERN developer with two years building and shipping web applications. Comfortable across React, Express and MongoDB, with deployment in Docker. Looking for a full-stack role where I can own features end to end."</p>
<p>The second one is the same length. It just says something.</p>

<h2>Length</h2>
<p>Forty to sixty words. The strength score checks this, because a summary of twelve words is not a summary and one of a hundred and fifty is an essay nobody will finish.</p>
`,
  },
  {
    daysAgo: 40,
    title: 'Applying for jobs you are not quite qualified for',
    excerpt:
      'Job adverts are wish lists, not entry requirements. Here is how to tell the difference between a gap that matters and one that does not.',
    body: `
<p>Almost nobody meets every line of a job advert. Adverts are written by committee and list the ideal candidate, who usually does not exist. The useful skill is telling which missing pieces matter.</p>

<h2>Gaps that usually do not matter</h2>
<ul>
<li>A specific tool, when you know two others like it. Frameworks are learnable; the thinking behind them transfers.</li>
<li>"Five years' experience" when you have three and the work is comparable.</li>
<li>A nice-to-have listed under "desirable". That word is doing real work.</li>
</ul>

<h2>Gaps that do</h2>
<ul>
<li>A legal requirement — a licence, a certification, the right to work.</li>
<li>The core of the job. Applying for a data engineering role having never touched a pipeline is not optimism, it is noise.</li>
<li>Anything listed three times in different words. Repetition in an advert is the committee telling you what it actually cares about.</li>
</ul>

<h2>Use the score as a signal, not a verdict</h2>
<p>Match my CV gives every open job a score against your CV. A moderate score with the right skills missing is worth applying for with a tailored CV. A low score where the gaps are the whole job is a different conversation — and your time is better spent on the next advert.</p>
`,
  },
  {
    daysAgo: 52,
    title: 'After you apply: what employers see',
    excerpt:
      'Your application is a frozen snapshot, not a live link. Knowing that changes when you should edit your CV and when you should not.',
    body: `
<p>When you apply for a job here, the system stores a copy of your CV exactly as it was at that moment. The employer reads that copy. If you edit the original tomorrow, what they see does not change.</p>

<h2>Why it works that way</h2>
<p>Two reasons. An employer should be able to rely on the document they are assessing — a CV that changes under them mid-shortlist is worse than useless. And you should be free to keep improving your CV for the next application without worrying about the ones already sent.</p>

<h2>What this means for you</h2>
<ul>
<li>Check your CV before you apply, not after. Once it is sent, it is sent.</li>
<li>"View CV" on My applications shows you the exact copy that employer received — useful when you have four near-identical tailored versions and cannot remember which went where.</li>
<li>Editing your CV afterwards is free. It affects nothing already submitted.</li>
</ul>

<h2>Your profile is different</h2>
<p>Your candidate profile — your photo, position, industry and whether you are open to work — is live. Approved employers browsing candidates see it as it is now, along with whichever CV you have marked as primary. That one is worth keeping current.</p>
`,
  },
];

/**
 * The pages linked from the header and the footer.
 *
 * Real wording rather than placeholders: these are the pages a visitor
 * checks before trusting a site with their CV, and "Lorem ipsum" under
 * a heading that says Privacy policy is worse than having no page.
 *
 * The two in the header are the two a visitor actually opens. The rest
 * live in the footer, which is where people look for them.
 */
const PAGES = [
  {
    title: 'About us',
    navLabel: 'About',
    showInHeader: true,
    showInFooter: true,
    sortOrder: 1,
    excerpt: 'Who built Smart CV Generator, and what it is for.',
    body: `
<p>Smart CV Generator is a final-year project built by Rijan Pariyar and Shishir Thapa for the BCA programme at Tribhuvan University. It began with a straightforward observation: most people write one CV, send it everywhere, and never find out why they hear nothing back.</p>

<h2>What it does</h2>
<p>It is a CV builder, but the building is the easy half. The useful half is what happens after:</p>
<ul>
<li><strong>A strength score</strong> that checks your CV against the things employers look for — quantified achievements, action verbs, complete contact details, sensible dates — and tells you what is missing.</li>
<li><strong>A match analyser</strong> that compares your CV against a real job advert and reports how well they line up, which of the advert's words you already use, and which you do not.</li>
<li><strong>A tailored rewrite</strong> that produces a version of your CV aimed at one advert, using only facts already on it.</li>
<li><strong>A job board</strong> where employers post and candidates apply with the CV they choose.</li>
</ul>

<h2>How the matching works</h2>
<p>The analysis is our own code, not a third-party service. Job adverts and CVs are reduced to terms, weighted with TF–IDF, and compared by cosine similarity, alongside a direct check of which named skills the advert asks for. We wrote the text processing, the weighting and the scoring ourselves so that every number the system shows you can be explained.</p>

<h2>What it is not</h2>
<p>It does not write your experience for you and it does not invent qualifications. The rewrite tool reorders and rewords what is already on your CV, and it tells you when it could not reach the target honestly. A tool that fills in the gaps with fiction is not helping you — it is setting up an interview you cannot survive.</p>

<h2>Contact</h2>
<p>Questions, bugs and suggestions are all welcome at rijanxshishir@gmail.com.</p>
`,
  },
  {
    title: 'How it works',
    navLabel: 'How it works',
    showInHeader: true,
    showInFooter: false,
    sortOrder: 2,
    excerpt: 'From a blank page to an application, in five steps.',
    body: `
<p>If you are new here, this is the whole thing in order. It takes about twenty minutes to go from nothing to a CV you can send.</p>

<h2>1. Build the CV</h2>
<p>Create one and fill in the sections. Everything saves as you type, so you can stop and come back. Eleven templates are available and you can switch between them at any point without retyping anything — the content and the design are kept separate.</p>

<h2>2. Read the score</h2>
<p>Every save recalculates a strength score out of 100, with a breakdown and a list of suggestions. Work down the list. Most CVs gain twenty points in half an hour, and almost all of it comes from adding numbers and replacing duties with achievements.</p>

<h2>3. Check it against a real advert</h2>
<p>Paste a job description into Match my CV. You get a match score, the skills the advert wants that you already have, the ones you do not, and the words it leans on that your CV never uses. This is the step that tells you whether to apply.</p>

<h2>4. Tailor it</h2>
<p>Rewrite with JD produces a copy of your CV aimed at that advert — summary rewritten, sections reordered, wording aligned to the advert. Nothing is invented. You review every change before anything is saved, and your original is never touched.</p>

<h2>5. Apply</h2>
<p>Apply from the job board with whichever CV you choose. The employer receives a frozen copy of it, so editing your CV afterwards never changes an application already sent. You can see exactly what each employer received under My applications.</p>

<h2>Employers</h2>
<p>Employers register a company, which an admin checks before it goes live. Once approved they can post jobs, read applicants with the CV exactly as submitted, and browse candidates who have marked themselves open to work.</p>
`,
  },
  {
    title: 'Privacy policy',
    navLabel: 'Privacy',
    showInHeader: false,
    showInFooter: true,
    sortOrder: 3,
    excerpt: 'What we store, who can see it, and how to get rid of it.',
    body: `
<p>This page describes what Smart CV Generator stores about you and who can see it. It is written plainly on purpose.</p>

<h2>What we store</h2>
<ul>
<li><strong>Your account:</strong> name, email address and a hashed password. The password itself is never stored and cannot be recovered from the hash.</li>
<li><strong>Your CVs:</strong> everything you type into them, and any photo you upload.</li>
<li><strong>Your candidate profile:</strong> position, industry, years of experience, location and whether you are open to work — only if you fill it in.</li>
<li><strong>Your activity:</strong> logins, CV downloads, job applications and match analyses, so the system can show you your own history and the administrator can see how the site is used.</li>
</ul>

<h2>Who can see it</h2>
<ul>
<li><strong>You</strong> can see everything of your own.</li>
<li><strong>Employers</strong> see a CV only when you apply for their job, and they see the copy as it was when you applied. Employers whose company has been approved by an administrator can also browse candidate profiles and the CV you have marked as primary. Your email address is shown on your profile page, not in the browsable list.</li>
<li><strong>Administrators</strong> can see accounts, CVs and activity. This is how the site is moderated.</li>
<li><strong>Nobody else.</strong> We do not sell data, we do not share it with advertisers, and there is no third-party tracking on this site.</li>
</ul>

<h2>Controlling it</h2>
<p>You can edit or delete any CV at any time. You can turn "open to work" off, which removes you from the employer's shortlist view. To have your account removed entirely, email us and we will delete it.</p>

<h2>Cookies</h2>
<p>One cookie, used to keep you signed in. It is httpOnly, so page scripts cannot read it, and it is removed when you log out. There are no analytics or advertising cookies.</p>

<h2>Uploads</h2>
<p>Photos and company documents are stored on the server running this site. Company registration documents are kept outside the public folder and can only be read by the company that uploaded them and by an administrator.</p>
`,
  },
  {
    title: 'Terms of use',
    navLabel: 'Terms',
    showInHeader: false,
    showInFooter: true,
    sortOrder: 4,
    excerpt: 'The short set of rules for using this site.',
    body: `
<p>By using Smart CV Generator you agree to the following. It is deliberately short.</p>

<h2>Your account</h2>
<p>One account per person. Keep your password to yourself. You are responsible for what is done through your account.</p>

<h2>What you write</h2>
<p>Everything on your CV should be true. The tools here will help you present your experience well; they will not help you invent it, and an account used to misrepresent qualifications may be removed.</p>

<h2>Employers</h2>
<p>A company must be registered and approved before it can post jobs. Adverts must be for real vacancies. Candidate details reached through this site may be used to consider someone for a role and for nothing else — not for marketing, and not for passing to anyone else.</p>

<h2>Availability</h2>
<p>This is a student project. It is offered as it is, without any guarantee of uptime, and you should keep your own copy of anything that matters to you.</p>

<h2>Removal</h2>
<p>We may remove content or suspend an account that breaks these rules, and we will say why.</p>
`,
  },
  {
    title: 'Contact',
    navLabel: 'Contact',
    showInHeader: false,
    showInFooter: true,
    sortOrder: 5,
    excerpt: 'How to reach us about a bug, a question or a company approval.',
    body: `
<p>Smart CV Generator is run by two people, so you will reach an actual human.</p>

<h2>Email</h2>
<p>rijanxshishir@gmail.com — the fastest route for anything.</p>

<h2>Waiting on a company approval?</h2>
<p>New companies are checked by hand before they can post jobs, which is usually quick. If yours has been pending for more than a couple of days, email us with the company name and we will look.</p>

<h2>Found a bug?</h2>
<p>Tell us what you were doing, what you expected, and what happened instead. A screenshot helps more than anything else. If it involves a specific CV or job advert, mention its title.</p>

<h2>Where we are</h2>
<p>Kathmandu, Nepal.</p>
`,
  },
];

async function seed() {
  await connectDB(env.mongoUri);

  // Written under whichever admin exists. The blog needs an author and
  // the seed should not invent an account to be one.
  const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
  if (!admin) {
    console.error('[seed:content] No admin account. Run `npm run seed:admin` first.');
    await disconnectDB();
    process.exit(1);
  }

  let created = 0;
  let updated = 0;

  for (const post of POSTS) {
    const slug = slugify(post.title);
    const publishedAt = new Date(Date.now() - post.daysAgo * 24 * 60 * 60 * 1000);

    // Through the same sanitiser the API uses, so seeded posts cannot
    // contain anything a written one could not.
    const bodyHtml = sanitiseHtml(post.body.trim());

    const result = await Content.updateOne(
      { slug },
      {
        $set: {
          type: 'post',
          title: post.title,
          excerpt: post.excerpt,
          bodyHtml,
          status: 'published',
          publishedAt,
          isDeleted: false,
        },
        $setOnInsert: { slug, author: admin._id },
      },
      { upsert: true },
    );

    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  for (const page of PAGES) {
    const slug = slugify(page.title);

    const result = await Content.updateOne(
      { slug },
      {
        $set: {
          type: 'page',
          title: page.title,
          excerpt: page.excerpt,
          bodyHtml: sanitiseHtml(page.body.trim()),
          status: 'published',
          navLabel: page.navLabel,
          showInHeader: page.showInHeader,
          showInFooter: page.showInFooter,
          sortOrder: page.sortOrder,
          isDeleted: false,
        },
        $setOnInsert: { slug, author: admin._id, publishedAt: new Date() },
      },
      { upsert: true },
    );

    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  console.log(`[seed:content] Created: ${created}`);
  console.log(`[seed:content] Updated: ${updated}`);
  console.log(`[seed:content] Posts:   ${POSTS.length}, pages: ${PAGES.length}`);
  console.log(`[seed:content] Author:  ${admin.name} <${admin.email}>`);

  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed:content] Failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
