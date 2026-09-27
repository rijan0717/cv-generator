import TextField from '../ui/TextField.jsx';
import RepeatableSection from './RepeatableSection.jsx';

/**
 * The content side of the CV editor: every section the user fills in.
 *
 * It is a controlled component — it never holds CV state itself, it only
 * reports changes upward through `onChange`. That keeps a single source of
 * truth in the editor page, which is what lets the preview stay in step with
 * the form on every keystroke.
 *
 * @param {{cv: object, onChange: (patch: object) => void,
 *          onPhotoChange: (file: File) => void}} props
 */
export default function CVContentForm({ cv, onChange, onPhotoChange }) {
  /**
   * Patches one field inside `personal`.
   * @param {string} field - The field name.
   * @param {string} value - The new value.
   */
  function updatePersonal(field, value) {
    onChange({ personal: { ...cv.personal, [field]: value } });
  }

  return (
    <div className="space-y-5">
      {/* Personal details */}
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold text-slate-900">Personal details</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextField
            label="Full name"
            value={cv.personal.fullName}
            onChange={(e) => updatePersonal('fullName', e.target.value)}
          />
          <TextField
            label="Headline"
            value={cv.personal.headline}
            onChange={(e) => updatePersonal('headline', e.target.value)}
            hint="e.g. Junior Software Developer"
          />
          <TextField
            label="Email"
            type="email"
            value={cv.personal.email}
            onChange={(e) => updatePersonal('email', e.target.value)}
          />
          <TextField
            label="Phone"
            value={cv.personal.phone}
            onChange={(e) => updatePersonal('phone', e.target.value)}
          />
          <TextField
            label="Address or city"
            value={cv.personal.address}
            onChange={(e) => updatePersonal('address', e.target.value)}
          />
          <TextField
            label="Website"
            value={cv.personal.website}
            onChange={(e) => updatePersonal('website', e.target.value)}
          />
          <TextField
            label="LinkedIn"
            value={cv.personal.linkedin}
            onChange={(e) => updatePersonal('linkedin', e.target.value)}
          />
          <TextField
            label="GitHub"
            value={cv.personal.github}
            onChange={(e) => updatePersonal('github', e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label htmlFor="cv-photo" className="block text-sm font-medium text-slate-700">
            Photo
          </label>
          <div className="mt-2 flex items-center gap-4">
            {cv.personal.photoUrl && (
              <img
                src={cv.personal.photoUrl}
                alt=""
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
              />
            )}
            <input
              id="cv-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => e.target.files?.[0] && onPhotoChange(e.target.files[0])}
              className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG or WEBP, up to 2 MB. Only some templates show a photo.
          </p>
        </div>
      </section>

      {/* Summary */}
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold text-slate-900">Professional summary</h2>
        <textarea
          value={cv.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          rows={4}
          className="mt-3 block w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="Two or three sentences describing who you are and what you are looking for."
        />
      </section>

      {/* Experience */}
      <RepeatableSection
        title="Experience"
        entries={cv.experience}
        onChange={(experience) => onChange({ experience })}
        emptyEntry={() => ({
          company: '',
          position: '',
          location: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
          achievements: [],
        })}
        addLabel="Add role"
      >
        {(entry, update) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Position"
              value={entry.position}
              onChange={(e) => update({ position: e.target.value })}
            />
            <TextField
              label="Company"
              value={entry.company}
              onChange={(e) => update({ company: e.target.value })}
            />
            <TextField
              label="Location"
              value={entry.location}
              onChange={(e) => update({ location: e.target.value })}
            />
            <div />
            <TextField
              label="Start"
              type="month"
              value={entry.startDate}
              onChange={(e) => update({ startDate: e.target.value })}
            />
            <TextField
              label="End"
              type="month"
              value={entry.endDate}
              onChange={(e) => update({ endDate: e.target.value })}
              disabled={entry.isCurrent}
              error={
                !entry.isCurrent && entry.endDate && entry.startDate > entry.endDate
                  ? 'End date is before the start date'
                  : undefined
              }
            />

            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={entry.isCurrent}
                onChange={(e) => update({ isCurrent: e.target.checked })}
              />
              I currently work here
            </label>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={entry.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Achievements</label>
              <textarea
                value={entry.achievements.join('\n')}
                onChange={(e) =>
                  update({ achievements: e.target.value.split('\n').filter((l) => l !== '') })
                }
                rows={3}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="One per line. Numbers and percentages score well."
              />
            </div>
          </div>
        )}
      </RepeatableSection>

      {/* Education */}
      <RepeatableSection
        title="Education"
        entries={cv.education}
        onChange={(education) => onChange({ education })}
        emptyEntry={() => ({
          institution: '',
          degree: '',
          fieldOfStudy: '',
          startDate: '',
          endDate: '',
          grade: '',
          description: '',
        })}
        addLabel="Add education"
      >
        {(entry, update) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Institution"
              value={entry.institution}
              onChange={(e) => update({ institution: e.target.value })}
            />
            <TextField
              label="Degree"
              value={entry.degree}
              onChange={(e) => update({ degree: e.target.value })}
            />
            <TextField
              label="Field of study"
              value={entry.fieldOfStudy}
              onChange={(e) => update({ fieldOfStudy: e.target.value })}
            />
            <TextField
              label="Grade or GPA"
              value={entry.grade}
              onChange={(e) => update({ grade: e.target.value })}
            />
            <TextField
              label="Start"
              type="month"
              value={entry.startDate}
              onChange={(e) => update({ startDate: e.target.value })}
            />
            <TextField
              label="End"
              type="month"
              value={entry.endDate}
              onChange={(e) => update({ endDate: e.target.value })}
              error={
                entry.endDate && entry.startDate > entry.endDate
                  ? 'End date is before the start date'
                  : undefined
              }
            />
          </div>
        )}
      </RepeatableSection>

      {/* Skills */}
      <RepeatableSection
        title="Skills"
        entries={cv.skills}
        onChange={(skills) => onChange({ skills })}
        emptyEntry={() => ({ name: '', level: 'Intermediate' })}
        addLabel="Add skill"
      >
        {(entry, update) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Skill"
              value={entry.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700">Level</label>
              <select
                value={entry.level}
                onChange={(e) => update({ level: e.target.value })}
                className="mt-1 block w-full rounded-lg border-0 py-2 pl-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900"
              >
                {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </RepeatableSection>

      {/* Projects */}
      <RepeatableSection
        title="Projects"
        entries={cv.projects}
        onChange={(projects) => onChange({ projects })}
        emptyEntry={() => ({ name: '', role: '', description: '', technologies: [], link: '' })}
        addLabel="Add project"
      >
        {(entry, update) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Name"
              value={entry.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <TextField
              label="Your role"
              value={entry.role}
              onChange={(e) => update({ role: e.target.value })}
            />
            <TextField
              label="Technologies"
              value={entry.technologies.join(', ')}
              onChange={(e) =>
                update({
                  technologies: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              hint="Comma separated"
            />
            <TextField
              label="Link"
              value={entry.link}
              onChange={(e) => update({ link: e.target.value })}
            />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={entry.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        )}
      </RepeatableSection>

      {/* Certifications */}
      <RepeatableSection
        title="Certifications"
        entries={cv.certifications}
        onChange={(certifications) => onChange({ certifications })}
        emptyEntry={() => ({ name: '', issuer: '', date: '', credentialLink: '' })}
        addLabel="Add certification"
      >
        {(entry, update) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Name"
              value={entry.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <TextField
              label="Issuer"
              value={entry.issuer}
              onChange={(e) => update({ issuer: e.target.value })}
            />
            <TextField
              label="Date"
              type="month"
              value={entry.date}
              onChange={(e) => update({ date: e.target.value })}
            />
            <TextField
              label="Credential link"
              value={entry.credentialLink}
              onChange={(e) => update({ credentialLink: e.target.value })}
            />
          </div>
        )}
      </RepeatableSection>

      {/* Languages */}
      <RepeatableSection
        title="Languages"
        entries={cv.languages}
        onChange={(languages) => onChange({ languages })}
        emptyEntry={() => ({ language: '', proficiency: '' })}
        addLabel="Add language"
      >
        {(entry, update) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Language"
              value={entry.language}
              onChange={(e) => update({ language: e.target.value })}
            />
            <TextField
              label="Proficiency"
              value={entry.proficiency}
              onChange={(e) => update({ proficiency: e.target.value })}
              hint="e.g. Native, Fluent, Intermediate"
            />
          </div>
        )}
      </RepeatableSection>

      {/* References */}
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold text-slate-900">References</h2>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={cv.referencesOnRequest}
            onChange={(e) => onChange({ referencesOnRequest: e.target.checked })}
          />
          Show &ldquo;Available on request&rdquo; instead of listing referees
        </label>
      </section>

      {!cv.referencesOnRequest && (
        <RepeatableSection
          title="Referees"
          entries={cv.references}
          onChange={(references) => onChange({ references })}
          emptyEntry={() => ({ name: '', position: '', company: '', email: '', phone: '' })}
          addLabel="Add referee"
        >
          {(entry, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Name"
                value={entry.name}
                onChange={(e) => update({ name: e.target.value })}
              />
              <TextField
                label="Position"
                value={entry.position}
                onChange={(e) => update({ position: e.target.value })}
              />
              <TextField
                label="Company"
                value={entry.company}
                onChange={(e) => update({ company: e.target.value })}
              />
              <TextField
                label="Email"
                type="email"
                value={entry.email}
                onChange={(e) => update({ email: e.target.value })}
              />
            </div>
          )}
        </RepeatableSection>
      )}
    </div>
  );
}
