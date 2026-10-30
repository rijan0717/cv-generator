import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as interviewApi from '../../api/interview.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * Sitting an exam, and the result afterwards.
 *
 * One page rather than two, because submitting turns the same attempt
 * into its own result — navigating away and back would lose the sense
 * that the score belongs to the paper just taken.
 *
 * The questions arrive without their answers; the explanations only
 * appear once the paper has been submitted and marked by the server.
 */
export default function InterviewExamPage() {
  const { id } = useParams();

  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(null);

  // Held in a ref so the timer can submit without being re-created every
  // time an answer changes.
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const submit = useCallback(
    async (auto = false) => {
      setIsSubmitting(true);
      setError('');

      try {
        const marked = await interviewApi.submitExam(id, answersRef.current);
        setResult(marked);
      } catch (err) {
        // An automatic submit that fails must not look like nothing
        // happened, so the message is shown either way.
        setError(err.message);
      } finally {
        setIsSubmitting(false);
        if (auto) setSecondsLeft(0);
      }
    },
    [id],
  );

  useEffect(() => {
    let cancelled = false;

    interviewApi
      .getExam(id)
      .then((data) => {
        if (cancelled) return;

        // A submitted attempt comes back as its own result.
        if (data.submittedAt) {
          setResult(data);
          return;
        }

        setAttempt(data);
        setAnswers(data.answers ?? new Array(data.questions.length).fill(null));
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
  }, [id]);

  // The countdown is measured from the server's `startedAt` rather than
  // from when this page loaded, so reloading cannot buy more time.
  useEffect(() => {
    if (!attempt || result || !attempt.timeLimitMinutes) return undefined;

    const endsAt = new Date(attempt.startedAt).getTime() + attempt.timeLimitMinutes * 60_000;

    function tick() {
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) submit(true);
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt, result, submit]);

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading exam" />
      </div>
    );
  }

  if (result) return <ExamResult result={result} />;

  if (!attempt) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="error">{error || 'That exam could not be found.'}</Alert>
        <Link to="/interview" className="mt-4 inline-block text-sm underline">
          Back to search
        </Link>
      </div>
    );
  }

  const question = attempt.questions[current];
  const answered = answers.filter((answer) => answer !== null).length;
  const isLast = current === attempt.questions.length - 1;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {attempt.positionTitle}
          </h1>
          <p className="text-sm capitalize text-slate-500 dark:text-slate-400">
            {attempt.level} level &middot; pass mark {attempt.passMark}%
          </p>
        </div>

        {secondsLeft !== null && (
          <span
            className={[
              'rounded-full px-3 py-1 text-sm font-medium tabular-nums',
              secondsLeft <= 60
                ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            ].join(' ')}
            role="timer"
            aria-live={secondsLeft <= 60 ? 'assertive' : 'off'}
          >
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
        )}
      </header>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Question {current + 1} of {attempt.questions.length}
          </span>
          <span>{answered} answered</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-slate-900 transition-all dark:bg-slate-100"
            style={{ width: `${(answered / attempt.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <fieldset className="mt-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <legend className="sr-only">Question {current + 1}</legend>

        <p className="font-medium text-slate-900 dark:text-slate-100">{question.text}</p>

        <div className="mt-3 space-y-2">
          {question.options.map((option, index) => (
            <label
              key={index}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg p-3 text-sm ring-1 transition',
                answers[current] === index
                  ? 'bg-slate-50 ring-slate-900 dark:bg-slate-800 dark:ring-slate-100'
                  : 'ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              <input
                type="radio"
                name={`question-${current}`}
                checked={answers[current] === index}
                onChange={() => {
                  const next = [...answers];
                  next[current] = index;
                  setAnswers(next);
                }}
                className="mt-0.5 h-4 w-4"
              />
              <span className="text-slate-700 dark:text-slate-300">
                {String.fromCharCode(65 + index)}) {option.text}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="secondary"
          disabled={current === 0}
          onClick={() => setCurrent((value) => value - 1)}
        >
          Previous
        </Button>

        {isLast ? (
          <Button
            isLoading={isSubmitting}
            onClick={() => {
              const blank = answers.filter((answer) => answer === null).length;
              const message = blank
                ? `${blank} question${blank === 1 ? ' is' : 's are'} unanswered and will score nothing. Submit anyway?`
                : 'Submit your answers?';
              if (window.confirm(message)) submit();
            }}
          >
            Submit
          </Button>
        ) : (
          <Button onClick={() => setCurrent((value) => value + 1)}>Next</Button>
        )}
      </div>

      {/* Jump to any question, so a skipped one is easy to come back to. */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {attempt.questions.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`Go to question ${index + 1}${answers[index] === null ? ', unanswered' : ''}`}
            aria-current={index === current}
            className={[
              'h-8 w-8 rounded-lg text-xs font-medium transition',
              index === current
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : answers[index] !== null
                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700',
            ].join(' ')}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The marked result: the score, where it came from, and every question
 * with the right answer and the reasoning.
 * @param {{result: object}} props
 */
function ExamResult({ result }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/interview"
        className="text-sm text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
      >
        &larr; All positions
      </Link>

      <section
        className={[
          'mt-2 rounded-xl p-6 text-center ring-1',
          result.passed
            ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950 dark:ring-emerald-800'
            : 'bg-amber-50 ring-amber-200 dark:bg-amber-950 dark:ring-amber-800',
        ].join(' ')}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {result.positionTitle} &middot; <span className="capitalize">{result.level}</span>
        </p>
        <p className="mt-1 text-5xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {result.score}%
        </p>
        <p className="mt-1 font-medium text-slate-700 dark:text-slate-200">
          {result.passed ? 'Passed' : 'Not passed'} &middot; {result.correctCount} of {result.total}{' '}
          correct &middot; pass mark {result.passMark}%
        </p>
      </section>

      {result.suggestions?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {result.suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      {result.breakdown?.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">By topic</h2>
          <ul className="mt-2 space-y-2">
            {result.breakdown.map((topic) => (
              <li key={topic.topic} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate capitalize text-slate-700 dark:text-slate-300">
                  {topic.topic}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <span
                    className={[
                      'block h-full rounded-full',
                      topic.percentage >= 50 ? 'bg-emerald-500' : 'bg-amber-500',
                    ].join(' ')}
                    style={{ width: `${topic.percentage}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right tabular-nums text-slate-500 dark:text-slate-400">
                  {topic.correct}/{topic.asked}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mt-8 font-semibold text-slate-900 dark:text-slate-100">Your answers</h2>
      <ul className="mt-3 space-y-3">
        {result.questions.map((question) => (
          <li
            key={question.number}
            className={[
              'rounded-xl bg-white p-4 shadow-sm ring-1 dark:bg-slate-900',
              question.isCorrect
                ? 'ring-slate-200 dark:ring-slate-700'
                : 'ring-amber-300 dark:ring-amber-800',
            ].join(' ')}
          >
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {question.number}. {question.text}
            </p>

            <ol className="mt-2 space-y-1 text-sm">
              {question.options.map((option, index) => {
                const isCorrect = index === question.correctIndex;
                const isChosen = index === question.chosenIndex;

                return (
                  <li
                    key={index}
                    className={
                      isCorrect
                        ? 'font-medium text-emerald-700 dark:text-emerald-400'
                        : isChosen
                          ? 'text-red-600 line-through dark:text-red-400'
                          : 'text-slate-600 dark:text-slate-400'
                    }
                  >
                    {String.fromCharCode(65 + index)}) {option.text}
                    {isCorrect && ' ✓'}
                    {isChosen && !isCorrect && ' — your answer'}
                  </li>
                );
              })}
            </ol>

            {question.chosenIndex === null && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                You did not answer this one.
              </p>
            )}

            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span className="font-medium">Why: </span>
              {question.explanation}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
