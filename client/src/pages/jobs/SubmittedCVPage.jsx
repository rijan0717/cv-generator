import { useParams, Link } from 'react-router-dom';
import SubmittedCV from '../../components/jobs/SubmittedCV.jsx';
import Button from '../../components/ui/Button.jsx';

/**
 * One submitted CV on a page of its own.
 *
 * "View CV" from the applications list opens this in a new tab, so the
 * list stays where it was: comparing the CV against the advert means
 * moving between two pages, and an inline panel loses the user's place
 * in the list every time they close it.
 */
export default function SubmittedCVPage() {
  const { id } = useParams();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        to="/applications"
        className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        &larr; My applications
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          The CV you sent
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Exactly as the employer received it.
        </p>
      </header>

      <SubmittedCV applicationId={id} />

      <Link to="/applications" className="mt-6 inline-block">
        <Button variant="secondary">Back to my applications</Button>
      </Link>
    </div>
  );
}
