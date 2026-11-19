import { lazy, Suspense } from 'react';
import HeroDemo from '../home/HeroDemo.jsx';
import { Reveal } from '../ui/motion.jsx';

/**
 * The live preview for one feature page.
 *
 * Every page under `/features/:slug` now shows the tool working rather
 * than only describing it. Two of them reuse the home page's hero demos
 * unchanged — the builder and the rewrite are the same story told on
 * both pages, and a second drawing of either would be a second thing to
 * keep true.
 *
 * The rest are loaded lazily: a visitor reading about interview practice
 * should not download the drawing of the applicant pipeline, and each
 * demo is a self-contained picture with no shared state, so splitting
 * them costs nothing.
 *
 * `slug` drives the choice, so adding a page to `data/features.js`
 * without a demo is a page with no preview, not a broken one.
 */

const ScoreDemo = lazy(() => import('./ScoreDemo.jsx'));
const TemplateSwapDemo = lazy(() => import('./TemplateSwapDemo.jsx'));
const QuizDemo = lazy(() => import('./QuizDemo.jsx'));
const PipelineDemo = lazy(() => import('./PipelineDemo.jsx'));
const PostJobDemo = lazy(() => import('./PostJobDemo.jsx'));
const TalentDemo = lazy(() => import('./TalentDemo.jsx'));

/**
 * Which demo belongs to which page, and the line printed beneath it.
 *
 * The caption is real text, outside the `aria-hidden` frame, so the page
 * still says what the picture shows to anyone who cannot see it.
 */
const DEMOS = {
  'cv-builder': {
    render: () => <HeroDemo tab="create-cv" />,
    caption: 'Type into the builder and the A4 preview keeps up, saving as you go.',
  },
  rewrite: {
    render: () => <HeroDemo tab="get-hired" />,
    caption: 'The rewrite works through the advert, then shows the score before and after.',
  },
  'cv-score': {
    render: () => <ScoreDemo />,
    caption: 'A mark out of 100, the criteria that earned it, and what would raise it.',
  },
  templates: {
    render: () => <TemplateSwapDemo />,
    caption: 'One set of content, redrawn by each design — the palette travels with it.',
  },
  'interview-prep': {
    render: () => <QuizDemo />,
    caption: 'Answer, see it marked, and read why the right answer is right.',
  },
  'applicant-tracking': {
    render: () => <PipelineDemo />,
    caption: 'One application, one status, moved by the employer as they work through it.',
  },
  'post-a-job': {
    render: () => <PostJobDemo />,
    caption: 'Write the advert, put it live, and see applicants arrive already scored.',
  },
  'find-candidates': {
    render: () => <TalentDemo />,
    caption: 'Filter the directory and the list narrows to the people who fit.',
  },
};

/**
 * The whole section, including its spacing, so a page with no demo
 * renders nothing at all rather than an empty band — and the page it
 * sits on does not need to ask whether there is one.
 *
 * @param {{slug: string, className?: string}} props - Which feature page
 *   is being shown, and the page's own container classes.
 */
export default function FeatureDemo({ slug, className = '' }) {
  const demo = DEMOS[slug];
  if (!demo) return null;

  return (
    <section className={`${className} pb-12 sm:pb-16`}>
      <Reveal>
        <div className="mx-auto max-w-3xl">
          {/* A plain box of the demo's own height while the chunk
              loads: a spinner for a decorative picture would draw more
              attention than the picture it stands in for. */}
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="h-[22rem] rounded-2xl border border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-800"
              />
            }
          >
            {demo.render()}
          </Suspense>

          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-100">
            {demo.caption}
          </p>
        </div>
      </Reveal>
    </section>
  );
}
