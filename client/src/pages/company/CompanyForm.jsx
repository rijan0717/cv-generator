import { useState } from 'react';
import * as companyApi from '../../api/companies.js';
import { useToast } from '../../context/useToast.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';

/** Matches the server's rules for the registration document. */
const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
const PHONE_PATTERN = /^\+?[0-9\s-]{7,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create or edit the company profile.
 *
 * The same form does both, because the fields are identical and the only
 * difference is which endpoint it calls. Shared by the set-up screen and
 * the profile tab.
 *
 * Everything except the logo, industry, website and description is
 * required, because the admin checks it before approving the company:
 * name, location, registration / PAN / VAT number, phone, email and the
 * registration document. The document is sent after the details are
 * saved, as its own upload.
 *
 * @param {{company?: object, onSaved: (company: object) => void}} props
 */
export default function CompanyForm({ company, onSaved }) {
  const [form, setForm] = useState({
    name: company?.name ?? '',
    description: company?.description ?? '',
    website: company?.website ?? '',
    location: company?.location ?? '',
    industry: company?.industry ?? '',
    registrationNumber: company?.registrationNumber ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
  });
  const [documentFile, setDocumentFile] = useState(null);
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Updates one field.
   * @param {string} field - The field name.
   * @param {string} value - The new value.
   */
  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  /**
   * The same checks the server makes, so a mistake is caught before sending.
   * @returns {string} The first problem, or an empty string.
   */
  function validate() {
    if (form.name.trim().length < 2) return 'Company name must be at least 2 characters';
    if (form.location.trim().length < 2) return 'Please give the company location';
    if (form.registrationNumber.trim().length < 3) {
      return 'Please give the registration / PAN / VAT number';
    }
    if (!PHONE_PATTERN.test(form.phone.trim())) return 'Please give a valid phone number';
    if (!EMAIL_PATTERN.test(form.email.trim())) return 'Please give a valid company email';

    const hasDocument = Boolean(documentFile) || Boolean(company?.hasDocument);
    if (!hasDocument) return 'Please attach the company registration document';
    if (documentFile && !DOCUMENT_TYPES.includes(documentFile.type)) {
      return 'The registration document must be a PDF, JPG or PNG file';
    }
    if (documentFile && documentFile.size > DOCUMENT_MAX_BYTES) {
      return 'The registration document must be smaller than 5 MB';
    }
    return '';
  }

  /**
   * Saves the profile (creating the company the first time), then uploads
   * the registration document if one was chosen.
   * @param {React.FormEvent} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }

    setIsSaving(true);
    try {
      let saved = company
        ? await companyApi.updateMyCompany(form)
        : await companyApi.createCompany(form);

      if (documentFile) {
        try {
          saved = await companyApi.uploadDocument(documentFile);
          setDocumentFile(null);
        } catch (uploadError) {
          // The details are saved even though the file is not: show the
          // saved company (so a retry edits it rather than creating a
          // second one) and say what still needs doing.
          onSaved(saved);
          toast.error(
            `Your details were saved, but the document did not upload: ${uploadError.message} Please attach it again.`,
          );
          return;
        }
      }

      onSaved(saved);
      toast.success(
        saved.status === 'pending' ? 'Saved and sent to the admin for approval.' : 'Saved',
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-4 space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Company name *"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
        />
        <TextField
          label="Location *"
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
          hint="City or full address"
        />
        <TextField
          label="Registration / PAN / VAT number *"
          value={form.registrationNumber}
          onChange={(e) => update('registrationNumber', e.target.value)}
        />
        <TextField
          label="Industry"
          value={form.industry}
          onChange={(e) => update('industry', e.target.value)}
        />
        <TextField
          label="Company phone *"
          type="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
        />
        <TextField
          label="Company email *"
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
        <TextField
          label="Website"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
        />
      </div>

      <div>
        <label
          htmlFor="company-document"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Registration document {company?.hasDocument ? '' : '*'}
        </label>
        <input
          id="company-document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {company?.hasDocument ? (
            <>
              A document is on file (
              <a
                href={companyApi.documentUrl(company._id)}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                view
              </a>
              ). Choose a file only to replace it.
            </>
          ) : (
            'Company registration certificate: PDF, JPG or PNG, up to 5 MB. Only the admin sees it.'
          )}
        </p>
      </div>

      <div>
        <label
          htmlFor="company-description"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          About the company
        </label>
        <textarea
          id="company-description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">* Required</p>

      <Button type="submit" isLoading={isSaving}>
        {!company
          ? 'Submit for approval'
          : company.status === 'rejected'
            ? 'Save and resubmit'
            : 'Save changes'}
      </Button>
    </form>
  );
}
