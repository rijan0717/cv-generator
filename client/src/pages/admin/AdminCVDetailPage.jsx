import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as adminApi from '../../api/admin.js';
import CVPreview from '../../components/cv/CVPreview.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * Read-only view of any user's CV.
 *
 * It renders through the same CVPreview component as the owner's editor, so
 * the admin sees exactly what the user built. There is deliberately no way
 * to edit from here: an admin may review and remove a CV, but the content
 * belongs to the person who wrote it.
 */
export default function AdminCVDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cv, setCv] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getAnyCV(id)
      .then((result) => {
        if (!cancelled) setCv(result);
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

  /** Removes the CV and returns to the list. */
  async function remove() {
    if (!window.confirm(`Delete "${cv.title}"? The owner will no longer see it.`)) return;

    setIsDeleting(true);
    try {
      await adminApi.deleteAnyCV(id);
      navigate('/admin/cvs');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading CV" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Alert variant="error">{error}</Alert>
        <Link to="/admin/cvs" className="mt-4 inline-block">
          <Button variant="secondary">Back to CVs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin/cvs"
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
      >
        &larr; All CVs
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{cv.title}</h2>
          {cv.user && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {cv.user.name} &middot; {cv.user.email}
            </p>
          )}
        </div>

        <Button variant="danger" size="sm" isLoading={isDeleting} onClick={remove}>
          Delete this CV
        </Button>
      </div>

      <div className="mt-5 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 p-4">
        <CVPreview cv={cv} />
      </div>
    </div>
  );
}
