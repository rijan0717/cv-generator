import { useState } from 'react';
import * as companyApi from '../../api/companies.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';

/**
 * Create or edit the company profile.
 *
 * The same form does both, because the fields are identical and the only
 * difference is which endpoint it calls. Shared by the set-up screen and
 * the profile tab.
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
  });
  const [status, setStatus] = useState({ error: '', success: '' });
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
   * Saves the profile, creating the company the first time.
   * @param {React.FormEvent} event
   */
  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ error: '', success: '' });

    if (form.name.trim().length < 2) {
      setStatus({ error: 'Company name must be at least 2 characters', success: '' });
      return;
    }

    setIsSaving(true);
    try {
      const saved = company
        ? await companyApi.updateMyCompany(form)
        : await companyApi.createCompany(form);

      onSaved(saved);
      setStatus({ error: '', success: 'Saved' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
    >
      <Alert variant="error">{status.error}</Alert>
      <Alert variant="success">{status.success}</Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Company name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />
        <TextField
          label="Industry"
          value={form.industry}
          onChange={(e) => update('industry', e.target.value)}
        />
        <TextField
          label="Location"
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
        />
        <TextField
          label="Website"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
        />
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

      <Button type="submit" isLoading={isSaving}>
        {company ? 'Save changes' : 'Create company'}
      </Button>
    </form>
  );
}
