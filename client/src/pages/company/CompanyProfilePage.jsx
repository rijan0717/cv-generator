import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import * as companyApi from '../../api/companies.js';
import CompanyLogo from '../../components/company/CompanyLogo.jsx';
import CompanyForm from './CompanyForm.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';

/** Matches the server's upload rules, so a bad file is caught before it is sent. */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * The company profile: the logo, then the details.
 *
 * The logo comes first because it is the part of the profile that reaches
 * people who never open this page — it sits on every job card and on the
 * advert itself, so a jobseeker sees who is hiring without reading a name.
 */
export default function CompanyProfilePage() {
  const { company, setCompany } = useOutletContext();
  const fileInputRef = useRef(null);

  const [status, setStatus] = useState({ error: '', success: '' });
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Validates and uploads the chosen image.
   * @param {React.ChangeEvent<HTMLInputElement>} event
   */
  async function handleFile(event) {
    const file = event.target.files?.[0];
    // Clear the input straight away, so choosing the same file after a
    // failed attempt still fires a change event.
    event.target.value = '';
    if (!file) return;

    setStatus({ error: '', success: '' });

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus({ error: 'Please choose a JPG, PNG or WEBP image', success: '' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus({ error: 'That image is larger than 2 MB', success: '' });
      return;
    }

    setIsUploading(true);
    try {
      setCompany(await companyApi.uploadLogo(file));
      setStatus({ error: '', success: 'Logo updated' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsUploading(false);
    }
  }

  /** Removes the logo, falling back to the lettered badge. */
  async function handleRemove() {
    setStatus({ error: '', success: '' });
    setIsUploading(true);

    try {
      setCompany(await companyApi.removeLogo());
      setStatus({ error: '', success: 'Logo removed' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Logo</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Shown beside every job you post. JPG, PNG or WEBP, up to 2 MB.
        </p>

        <Alert variant="error" className="mt-3">
          {status.error}
        </Alert>
        <Alert variant="success" className="mt-3">
          {status.success}
        </Alert>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <CompanyLogo company={company} size="lg" />

          <div className="flex flex-wrap gap-2">
            {/* A styled button rather than a bare file input, which cannot
                be made to match the rest of the interface. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="sr-only"
              id="company-logo-input"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {company.logoUrl ? 'Replace logo' : 'Upload logo'}
            </Button>

            {company.logoUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Company details</h2>
        <CompanyForm company={company} onSaved={setCompany} />
      </section>
    </>
  );
}
