import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as cvApi from '../../api/cvs.js';
import { getGmailStatus } from '../../api/gmail.js';
import { useToast } from '../../context/useToast.js';
import ComposeMailModal from '../../components/mail/ComposeMailModal.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** What the composer will and will not do, shown beside the button. */
const PROMISES = [
  {
    title: 'Written from your CV',
    detail:
      'Every sentence repeats something you already wrote. The letter never invents an achievement, a skill or a figure.',
  },
  {
    title: 'Specific, if you paste the advert',
    detail:
      'With a job description to hand, the letter leads with the experience that advert actually asks for.',
  },
  {
    title: 'It tells you what it could not say',
    detail:
      'A skill the advert wants that your CV does not list is reported to you as advice, not claimed on your behalf.',
  },
  {
    title: 'A draft by default',
    detail:
      'The letter goes to your own Gmail drafts, with your CV attached, for you to read before anything is sent.',
  },
];

/**
 * "Cover letter": write a letter from a CV and put it in Gmail.
 *
 * The page itself is deliberately thin — the work happens in
 * `ComposeMailModal`, which is also opened from My CVs, so the two entry
 * points cannot drift apart. What the page adds is the explanation of
 * what the composer does, which the modal has no room for.
 */
export default function CoverLetterPage() {
  const toast = useToast();

  const [cvs, setCvs] = useState([]);
  const [gmail, setGmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        // Both are needed before the modal can open, and neither depends
        // on the other, so they go out together.
        const [cvPage, status] = await Promise.all([
          cvApi.listCVs({ limit: 50 }),
          getGmailStatus(),
        ]);

        if (!isActive) return;
        setCvs(cvPage.cvs ?? []);
        setGmail(status);
      } catch (err) {
        if (isActive) setError(err.message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Cover letter</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        A letter built from one of your CVs, ready to go straight into your Gmail drafts.
      </p>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-lg border border-slate-200 p-6 dark:border-navy-700">
          {cvs.length === 0 ? (
            // Nothing to write from, so the button would only lead to an
            // empty picker. The useful thing here is the way out.
            <>
              <h2 className="text-lg font-semibold">You have no CVs yet</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                The letter is written from a CV, so there needs to be one to read.
              </p>
              <Button as={Link} to="/templates" variant="primary" className="mt-4">
                Build a CV
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Write a letter</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Choose a CV, name the company, and the letter is composed as you type. You can edit
                every word of it before it goes anywhere.
              </p>

              {gmail?.configured && !gmail?.connected && (
                <Alert variant="info" className="mt-4">
                  Your Gmail is not connected yet. You can still write and read the letter; saving
                  or sending it needs a connection, which you can make{' '}
                  <Link to="/profile" className="font-medium underline">
                    on your profile
                  </Link>
                  .
                </Alert>
              )}

              <Button variant="primary" className="mt-4" onClick={() => setIsComposeOpen(true)}>
                Write a cover letter
              </Button>
            </>
          )}
        </div>

        <ul className="space-y-4">
          {PROMISES.map((promise) => (
            <li key={promise.title}>
              <h3 className="text-sm font-semibold">{promise.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{promise.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <ComposeMailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        cvs={cvs}
        gmail={gmail ?? { connected: false, email: '', canCompose: false }}
        onSent={() => toast.info('You can see it in Mail, or in Gmail itself.')}
      />
    </div>
  );
}
