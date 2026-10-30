import { FONT_STACKS, SECTION_LABELS } from '../../templates/templateUtils.js';
import TemplateGallery from '../templates/TemplateGallery.jsx';
import useOfferedTemplates from '../templates/useOfferedTemplates.js';
import { settingsForTemplate } from '../../templates/index.js';

/**
 * The customisation panel.
 *
 * Because every template reads the same CSS variables, one panel drives all
 * of them. Nothing here knows which template is selected, apart from the
 * gallery at the top.
 */

/** Ready-made palettes, so a user does not have to choose colours by hand. */
const THEME_PRESETS = [
  {
    key: 'slate',
    name: 'Slate',
    primaryColor: '#0f172a',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
  },
  {
    key: 'navy',
    name: 'Navy',
    primaryColor: '#1e3a8a',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
  },
  {
    key: 'teal',
    name: 'Teal',
    primaryColor: '#0f766e',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
  },
  {
    key: 'burgundy',
    name: 'Burgundy',
    primaryColor: '#881337',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
  },
  {
    key: 'forest',
    name: 'Forest',
    primaryColor: '#166534',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
  },
  {
    key: 'graphite',
    name: 'Graphite',
    primaryColor: '#111827',
    backgroundColor: '#f8fafc',
    textColor: '#111827',
  },
];

/** Section keys in their canonical order, used to rebuild a valid order. */
const ALL_SECTIONS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'references',
];

/**
 * @param {{cv: object, onChange: (patch: object) => void}} props
 */
