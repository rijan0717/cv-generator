import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from '../components/ui/Button.jsx';
import FloatingReviews from '../components/home/FloatingReviews.jsx';
import FloatingTemplates from '../components/home/FloatingTemplates.jsx';
import TemplatePreview from '../components/home/TemplatePreview.jsx';
import FeatureRow from '../components/home/FeatureRow.jsx';
import ScoreStat from '../components/home/ScoreStat.jsx';
import {
  EditorIllustration,
  CustomiseIllustration,
  ImportIllustration,
  ExportIllustration,
  JobsIllustration,
  ScoreIllustration,
} from '../components/home/Illustrations.jsx';

/**
 * The landing page.
 *
 * Long-form, section by section, with a coloured band roughly every third
 * block to break up the length.
 *
 * Two things a page like this usually invents are deliberately absent: a
 * strip of customer logos, and a headline user count. We have neither
 * real customers nor a number worth quoting, and inventing them would be
 * dishonest. Everything shown is real — the previews render the actual
 * template components, and the testimonials come from the database.
 */

/** The three steps in the "How it works" section. */
const STEPS = [
  {
    number: '01',
    title: 'Start from a template',
    description:
      'Pick one of five layouts, from a traditional single column to an ATS-friendly plain format. You can change your mind later without losing anything.',
  },
  {
    number: '02',
    title: 'Fill in your details',
    description:
      'Work through each section with a live A4 preview beside you. Your work saves as you type, and you can import an existing PDF or Word CV to start from.',
  },
  {
    number: '03',
    title: 'Download and apply',
    description:
      'Check your AI score, see how well you match each job on the board, then export as PDF, Word or Excel and apply.',
  },
];

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      {/* --- Hero --- */}
      <section className="overflow-hidden border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              CV builder with ATS matching
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
              Write a CV that gets past the filter
            </h1>

            <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Build it, score it out of 100, and see how well it matches any job &mdash; then apply,
              without leaving the page.
            </p>

            {/* The two numbers the product is built around, shown above the
                fold. They count up on every load and are coloured by their
                own value, red through amber to green, so the scale reads at
                a glance. The figures are a worked example, not an average of
                real users, and the caption says so. */}
            <dl className="mt-6 flex flex-wrap gap-3">
              <ScoreStat label="AI CV score" value={82} />
              <ScoreStat label="AI job match" value={76} suffix="%" />
            </dl>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Example figures: one finished CV, one job advert.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {/* Nothing renders until the session check finishes, so a
                  button never flips from one label to the other. */}
              {!isLoading &&
                (isAuthenticated ? (
                  <>
                    <Link to="/dashboard">
                      <Button size="lg">Go to my CVs</Button>
                    </Link>
                    <Link to="/jobs">
                      <Button size="lg" variant="secondary">
                        Browse jobs
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg">Create a free account</Button>
                    </Link>
                    <Link to="/jobs">
                      <Button size="lg" variant="secondary">
                        Browse jobs
                      </Button>
                    </Link>
                  </>
                ))}
            </div>

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Free, with no limit on how many CVs you keep.
            </p>
          </div>

          {/* Three real templates, fanned. Hidden below large screens,
              where it would push the call to action off the fold. */}
          <div className="relative hidden h-[400px] w-[430px] lg:block">
            <TemplatePreview
              templateKey="minimal"
              width={205}
              className="absolute left-0 top-10 -rotate-6"
            />
            <TemplatePreview
              templateKey="creative"
              width={205}
              className="absolute right-0 top-6 rotate-6"
            />
            <TemplatePreview
              templateKey="classic"
              width={225}
              className="absolute left-1/2 top-0 -translate-x-1/2"
            />
          </div>
        </div>
      </section>

      {/* --- How it works --- */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-slate-100">
            Three steps to a finished CV
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            No account needed to look around. You only need one to save your work.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <span
                aria-hidden="true"
                className="text-3xl font-bold text-indigo-200 dark:text-indigo-900"
              >
                {step.number}
              </span>
              <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* --- Template showcase band --- */}
      <section className="bg-indigo-700 py-12 sm:py-16 dark:bg-indigo-900">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
              Five templates, one set of controls
            </h2>
            <p className="mt-4 leading-relaxed text-indigo-100">
              Every template reads the same settings, so changing colour, font, spacing or the order
              of your sections works identically whichever one you pick. Switch between them
              whenever you like &mdash; your content never changes.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-indigo-100">
              <li>Classic, Modern, Minimal, Creative and ATS-Friendly</li>
              <li>Live A4 preview at true size, so the PDF matches exactly</li>
              <li>An ATS layout built to be read correctly by screening software</li>
            </ul>

            {!isLoading && !isAuthenticated && (
              <Link to="/register" className="mt-8 inline-block">
                <Button size="lg" variant="secondary">
                  Start building
                </Button>
              </Link>
            )}
          </div>

          <div className="flex justify-center">
            <FloatingTemplates />
          </div>
        </div>
      </section>

      {/* --- Feature rows --- */}
      <section className="mx-auto max-w-6xl divide-y divide-slate-200 px-4 dark:divide-slate-700">
        <FeatureRow
          eyebrow="Build"
          title="Edit on the left, see the page on the right"
          illustration={<EditorIllustration />}
          points={[
            'Live A4 preview that updates as you type',
            'Autosaves a second and a half after you stop',
            'Add, remove and reorder entries in any section',
          ]}
        >
          <p>
            The preview is the real page at its real size, scaled down. Nothing reflows between what
            you see and what you download.
          </p>
        </FeatureRow>

        <FeatureRow
          eyebrow="Customise"
          title="Make it look like yours"
          reverse
          illustration={<CustomiseIllustration />}
          points={[
            'Six theme presets, or pick your own colours',
            'Six fonts, three text sizes, two spacing options',
            'Hide sections you do not need, reorder the rest',
          ]}
        >
          <p>
            One panel drives every template, because none of them hard-code their styling. Change a
            colour once and it applies wherever you go.
          </p>
        </FeatureRow>

        <FeatureRow
          eyebrow="Import"
          title="Already have a CV? Start from it"
          illustration={<ImportIllustration />}
          points={[
            'Reads PDF, Word and plain text',
            'Finds your contact details, roles, education and skills',
            'You choose which sections to bring across',
          ]}
        >
          <p>
            Upload your existing CV and we read what we can into the builder. Nothing is applied
            until you have checked it &mdash; automatic reading is never perfect, so you stay in
            control.
          </p>
        </FeatureRow>

        <FeatureRow
          eyebrow="Export"
          title="Download in the format you need"
          reverse
          illustration={<ExportIllustration />}
          points={[
            'PDF that matches the preview exactly, with selectable text',
            'Word for a recruiter who will reformat it',
            'Excel with one sheet per section, for application forms',
          ]}
        >
          <p>
            The PDF is printed from the same page you edited, so there is no second rendering to
            drift out of step.
          </p>
        </FeatureRow>

        <FeatureRow
          eyebrow="Score"
          title="Two numbers that tell you where you stand"
          illustration={<ScoreIllustration />}
          points={[
            'An AI score out of 100 on every CV, updated each time you save',
            'An AI match percentage on every job, against your primary CV',
            'The missing keywords and skills behind each number, not just the number',
          ]}
        >
          <p>
            Every CV is scored, even an empty one &mdash; a new CV starts at 0 and climbs as you
            fill it in, so you can always see how far you have got. The score comes from the details
            you have entered: which sections are complete, how your summary reads, whether your
            achievements carry real figures. The match percentage compares that CV with a job advert
            word by word and tells you which of its requirements you have not mentioned.
          </p>
        </FeatureRow>

        <FeatureRow
          eyebrow="Apply"
          title="Find a job and apply with one click"
          reverse
          illustration={<JobsIllustration />}
          points={[
            'Browse and search every posted job, no account needed',
            'Save the ones you want to come back to',
            'Apply with your primary CV and track what you hear back',
          ]}
        >
          <p>
            Companies post directly on the board. When you apply, a copy of your CV is sent as it is
            at that moment, so editing it later never changes what an employer is reading.
          </p>
        </FeatureRow>
      </section>

      {/* --- Testimonials, from real reviews above three stars --- */}
      <FloatingReviews />

      {/* --- Closing call to action --- */}
      {!isLoading && !isAuthenticated && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="rounded-2xl bg-slate-900 px-6 py-10 text-center sm:px-12 sm:py-14 dark:bg-slate-800 dark:ring-1 dark:ring-slate-700">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
              Start your CV in the next five minutes
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Create an account, pick a template and fill in the first section. Keep as many CVs as
              you like, one for each kind of role you apply for.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  Create a free account
                </Button>
              </Link>
              <Link to="/jobs">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white hover:bg-white/10 dark:text-white dark:hover:bg-white/10"
                >
                  Or browse jobs first
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
