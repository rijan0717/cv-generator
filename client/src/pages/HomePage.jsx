import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from '../components/ui/Button.jsx';

/**
 * Public landing page.
 *
 * It explains what the application does and what makes it different from an
 * ordinary CV builder: the strength score and the ATS-style job match. The
 * call to action changes depending on whether anyone is logged in.
 */

/** The three steps shown in the "How it works" section. */
const STEPS = [
  {
    number: '1',
    title: 'Build your CV',
    description:
      'Fill in a guided, multi-step form covering education, experience, skills, projects and more. Your work saves as you type.',
  },
  {
    number: '2',
    title: 'Choose a template',
    description:
      'Pick one of five templates and adjust colours, fonts, spacing and section order. A live A4 preview shows exactly what you will get.',
  },
  {
    number: '3',
    title: 'Check and improve',
    description:
      'Score your CV out of 100, paste a job description to see how well you match it, then download as PDF or Excel.',
  },
];

/** The two algorithmic features that are the core of the project. */
const FEATURES = [
  {
    title: 'CV Strength Score',
    summary: 'A score out of 100, with the reasoning shown.',
    detail:
      'A weighted rule-based model checks how complete your CV is and how well it is written: action verbs, quantified achievements, summary length, contact details and date consistency. You get a breakdown of every criterion and a list of specific improvements.',
  },
  {
    title: 'CV–Job Match Analyser',
    summary: 'See your CV the way an applicant tracking system does.',
    detail:
      'Paste a job description and the system compares it with your CV using TF-IDF weighting and cosine similarity. It reports an overall match score, which keywords you already cover, and which important ones are missing.',
  },
];

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              CV builder with ATS matching
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Write a CV that gets past the filter
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Build a professional CV, score how strong it is, and measure how well it matches the
              job you are actually applying for &mdash; before you send it.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {/* Nothing is rendered until the session check finishes, so the
                  button never flips from one label to the other. */}
              {!isLoading &&
                (isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button size="lg">Go to my CVs</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg">Create a free account</Button>
                    </Link>
                    <Link to="/login">
                      <Button size="lg" variant="secondary">
                        Log in
                      </Button>
                    </Link>
                  </>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">How it works</h2>

        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <span
                aria-hidden="true"
                className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 font-semibold text-white"
              >
                {step.number}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The two algorithms */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            More than a CV template
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Two analysis tools do the work that usually takes a human reviewer.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl bg-slate-50 p-6 ring-1 ring-slate-200"
              >
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">{feature.summary}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      {!isLoading && !isAuthenticated && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-2xl bg-slate-900 px-6 py-12 text-center sm:px-12">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Ready to build your CV?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Create an account and start your first CV. You can keep several, one for each kind of
              role you apply for.
            </p>
            <Link to="/register" className="mt-8 inline-block">
              <Button size="lg" variant="secondary">
                Create a free account
              </Button>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