export default function CustomisePanel({ cv, onChange }) {
  const settings = cv.settings ?? {};
  const order = settings.sectionOrder?.length ? settings.sectionOrder : ALL_SECTIONS;
  const hidden = new Set(settings.hiddenSections ?? []);

  // The admin's active templates, plus this CV's own even if it has since
  // been switched off.
  const { templates: offered } = useOfferedTemplates(cv.templateKey);

  /**
   * Applies a change to one or more settings fields.
   * @param {object} patch - The settings fields to change.
   */
  function updateSettings(patch) {
    onChange({ settings: { ...settings, ...patch } });
  }

  /**
   * Moves a section up or down in the order.
   * @param {number} index - Current position.
   * @param {number} direction - -1 for up, +1 for down.
   */
  function moveSection(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    updateSettings({ sectionOrder: next });
  }

  /**
   * Shows or hides a section.
   * @param {string} key - The section key.
   */
  function toggleSection(key) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateSettings({ hiddenSections: [...next] });
  }

  return (
    <div className="space-y-6">
      {/* Template. Choosing one applies it straight away: the live
          preview beside this panel is the large view, so a second
          "are you sure?" preview would only be in the way. */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Template</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Your content stays the same in every template. Choosing one applies its colours and fonts,
          which you can still change below.
        </p>
        <div className="mt-3">
          <TemplateGallery
            templates={offered}
            selectedKey={cv.templateKey}
            onChoose={(template) =>
              onChange({
                templateKey: template.key,
                settings: settingsForTemplate(settings, template),
              })
            }
            userCV={cv}
            density="compact"
          />
        </div>
      </section>

      {/* Theme presets */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Theme</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() =>
                updateSettings({
                  themePreset: preset.key,
                  primaryColor: preset.primaryColor,
                  backgroundColor: preset.backgroundColor,
                  textColor: preset.textColor,
                })
              }
              className={[
                'rounded-lg border p-2 text-xs transition',
                settings.themePreset === preset.key
                  ? 'border-slate-900'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className="mb-1 block h-4 w-full rounded"
                style={{ background: preset.primaryColor }}
              />
              {preset.name}
            </button>
          ))}
        </div>
      </section>

      {/* Colours */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Colours</h3>
        <div className="mt-3 space-y-2">
          <ColourInput
            label="Primary"
            value={settings.primaryColor}
            onChange={(primaryColor) => updateSettings({ primaryColor, themePreset: 'custom' })}
          />
          <ColourInput
            label="Background"
            value={settings.backgroundColor}
            onChange={(backgroundColor) =>
              updateSettings({ backgroundColor, themePreset: 'custom' })
            }
          />
          <ColourInput
            label="Text"
            value={settings.textColor}
            onChange={(textColor) => updateSettings({ textColor, themePreset: 'custom' })}
          />
        </div>
      </section>

      {/* Typography */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Typography</h3>

        <label
          className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400"
          htmlFor="fontFamily"
        >
          Body font
        </label>
        <select
          id="fontFamily"
          value={settings.fontFamily ?? 'Inter'}
          onChange={(event) => updateSettings({ fontFamily: event.target.value })}
          className="mt-1 w-full rounded-lg border-0 py-2 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        >
          {Object.keys(FONT_STACKS).map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>

        {/* The name and section headings. "Same as body" is stored as an
            empty string, which is what every CV made before this setting
            existed already has. */}
        <label
          className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400"
          htmlFor="headingFont"
        >
          Heading font
        </label>
        <select
          id="headingFont"
          value={settings.headingFont ?? ''}
          onChange={(event) => updateSettings({ headingFont: event.target.value })}
          className="mt-1 w-full rounded-lg border-0 py-2 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        >
          <option value="">Same as body</option>
          {Object.keys(FONT_STACKS).map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>

        <fieldset className="mt-3">
          <legend className="text-xs font-medium text-slate-600 dark:text-slate-400">Size</legend>
          <div className="mt-1 flex gap-2">
            {['small', 'medium', 'large'].map((size) => (
              <SegmentButton
                key={size}
                isActive={(settings.fontSize ?? 'medium') === size}
                onClick={() => updateSettings({ fontSize: size })}
              >
                {size}
              </SegmentButton>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-3">
          <legend className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Spacing
          </legend>
          <div className="mt-1 flex gap-2">
            {['compact', 'normal'].map((spacing) => (
              <SegmentButton
                key={spacing}
                isActive={(settings.spacing ?? 'normal') === spacing}
                onClick={() => updateSettings({ spacing })}
              >
                {spacing}
              </SegmentButton>
            ))}
          </div>
        </fieldset>
      </section>

      {/* Sections */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sections</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Reorder or hide sections. Empty sections are left out automatically.
        </p>

        <ul className="mt-3 space-y-1">
          {order.map((key, index) => {
            const isHidden = hidden.has(key);
            const label = SECTION_LABELS[key] ?? key;

            return (
              <li
                key={key}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5"
              >
                <input
                  type="checkbox"
                  id={`section-${key}`}
                  checked={!isHidden}
                  onChange={() => toggleSection(key)}
                />
                <label
                  htmlFor={`section-${key}`}
                  className={[
                    'flex-1 text-sm',
                    isHidden
                      ? 'text-slate-400 line-through dark:text-slate-500'
                      : 'text-slate-700 dark:text-slate-300',
                  ].join(' ')}
                >
                  {label}
                </label>

                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <span className="sr-only">Move {label} up</span>
                  <span aria-hidden="true">&uarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === order.length - 1}
                  className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <span className="sr-only">Move {label} down</span>
                  <span aria-hidden="true">&darr;</span>
                </button>

                {/*
                The same hiding the checkbox does, as a single obvious
                click. It removes the section from the CV but never the
                content behind it: the row stays in the list, struck
                through, and this button puts it straight back. Nothing
                a user does in this panel can lose what they typed.
              */}
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <span className="sr-only">
                    {isHidden ? `Add ${label} back to the CV` : `Remove ${label} from the CV`}
                  </span>
                  <span aria-hidden="true">{isHidden ? '↺' : '✕'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/**
 * A colour swatch plus its hex value.
 * @param {{label: string, value: string, onChange: (value: string) => void}} props
 */
function ColourInput({ label, value, onChange }) {
  const id = `colour-${label.toLowerCase()}`;

  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="color"
        value={value ?? '#000000'}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-10 cursor-pointer rounded border border-slate-300 dark:border-slate-600"
      />
      <label htmlFor={id} className="flex-1 text-sm text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">
        {value}
      </span>
    </div>
  );
}

/**
 * One button in a small segmented control.
 * @param {{isActive: boolean, onClick: () => void, children: React.ReactNode}} props
 */
function SegmentButton({ isActive, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize transition',
        isActive
          ? 'border-slate-900 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
