import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as interviewApi from '../../api/interview.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** The levels a position can be offered at, weakest first. */
const LEVELS = ['junior', 'mid', 'senior'];

/** How many options every question carries. Fixed, as the model requires. */
const OPTION_COUNT = 4;

/** A blank question, for the add form. */
const EMPTY_QUESTION = {
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  topic: '',
};

/**
 * One position: its settings, and the questions behind it.
 *
 * The questions are grouped by level because that is how they are drawn
 * into an exam — a paper is built from one level's pool — and because the
 * question an admin is really asking on this page is "which level is
 * still short?".
 */
export default function AdminInterviewPositionPage() {
  const { id } = useParams();

  const [position, setPosition] = useState(null);
  const [questions, setQuestions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [level, setLevel] = useState('junior');

  const load = useCallback(async () => {
    const [loadedPosition, loadedQuestions] = await Promise.all([
      interviewApi.getPosition(id),
      interviewApi.listQuestions(id),
    ]);

    setPosition(loadedPosition);
    setQuestions(loadedQuestions);
    // Open on a level the position actually offers.
    setLevel((current) =>
      loadedPosition.levels.includes(current) ? current : loadedPosition.levels[0],
    );
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    load()
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [load]);

  /**
   * Saves a change to the position and reloads, because switching it on
   * or off can be undone by the server's own guard.
   * @param {object} payload - The fields to change.
   */
  async function savePosition(payload) {
    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      await interviewApi.updatePosition(id, payload);
      await load();
      setNotice('Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Adds a question, then reloads so the counts and the position's own
   * state are whatever the server now says they are.
   * @param {object} draft - The question being added.
   */
  async function addQuestion(draft) {
    setError('');
    setNotice('');

    await interviewApi.createQuestion({
      position: id,
      level,
      text: draft.text.trim(),
      options: draft.options.map((text) => ({ text: text.trim() })),
      correctIndex: draft.correctIndex,
      explanation: draft.explanation.trim(),
      topic: draft.topic.trim() || undefined,
    });

    await load();
  }

  /**
   * Removes a question.
   *
   * Deleting one can take the position below what an exam needs, in which
   * case the server withdraws it rather than refusing the delete — so the
   * reload may show it as hidden, and that is explained rather than left
   * to be noticed.
   * @param {object} question - The question to remove.
   */
  async function removeQuestion(question) {
    setError('');
    setNotice('');

    try {
      const wasActive = position.isActive;
      await interviewApi.deleteQuestion(question.id);
      await load();

      const stillActive = (await interviewApi.getPosition(id)).isActive;
      if (wasActive && !stillActive) {
        setNotice(
          'That left too few questions for an exam, so the position has been withdrawn from users.',
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading position" />
      </div>
    );
  }

  if (!position) {
    return <Alert variant="error">{error || 'That position could not be found.'}</Alert>;
  }

  const need = position.examSettings.questionCount;
  const levelQuestions = questions[level] ?? [];
  const activeAtLevel = levelQuestions.filter((question) => question.isActive).length;

  return (
    <div>
      <Link
        to="/admin/interview"
        className="text-sm text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
      >
        &larr; All positions
      </Link>

      <header className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{position.title}</h2>
        <span
          className={
            position.isActive
              ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }
        >
          {position.isActive ? 'Offered to users' : 'Hidden'}
        </span>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert variant="info" className="mt-4">
          {notice}
        </Alert>
      )}

      <ExamSettings position={position} isSaving={isSaving} onSave={savePosition} />

      {/* Levels */}
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Level">
        {LEVELS.filter((entry) => position.levels.includes(entry)).map((entry) => {
          const have = (questions[entry] ?? []).filter((question) => question.isActive).length;

          return (
            <button
              key={entry}
              type="button"
              aria-pressed={level === entry}
              onClick={() => setLevel(entry)}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition',
                level === entry
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
              ].join(' ')}
            >
              {entry}
              <span className="ml-1 opacity-60">
                {have}/{need}
              </span>
            </button>
          );
        })}
      </div>

      {activeAtLevel < need && (
        <Alert variant="info" className="mt-3">
          {need - activeAtLevel} more active {need - activeAtLevel === 1 ? 'question' : 'questions'}{' '}
          needed at {level} level before this position can be offered.
        </Alert>
      )}

      <QuestionForm key={level} onAdd={addQuestion} onError={setError} />

      <ul className="mt-4 space-y-3">
        {levelQuestions.map((question, index) => (
          <li
            key={question.id}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {index + 1}. {question.text}
              </p>
              <Button size="sm" variant="ghost" onClick={() => removeQuestion(question)}>
                Delete
              </Button>
            </div>

            <ol className="mt-2 space-y-1 text-sm">
              {question.options.map((option, optionIndex) => (
                <li
                  key={optionIndex}
                  className={
                    optionIndex === question.correctIndex
                      ? 'font-medium text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }
                >
                  {String.fromCharCode(65 + optionIndex)}) {option.text}
                  {optionIndex === question.correctIndex && ' ✓'}
                </li>
              ))}
            </ol>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Why: </span>
              {question.explanation}
            </p>

            {question.topic && (
              <code className="mt-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {question.topic}
              </code>
            )}
          </li>
        ))}
      </ul>

      {levelQuestions.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No questions at {level} level yet.
        </p>
      )}
    </div>
  );
}

/**
 * The exam rules for this position.
 * @param {{position: object, isSaving: boolean, onSave: (payload: object) => void}} props
 */
function ExamSettings({ position, isSaving, onSave }) {
  const [settings, setSettings] = useState(position.examSettings);

  // The server can reject a change, so the form follows the stored value
  // rather than keeping whatever was typed.
  useEffect(() => setSettings(position.examSettings), [position.examSettings]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ examSettings: settings });
      }}
      className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Exam</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Questions are drawn automatically from this position&rsquo;s active questions at the level
        the user picks.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <NumberField
          label="Questions per exam"
          value={settings.questionCount}
          min={1}
          max={50}
          onChange={(questionCount) => setSettings({ ...settings, questionCount })}
        />
        <NumberField
          label="Pass mark (%)"
          value={settings.passMark}
          min={1}
          max={100}
          onChange={(passMark) => setSettings({ ...settings, passMark })}
        />
        <NumberField
          label="Time limit (0 = none)"
          value={settings.timeLimitMinutes}
          min={0}
          max={180}
          onChange={(timeLimitMinutes) => setSettings({ ...settings, timeLimitMinutes })}
        />
      </div>

      <Button type="submit" size="sm" className="mt-3" isLoading={isSaving}>
        Save exam settings
      </Button>
    </form>
  );
}

