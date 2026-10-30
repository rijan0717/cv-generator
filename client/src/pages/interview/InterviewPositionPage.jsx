import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as interviewApi from '../../api/interview.js';
import { useToast } from '../../context/useToast.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * One position: pick a level, study the questions, then sit the exam.
 *
 * Study and exam are on the same page rather than behind separate
 * navigation, because they are two halves of one task. The answers are
 * hidden until each question is opened — seeing the whole answer key at
 * once turns revision into reading.
 */
export default function InterviewPositionPage() {
  const toast = useToast();
  const { slug } = useParams();
  const navigate = useNavigate();

  const [position, setPosition] = useState(null);
  const [level, setLevel] = useState('');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    interviewApi
      .getPositionBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setPosition(data);
        setLevel(data.levels[0] ?? '');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!level) return undefined;

    let cancelled = false;

    interviewApi
      .getStudyQuestions(slug, level)
      .then((data) => {
        if (!cancelled) setQuestions(data.questions);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, level]);

  /** Starts a sitting and goes straight into it. */
  async function start() {
    setIsStarting(true);

    try {
      // No level: the paper is drawn from all three together.
      const attempt = await interviewApi.startExam(position.id);
      toast.info('Your exam has started. Good luck.');
      navigate(`/interview/exam/${attempt.id}`);
    } catch (err) {
      toast.error(err.message);
      setIsStarting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading position" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="error">{error || 'That position is not available.'}</Alert>
        <Link to="/interview" className="mt-4 inline-block text-sm underline">
          Back to search
        </Link>
      </div>
    );
  }

  const needed = position.examSettings.questionCount;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/interview"
        className="text-sm text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
      >
        &larr; All positions
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{position.title}</h1>
        {position.description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{position.description}</p>
        )}
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Level">
        {position.levels.map((entry) => (
          <button
            key={entry}
            type="button"
            aria-pressed={level === entry}
            onClick={() => setLevel(entry)}
            className={[
              'rounded-full px-3 py-1 text-sm font-medium capitalize transition',
              level === entry
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
            ].join(' ')}
          >
            {entry}
          </button>
        ))}
      </div>

      <section className="mt-5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Test yourself</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {needed} question{needed === 1 ? '' : 's'} drawn from every level — junior, mid and senior
          together, as a real interview would. Pass mark {position.examSettings.passMark}%.
          {position.examSettings.timeLimitMinutes > 0
            ? ` You have ${position.examSettings.timeLimitMinutes} minutes.`
            : ' There is no time limit.'}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Retake it as often as you like. Each paper is drawn afresh, the options are reshuffled,
          and anything you got wrong last time is more likely to come back.
        </p>
        <Button className="mt-3" onClick={start} isLoading={isStarting}>
          Start the exam
        </Button>
      </section>

      <h2 className="mt-8 font-semibold text-slate-900 dark:text-slate-100">
        Study {level} questions{' '}
        <span className="font-normal text-slate-500">({questions.length})</span>
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Try to answer each one before opening it. The reasoning matters more than the answer — an
        interviewer will ask why.
      </p>

      <ul className="mt-4 space-y-3">
        {questions.map((question, index) => (
          <StudyCard key={question.id} question={question} number={index + 1} />
        ))}
      </ul>

      {questions.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No questions at this level yet.
        </p>
      )}
    </div>
  );
}

/**
 * One study question, with its answer hidden until asked for.
 * @param {{question: object, number: number}} props
 */
function StudyCard({ question, number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <p className="font-medium text-slate-900 dark:text-slate-100">
        {number}. {question.text}
      </p>

      {/* No options here. Recalling the answer is what an interview
          actually asks for; picking it from a list of four is the
          exam's job, not revision's. */}
      {isOpen ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <span className="font-medium">Answer: </span>
            {question.answer}
          </p>
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="font-medium">Why: </span>
            {question.explanation}
          </p>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setIsOpen(true)}>
          Show the answer
        </Button>
      )}

      {question.topic && (
        <code className="mt-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {question.topic}
        </code>
      )}
    </li>
  );
}