/**
 * A small labelled number input.
 * @param {{label: string, value: number, min: number, max: number,
 *          onChange: (value: number) => void}} props
 */
function NumberField({ label, value, min, max, onChange }) {
  const id = `field-${label.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-lg border-0 py-2 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
      />
    </div>
  );
}

/**
 * The form for adding one question.
 *
 * The correct answer is a radio beside each option rather than a separate
 * field, so it is impossible to mark an answer that is not one of the
 * four, and impossible to forget to mark one at all.
 *
 * @param {{onAdd: (draft: object) => Promise<void>, onError: (message: string) => void}} props
 */
function QuestionForm({ onAdd, onError }) {
  const [draft, setDraft] = useState(EMPTY_QUESTION);
  const [isSaving, setIsSaving] = useState(false);

  const isComplete =
    draft.text.trim() && draft.explanation.trim() && draft.options.every((option) => option.trim());

  async function submit(event) {
    event.preventDefault();
    if (!isComplete) return;

    setIsSaving(true);

    try {
      await onAdd(draft);
      setDraft(EMPTY_QUESTION);
    } catch (err) {
      onError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add a question</h3>

      <label
        htmlFor="question-text"
        className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400"
      >
        Question
      </label>
      <textarea
        id="question-text"
        value={draft.text}
        onChange={(event) => setDraft({ ...draft, text: event.target.value })}
        rows={2}
        maxLength={1000}
        className="mt-1 w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
      />

      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Options — select the correct one
        </legend>

        <div className="mt-1 space-y-2">
          {Array.from({ length: OPTION_COUNT }, (_, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-option"
                checked={draft.correctIndex === index}
                onChange={() => setDraft({ ...draft, correctIndex: index })}
                aria-label={`Option ${String.fromCharCode(65 + index)} is correct`}
                className="h-4 w-4"
              />
              <label htmlFor={`option-${index}`} className="sr-only">
                Option {String.fromCharCode(65 + index)}
              </label>
              <input
                id={`option-${index}`}
                value={draft.options[index]}
                onChange={(event) => {
                  const options = [...draft.options];
                  options[index] = event.target.value;
                  setDraft({ ...draft, options });
                }}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                maxLength={400}
                className="min-w-0 flex-1 rounded-lg border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <label
        htmlFor="explanation"
        className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400"
      >
        Why that answer is right
      </label>
      <textarea
        id="explanation"
        value={draft.explanation}
        onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
        rows={2}
        maxLength={1500}
        className="mt-1 w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
      />

      <label
        htmlFor="topic"
        className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400"
      >
        Topic (groups the exam breakdown, e.g. &ldquo;hooks&rdquo;)
      </label>
      <input
        id="topic"
        value={draft.topic}
        onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
        maxLength={40}
        className="mt-1 w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
      />

      <Button type="submit" size="sm" className="mt-3" isLoading={isSaving} disabled={!isComplete}>
        Add question
      </Button>
    </form>
  );
}
